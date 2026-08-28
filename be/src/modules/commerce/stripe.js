import Stripe from 'stripe';
import { env } from '../../config/env.js';

/* ---------------------------------------------------------------------------
   Stripe (C1).

   Stripe CHECKOUT, not a card form of our own. The card number never touches
   this server, which takes the whole application out of PCI scope that a hosted
   field set would drag it into — and Stripe's page already handles 3-D Secure,
   Apple Pay, Google Pay and every card-declined edge case.

   Same shape as the other integrations here: `configured()` gates everything,
   and with no keys the commerce endpoints report themselves unavailable rather
   than half-working.

   ---- Prices are sent tax-INCLUSIVE ----------------------------------------

   `unit_amount` is the full amount the customer pays and `tax_behavior` is
   'inclusive', so Stripe shows the same number the course page did. We compute
   the GST component ourselves (src/utils/gst.js) because the rate is a flat
   Australian 10% on these products; Stripe Tax would be the answer if and when
   there are exports or B2B reverse charge to work out.
   ------------------------------------------------------------------------ */

let client = null;

export const configured = () => Boolean(env.stripe.secretKey);

export function stripe() {
  if (!configured()) throw new Error('Stripe is not configured.');
  // Lazily constructed so importing this module is free when Stripe is off.
  if (!client) client = new Stripe(env.stripe.secretKey);
  return client;
}

export function commerceStatus() {
  if (!env.stripe.enabled) {
    return { ready: false, reason: 'disabled', message: 'Payments are switched off.' };
  }
  if (!configured()) {
    return {
      ready: false,
      reason: 'no-credentials',
      message: 'Stripe has no API key, so nothing can be bought yet.',
    };
  }
  return {
    ready: true,
    // Told plainly so a test key in production is visible on a status screen
    // rather than discovered by a customer whose card was never charged.
    mode: env.stripe.secretKey.startsWith('sk_live') ? 'live' : 'test',
    webhookConfigured: Boolean(env.stripe.webhookSecret),
  };
}

/* Creates the hosted payment page for an order.

   `client_reference_id` and `metadata.orderId` both carry our order id: the
   first is what shows in the Stripe dashboard next to the payment, the second
   is what the webhook reads. Sending both costs nothing and means a human
   chasing a payment and a machine reconciling one are looking at the same
   thing. */
export async function createCheckoutSession({ order, successUrl, cancelUrl, customerEmail }) {
  return stripe().checkout.sessions.create({
    mode: 'payment',
    /* `payment_method_types` is deliberately NOT sent.

       Accounts with Managed Payments enabled — the default on newer Stripe
       accounts — reject it outright: "Unsupported parameter:
       payment_method_types … Managed Payments handles this parameter for you."

       Leaving it out is also the better behaviour. Stripe then shows whichever
       methods are enabled in the dashboard for the buyer's country and device,
       so Apple Pay and Google Pay appear without a code change. Pinning it to
       ['card'] would have quietly excluded them. */
    client_reference_id: String(order._id),
    metadata: { orderId: String(order._id), reference: order.reference },
    customer_email: customerEmail || undefined,
    line_items: order.lines.map((line) => ({
      quantity: 1,
      price_data: {
        currency: order.currency.toLowerCase(),
        unit_amount: line.amount,
        // The customer pays exactly this. See the header note.
        tax_behavior: 'inclusive',
        product_data: {
          name: line.title,
          /* REQUIRED by Managed Payments, which is on by default for newer
             Stripe accounts. Without it: "Invalid line_items[0]: the product
             tax code is missing."

             Not every code is accepted — Stripe keeps an eligibility list, and
             several obvious candidates are refused. Verified against the live
             API: `txcd_20060044` (Training), `txcd_20060052` (Educational
             Services) and `txcd_20060045` (Training Services - Live Virtual)
             are all INELIGIBLE. These are eligible:

               txcd_20060058  Training Services - Self-study Web-based  ← default
               txcd_20060158  On demand Online Courses - streamed AV
               txcd_20060258  On demand Online Courses - streamed + downloadable
               txcd_20060358  On demand Online Courses - written material

             The default fits self-paced courses of mixed video and text, which
             is what this catalogue sells. It is configurable because the right
             answer is a question for an accountant, not a deploy. */
          tax_code: env.stripe.taxCode,
          metadata: { courseId: String(line.course) },
        },
      },
    })),
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Australian GST needs the supplier's details on the receipt; Stripe's own
    // receipt carries the account's business information, so this is the
    // cheapest correct receipt until our invoice screen is the record.
    invoice_creation: { enabled: true },
  });
}

/* Verifies a webhook came from Stripe.

   The signature is checked against the RAW request body — any parsing, even
   JSON.parse and re-stringify, changes the bytes and the check fails. That is
   why app.js mounts express.raw() on this one path before the JSON parser.

   Without this, the webhook endpoint is an unauthenticated "mark this order
   paid" API, which is the single worst thing you could leave open in a payments
   integration. */
export function verifyWebhook(rawBody, signature) {
  if (!env.stripe.webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set, so webhooks cannot be trusted.');
  }
  return stripe().webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
}
