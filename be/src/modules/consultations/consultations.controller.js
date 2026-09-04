import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Consultation } from '../../models/Consultation.js';
import { Setting } from '../../models/Setting.js';
import { sendMail } from '../../utils/mailer.js';
import { renderEmail } from '../../utils/emailTemplate.js';

const SERVICES = ['advisory', 'training', 'tender-support', 'other'];

// Escape user input before using it inside a RegExp (admin search).
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST / — PUBLIC. Book a consultation request from the website.
export const submit = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    organisation,
    role,
    service,
    reason,
    preferredDate,
    preferredTime,
    message,
  } = req.body;

  if (!name || !email) throw ApiError.badRequest('Name and email are required');
  if (service && !SERVICES.includes(service)) throw ApiError.badRequest('Invalid service');

  const doc = await Consultation.create({
    name,
    email,
    phone: phone || '',
    organisation: organisation || '',
    role: role || '',
    service: service || 'other',
    reason: reason || '',
    preferredDate: preferredDate || undefined,
    preferredTime: ['morning', 'afternoon'].includes(preferredTime) ? preferredTime : '',
    message: message || '',
  });

  // Notify the site inbox if one is configured — never fail the booking if the
  // settings lookup or mail delivery throws. This is the alert the contact form
  // used to send; with that page retired, a consultation booking is the site's
  // main enquiry, so the notification moved here with it.
  try {
    const settings = await Setting.getSingleton();
    const to = settings?.contact?.email;
    if (to) {
      /* The enquiry as a set of labelled facts. Same template as everything
         else — this one goes to staff rather than a customer, but an inbox
         alert that looks like the rest of the system is easier to trust and
         easier to scan. `replyTo` is the enquirer, so hitting reply in the
         inbox answers them rather than the no-reply mailbox. */
      const facts = [
        ['Contact number', doc.phone],
        ['Organisation', doc.organisation],
        ['Role', doc.role],
        ['Service', doc.service],
        ['Reason', doc.reason],
        ['Preferred date', doc.preferredDate ? new Date(doc.preferredDate).toDateString() : ''],
        ['Preferred time', doc.preferredTime],
      ]
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`);

      await sendMail({
        to,
        replyTo: `${doc.name} <${doc.email}>`,
        subject: `New consultation request from ${doc.name}`,
        ...renderEmail({
          heading: 'New consultation request',
          intro: `From ${doc.name} <${doc.email}>`,
          paragraphs: doc.message ? [doc.message] : ['(no message was left)'],
          bullets: facts,
          preheader: `${doc.name}${doc.organisation ? ` — ${doc.organisation}` : ''}`,
        }),
      });
    }
  } catch {
    /* notification is best-effort */
  }

  return created(res, {
    message: 'Thanks — we will be in touch shortly to arrange your consultation.',
  });
});

// GET / — admin. Paginated list with ?status, ?service and ?q (name/email/org).
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.service) filter.service = req.query.service;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { organisation: rx }];
  }
  const { items, meta } = await paginate(Consultation, filter, {
    page,
    limit,
    skip,
    sort: req.query.sort || '-createdAt',
  });
  return ok(res, items, meta);
});

// GET /:id — admin.
export const getById = asyncHandler(async (req, res) => {
  const doc = await Consultation.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Consultation not found');
  return ok(res, doc);
});

// PATCH /:id — admin. Update status / assignedTo / notes.
export const update = asyncHandler(async (req, res) => {
  const doc = await Consultation.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Consultation not found');

  const { status, assignedTo, notes } = req.body;
  if (status !== undefined) doc.status = status;
  if (assignedTo !== undefined) doc.assignedTo = assignedTo || undefined;
  if (notes !== undefined) doc.notes = notes;
  await doc.save();

  recordAudit({
    req,
    action: 'consultation.update',
    entity: 'Consultation',
    entityId: doc._id,
    summary: `Updated consultation from ${doc.email} to '${doc.status}'`,
  });
  return ok(res, doc);
});

// DELETE /:id — admin.
export const remove = asyncHandler(async (req, res) => {
  const doc = await Consultation.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Consultation not found');

  await doc.deleteOne();
  recordAudit({
    req,
    action: 'consultation.delete',
    entity: 'Consultation',
    entityId: doc._id,
    summary: `Deleted consultation from ${doc.email}`,
  });
  return noContent(res);
});
