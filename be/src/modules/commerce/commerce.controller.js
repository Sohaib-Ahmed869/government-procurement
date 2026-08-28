import { randomUUID } from 'node:crypto';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/apiResponse.js';
import { env } from '../../config/env.js';
import { GST_RATE, splitInclusive, toCents } from '../../utils/gst.js';
import { CONTENT_STATUS, COURSE_STATE } from '../../constants/statuses.js';
import { Course } from '../../models/Course.js';
import { Bundle } from '../../models/Bundle.js';
import { Enrollment } from '../../models/Enrollment.js';
import { Order, ORDER_STATUS } from '../../models/Order.js';
import { recordAudit } from '../../models/AuditLog.js';
import { commerceStatus, configured, createCheckoutSession, verifyWebhook } from './stripe.js';

/* ---------------------------------------------------------------------------
   Buying a course (C1/C2).

   ---- The rule this file exists to enforce ----------------------------------

   THE SERVER OWNS THE PRICE. Nothing sent by the client is used as money. The
   request names courses; every amount is read from the Course record here.

   The basket already works this way on the front end — it stores a slug and a
   kind, never a price — and this is the other half of that promise. Without it,
   a $690 course is bought for 5c by anyone who can open developer tools.

   ---- And enrolment follows PAYMENT, not the request ------------------------

   An enrolment is created by the webhook, from Stripe's confirmation, never
   from the browser coming back to the success page. A learner who closes the
   tab at the wrong moment is still enrolled; someone who visits the success URL
   directly is not.
   ------------------------------------------------------------------------ */

// GET /lms/commerce/status
export const status = asyncHandler(async (_req, res) => ok(res, commerceStatus()));

/* Human-readable and hard to guess. Sequential numbering would leak how many
   sales there have been, and needs a counter that is a race condition waiting
   to happen under any concurrency. */
