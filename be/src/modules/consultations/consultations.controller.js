import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Consultation } from '../../models/Consultation.js';
import { Setting } from '../../models/Setting.js';
import { sendMail } from '../../utils/mailer.js';

const SERVICES = ['advisory', 'training', 'tender-support', 'other'];

// Escape user input before using it inside a RegExp (admin search).
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST / — PUBLIC. Book a consultation request from the website.
export const submit = asyncHandler(async (req, res) => {
  const { name, email, organisation, role, service, reason, preferredDate, preferredTime, message } =
    req.body;

  if (!name || !email) throw ApiError.badRequest('Name and email are required');
  if (service && !SERVICES.includes(service)) throw ApiError.badRequest('Invalid service');

  const doc = await Consultation.create({
    name,
    email,
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
      const detail = [
        doc.organisation ? `<p><strong>Organisation:</strong> ${doc.organisation}</p>` : '',
        doc.role ? `<p><strong>Role:</strong> ${doc.role}</p>` : '',
        doc.service ? `<p><strong>Service:</strong> ${doc.service}</p>` : '',
        doc.reason ? `<p><strong>Reason:</strong> ${doc.reason}</p>` : '',
        doc.preferredDate
          ? `<p><strong>Preferred date:</strong> ${new Date(doc.preferredDate).toDateString()}</p>`
          : '',
        doc.preferredTime ? `<p><strong>Preferred time:</strong> ${doc.preferredTime}</p>` : '',
      ]
        .filter(Boolean)
        .join('\n');

      await sendMail({
        to,
        subject: `New consultation request from ${doc.name}`,
        html: `<p><strong>From:</strong> ${doc.name} &lt;${doc.email}&gt;</p>
${detail}
${doc.message ? `<p><strong>Message:</strong></p>\n<p>${doc.message}</p>` : ''}`,
        text: `From: ${doc.name} <${doc.email}>\n\n${doc.message || '(no message)'}`,
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
