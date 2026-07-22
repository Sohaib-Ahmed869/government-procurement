import { randomBytes } from 'node:crypto';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { SUBSCRIBER_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Subscriber } from '../../models/Subscriber.js';
import { sendMail } from '../../utils/mailer.js';
import { env } from '../../config/env.js';

// Escape user input before using it inside a RegExp (admin search).
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Turn a value into a CSV-safe cell (quote + escape embedded quotes).
function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// A single generic success body so we never reveal whether an address is
// already subscribed (prevents email enumeration).
const CONFIRM_PROMPT = { message: 'Check your email to confirm your subscription.' };

// POST / — PUBLIC. Double opt-in: create/update a pending subscriber and email
// a confirmation link. Existing confirmed subscribers get an idempotent success
// with no email and no hint that they already exist.
export const submit = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) throw ApiError.badRequest('Email is required');
  const name = req.body.name ? String(req.body.name).trim() : '';
  const audience = ['win', 'award'].includes(req.body.audience) ? req.body.audience : '';

  const existing = await Subscriber.findOne({ email }).select('+confirmToken +unsubscribeToken');
  if (existing && existing.status === SUBSCRIBER_STATUS.CONFIRMED) {
    // Already confirmed — respond identically to a fresh signup.
    return ok(res, CONFIRM_PROMPT);
  }

  const doc = existing || new Subscriber({ email });
  if (name) doc.name = name;
  if (audience) doc.audience = audience;
  doc.status = SUBSCRIBER_STATUS.PENDING;
  doc.confirmToken = randomBytes(32).toString('hex');
  if (!doc.unsubscribeToken) doc.unsubscribeToken = randomBytes(32).toString('hex');
  await doc.save();

  const origin = env.clientOrigins[0];
  const confirmUrl = `${origin}/subscribe/confirm?token=${doc.confirmToken}`;
  await sendMail({
    to: email,
    subject: 'Confirm your subscription',
    html: `<p>Thanks for subscribing. Please confirm your subscription by clicking the link below:</p>
<p><a href="${confirmUrl}">Confirm my subscription</a></p>
<p>If you did not request this, you can ignore this email.</p>`,
    text: `Confirm your subscription: ${confirmUrl}`,
  });

  return ok(res, CONFIRM_PROMPT);
});

// GET /confirm?token= — PUBLIC. Flip a pending subscriber to confirmed and
// burn the confirmation token so the link can't be reused.
export const confirm = asyncHandler(async (req, res) => {
  const token = req.query.token;
  if (!token) throw ApiError.badRequest('Invalid or expired confirmation link');

  const sub = await Subscriber.findOne({ confirmToken: token }).select('+confirmToken');
  if (!sub) throw ApiError.badRequest('Invalid or expired confirmation link');

  sub.status = SUBSCRIBER_STATUS.CONFIRMED;
  sub.confirmedAt = new Date();
  sub.confirmToken = undefined;
  await sub.save();

  return ok(res, { message: 'Your subscription is confirmed.' });
});

// POST /unsubscribe — PUBLIC. Accepts ?token=, body { token } or body { email }.
// Always returns success (idempotent, no enumeration).
export const unsubscribe = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body?.token;
  const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : '';

  let sub = null;
  if (token) {
    sub = await Subscriber.findOne({ unsubscribeToken: token }).select('+unsubscribeToken');
  } else if (email) {
    sub = await Subscriber.findOne({ email });
  }

  if (sub && sub.status !== SUBSCRIBER_STATUS.UNSUBSCRIBED) {
    sub.status = SUBSCRIBER_STATUS.UNSUBSCRIBED;
    sub.unsubscribedAt = new Date();
    await sub.save();
  }

  return ok(res, { message: 'You have been unsubscribed.' });
});

// GET / — admin. Paginated list with ?status and ?q (email/name regex).
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ email: rx }, { name: rx }];
  }
  const { items, meta } = await paginate(Subscriber, filter, {
    page,
    limit,
    skip,
    sort: req.query.sort || '-createdAt',
  });
  return ok(res, items, meta);
});

// GET /export — admin. Streams a CSV of subscribers (optionally filtered by
// ?status). Uses res.send with CSV headers instead of the JSON envelope.
export const exportCsv = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const subs = await Subscriber.find(filter).sort('-createdAt');
  const header = ['email', 'name', 'status', 'audience', 'confirmedAt', 'createdAt'];
  const lines = subs.map((s) =>
    [
      s.email,
      s.name,
      s.status,
      s.audience,
      s.confirmedAt ? s.confirmedAt.toISOString() : '',
      s.createdAt ? s.createdAt.toISOString() : '',
    ]
      .map(csvCell)
      .join(','),
  );
  const csv = [header.join(','), ...lines].join('\r\n');

  recordAudit({
    req,
    action: 'subscriber.export',
    entity: 'Subscriber',
    summary: `Exported ${subs.length} subscriber(s)`,
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
  return res.send(csv);
});

// DELETE /:id — admin. Remove a subscriber record.
export const remove = asyncHandler(async (req, res) => {
  const sub = await Subscriber.findById(req.params.id);
  if (!sub) throw ApiError.notFound('Subscriber not found');

  await sub.deleteOne();
  recordAudit({
    req,
    action: 'subscriber.delete',
    entity: 'Subscriber',
    entityId: sub._id,
    summary: `Deleted subscriber ${sub.email}`,
  });
  return noContent(res);
});