function makeReference() {
  return `GP-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

/* Turns a list of course ids into priced lines, reading every amount from the
   database. Returns the lines and the totals, all in cents, all tax-inclusive. */
async function priceOrder({ courseIds = [], bundleIds = [] }) {
  const unique = [...new Set(courseIds.map(String))];
  const uniqueBundles = [...new Set(bundleIds.map(String))];
  if (!unique.length && !uniqueBundles.length) throw ApiError.badRequest('Your basket is empty');
  if (unique.length + uniqueBundles.length > 20) {
    throw ApiError.badRequest('That is more than one order can hold');
  }

  // `availability` is in this projection because the check below reads it. A
  // field left out of a select is `undefined`, not its stored value — and an
  // `undefined !== OPEN` comparison refuses every course, including open ones.
  const courses = unique.length
    ? await Course.find({ _id: { $in: unique } }).select(
      'title slug price currency status availability',
    )
    : [];
  if (courses.length !== unique.length) {
    throw ApiError.badRequest('One of those courses is no longer available');
  }

  const lines = courses.map((course) => {
    // A draft or retired course must not be purchasable, whatever a stale
    // basket in somebody's browser still remembers about it.
    if (course.status !== CONTENT_STATUS.PUBLISHED) {
      throw ApiError.badRequest(`"${course.title}" is not available to buy`);
    }
    /* Published but not OPEN — coming soon, or closed to new enrolments. The
       sales page is deliberately still readable in that state, so the basket
       has to be the thing that refuses; otherwise a course an instructor has
       marked "coming soon" can be paid for today. */
    if (course.availability !== COURSE_STATE.OPEN) {
      throw ApiError.badRequest(
        course.availability === COURSE_STATE.COMING_SOON
          ? `"${course.title}" is not on sale yet`
          : `"${course.title}" is closed to new enrolments`,
      );
    }
    const amount = toCents(course.price);
    if (amount <= 0) {
      // Free courses are enrolled in, not bought. Sending a $0 line to Stripe
      // fails there anyway, with a much worse message.
      throw ApiError.badRequest(`"${course.title}" is free — enrol in it directly`);
    }
    return {
      course: course._id,
      title: course.title,
      slug: course.slug,
      kind: 'course',
      amount,
    };
  });

  /* Bundles. A bundle is priced as ONE line at its own price — not the sum of
     its courses, which is the whole point of selling one. `grants` records
     which courses it hands over, copied now so that re-editing the bundle later
     cannot change what this customer bought. */
  const bundles = uniqueBundles.length
    ? await Bundle.find({ _id: { $in: uniqueBundles } }).select('title slug price currency status courses')
    : [];
  if (bundles.length !== uniqueBundles.length) {
    throw ApiError.badRequest('One of those bundles is no longer available');
  }

  for (const bundle of bundles) {
    if (bundle.status !== CONTENT_STATUS.PUBLISHED) {
      throw ApiError.badRequest(`"${bundle.title}" is not available to buy`);
    }
    const amount = toCents(bundle.price);
    if (amount <= 0) throw ApiError.badRequest(`"${bundle.title}" has no price set`);
    if (!bundle.courses?.length) {
      throw ApiError.badRequest(`"${bundle.title}" has no courses in it yet`);
    }
    lines.push({
      bundle: bundle._id,
      grants: bundle.courses,
      title: bundle.title,
      slug: bundle.slug,
      kind: 'bundle',
      amount,
    });
  }

  const totalCents = lines.reduce((sum, l) => sum + l.amount, 0);
  const { total, gst, net } = splitInclusive(totalCents);
  const currency = courses[0]?.currency || bundles[0]?.currency || 'AUD';
  return { lines, total, gst, net, currency };
}

/* POST /lms/orders
   Body: { courseIds: [id, …] }
   Returns the order plus the Stripe URL to send the browser to. */
export const createOrder = asyncHandler(async (req, res) => {
  if (!configured() || !env.stripe.enabled) {
    throw ApiError.unavailable('Payments are not available yet');
  }

  const courseIds = Array.isArray(req.body?.courseIds) ? req.body.courseIds : [];
  const bundleIds = Array.isArray(req.body?.bundleIds) ? req.body.bundleIds : [];
  const { lines, total, gst, net, currency } = await priceOrder({ courseIds, bundleIds });

  /* Buying something you already have is a refund request waiting to happen.
     Checked against everything the order would GRANT, so a bundle whose courses
     the learner already owns is caught too — otherwise they would pay for a
     bundle and receive nothing new. */
  const granted = lines.flatMap((l) => (l.kind === 'bundle' ? l.grants : [l.course])).filter(Boolean);
  const already = await Enrollment.find({
    user: req.user._id,
    course: { $in: granted },
    revokedAt: null,
  }).select('course');
  if (already.length) {
    throw ApiError.badRequest('You are already enrolled in one of those courses');
  }

  const order = await Order.create({
    user: req.user._id,
    reference: makeReference(),
    lines,
    net,
    gst,
    total,
    gstRate: GST_RATE,
    currency,
    status: ORDER_STATUS.PENDING,
    buyerEmail: req.user.email,
    buyerName: req.user.name,
  });

  /* Where to send the buyer back to.

     The BROWSER says where it came from, because this app is served on more
     than one origin — a staging domain, a Vercel preview, production — and
     they do not share localStorage. Returning everyone to whichever origin
     happens to be first in CLIENT_ORIGINS drops a buyer who paid on the
     staging domain onto a different host, where they have no session and land
     on the sign-in page holding a receipt.

     Validated against the allowlist rather than trusted: an unchecked origin
     from a request body is an open redirect, and this one would carry a paying
     customer to it. Anything not on the list falls back to the first entry. */
  const claimed = String(req.body?.origin ?? '').replace(/\/$/, '');
  const site = env.clientOrigins.includes(claimed)
    ? claimed
    : (env.clientOrigins[0] ?? 'http://localhost:5173');
  let session;
  try {
    session = await createCheckoutSession({
      order,
      customerEmail: req.user.email,
      successUrl: `${site}/learn/checkout/confirmation/${order._id}`,
      cancelUrl: `${site}/learn/checkout?cancelled=${order._id}`,
    });
  } catch (err) {
    // The order exists but can never be paid, so it should not sit in the
    // learner's history looking like an unfinished purchase.
    order.status = ORDER_STATUS.CANCELLED;
    await order.save();
    throw ApiError.badRequest(`Could not start the payment: ${err?.message ?? err}`);
  }

  order.stripe.sessionId = session.id;
  await order.save();

  recordAudit({
    req,
    action: 'commerce.order.create',
    entity: 'Order',
    entityId: order._id,
    summary: `Order ${order.reference} started (${(total / 100).toFixed(2)} ${currency})`,
  });

  return created(res, { order: order.toJSONSafe(), checkoutUrl: session.url });
});

// GET /lms/orders — this learner's own, newest first.
export const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  return ok(res, orders.map((o) => o.toJSONSafe()));
});

// GET /lms/orders/:id — one order, for the invoice screen.
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  // Ownership, not just authentication: an invoice carries a name and an email.
  if (String(order.user) !== String(req.user._id)) {
    throw ApiError.forbidden('That is not your order');
  }
  return ok(res, order.toJSONSafe());
});

/* Marks an order paid and grants what it bought.

   Written to be safe to run TWICE. Stripe retries a webhook it did not get a
   2xx for, and `checkout.session.completed` can arrive more than once; an
   idempotent handler is the difference between one enrolment and two, and
   between one receipt and a duplicate. */
async function fulfil(order, { paymentIntent, brand, last4, email } = {}) {
  if (order.status === ORDER_STATUS.PAID) return order;

  order.status = ORDER_STATUS.PAID;
  order.paidAt = new Date();
  if (paymentIntent) order.stripe.paymentIntent = paymentIntent;
  if (brand) order.stripe.brand = brand;
  if (last4) order.stripe.last4 = last4;
  if (email) order.buyerEmail = email;
  await order.save();

  /* One enrolment per course GRANTED, which for a bundle is several. `updateOne`
     with upsert rather than create, so a replayed webhook cannot produce a
     second enrolment for the same course — and so a course appearing in both a
     bundle and a separate line resolves to one enrolment, not two. */
  const grantedCourses = [
    ...new Set(
      order.lines
        .flatMap((l) => (l.kind === 'bundle' ? l.grants ?? [] : [l.course]))
        .filter(Boolean)
        .map(String),
    ),
  ];
  await Promise.all(
    grantedCourses.map((courseId) =>
      Enrollment.updateOne(
        { user: order.user, course: courseId },
        {
          $setOnInsert: { user: order.user, course: courseId, enrolledAt: new Date() },
          $set: { revokedAt: null },
        },
        { upsert: true },
      ),
    ),
  );

  return order;
}

/* POST /lms/commerce/webhook

   PUBLIC, and safe only because of the signature check. `req.body` here is a
   raw Buffer — app.js mounts express.raw() on this path ahead of the JSON
   parser, because parsing changes the bytes the signature was computed over. */
export const webhook = asyncHandler(async (req, res) => {
  let event;
  try {
    event = verifyWebhook(req.body, req.headers['stripe-signature']);
  } catch (err) {
    // 400 rather than 401: Stripe reads any non-2xx as "retry", and the message
    // goes into its dashboard where whoever set the endpoint up will see it.
    return res.status(400).send(`Webhook signature verification failed: ${err?.message ?? err}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const order = await Order.findById(session.metadata?.orderId ?? session.client_reference_id);

    if (order) {
      // Trust Stripe's number over our own record of it. If they disagree, the
      // amount that actually moved is the one the customer was charged.
      if (typeof session.amount_total === 'number' && session.amount_total !== order.total) {
        order.total = session.amount_total;
        const split = splitInclusive(session.amount_total, order.gstRate);
        order.gst = split.gst;
        order.net = split.net;
      }
      await fulfil(order, {
        paymentIntent: session.payment_intent,
        email: session.customer_details?.email,
      });
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const order = await Order.findById(session.metadata?.orderId ?? '');
    if (order && order.status === ORDER_STATUS.PENDING) {
      order.status = ORDER_STATUS.CANCELLED;
      await order.save();
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const order = await Order.findOne({ 'stripe.paymentIntent': charge.payment_intent });
    if (order) {
      order.status = ORDER_STATUS.REFUNDED;
      order.refundedAt = new Date();
      await order.save();
      /* A refund revokes access. `revokedAt` is what every gate in the LMS
         already checks, so this needs no new concept — the learner's next click
         on a lesson, a live session or the coach is refused. */
      await Enrollment.updateMany(
        {
          user: order.user,
          course: {
            $in: order.lines
              .flatMap((l) => (l.kind === 'bundle' ? l.grants ?? [] : [l.course]))
              .filter(Boolean),
          },
        },
        { $set: { revokedAt: new Date() } },
      );
    }
  }

  // Anything else is acknowledged and ignored. Returning non-2xx for event
  // types we do not handle would have Stripe retrying them for days.
  return res.json({ received: true });
});
