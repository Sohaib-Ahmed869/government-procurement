import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { recordAudit } from '../../models/AuditLog.js';
import { ContactMessage } from '../../models/ContactMessage.js';
import { Setting } from '../../models/Setting.js';
import { sendMail } from '../../utils/mailer.js';

// Escape user input before using it inside a RegExp (admin search).
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST / — PUBLIC. Store a contact submission with basic anti-spam context and
// (best-effort) notify the configured site contact inbox.
export const submit = asyncHandler(async (req, res) => {
  const { name, email, message, organisation, subject, audience } = req.body;
  if (!name || !email || !message) {
    throw ApiError.badRequest('Name, email and message are required');
  }

  const doc = await ContactMessage.create({
    name,
    email,
    message,
    organisation: organisation || '',
    subject: subject || '',
    audience: ['win', 'award'].includes(audience) ? audience : '',
    meta: { ip: req.ip, userAgent: req.headers['user-agent'] || '' },
  });

  // Notify the site inbox if one is configured — never fail the submission if
  // settings lookup or mail delivery throws.
  try {
    const settings = await Setting.getSingleton();
    const to = settings?.contact?.email;
    if (to) {
      await sendMail({
        to,
        subject: `New contact message${doc.subject ? `: ${doc.subject}` : ''}`,
        html: `<p><strong>From:</strong> ${doc.name} &lt;${doc.email}&gt;</p>
${doc.organisation ? `<p><strong>Organisation:</strong> ${doc.organisation}</p>` : ''}
<p><strong>Message:</strong></p>
<p>${doc.message}</p>`,
        text: `From: ${doc.name} <${doc.email}>\n\n${doc.message}`,
      });
    }
  } catch {
    /* notification is best-effort */
  }

  return created(res, { message: 'Thanks for getting in touch. We will respond shortly.' });
});

// GET / — admin. Paginated list with ?status and ?q (name/email/subject regex).
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { subject: rx }];
  }
  const { items, meta } = await paginate(ContactMessage, filter, {
    page,
    limit,
    skip,
    sort: req.query.sort || '-createdAt',
  });
  return ok(res, items, meta);
});

// GET /:id — admin. Reading a 'new' message marks it 'read'.
export const getById = asyncHandler(async (req, res) => {
  const msg = await ContactMessage.findById(req.params.id);
  if (!msg) throw ApiError.notFound('Contact message not found');

  if (msg.status === 'new') {
    msg.status = 'read';
    await msg.save();
    recordAudit({
      req,
      action: 'contact.read',
      entity: 'ContactMessage',
      entityId: msg._id,
      summary: `Read contact message from ${msg.email}`,
    });
  }
  return ok(res, msg);
});

// PATCH /:id — admin. Update status; moving to 'handled' stamps handler + time.
export const update = asyncHandler(async (req, res) => {
  const msg = await ContactMessage.findById(req.params.id);
  if (!msg) throw ApiError.notFound('Contact message not found');

  if (req.body.status !== undefined) msg.status = req.body.status;
  if (msg.status === 'handled') {
    msg.handledBy = req.user._id;
    msg.handledAt = new Date();
  }
  await msg.save();

  recordAudit({
    req,
    action: 'contact.update',
    entity: 'ContactMessage',
    entityId: msg._id,
    summary: `Updated contact message from ${msg.email} to '${msg.status}'`,
  });
  return ok(res, msg);
});

// DELETE /:id — admin.
export const remove = asyncHandler(async (req, res) => {
  const msg = await ContactMessage.findById(req.params.id);
  if (!msg) throw ApiError.notFound('Contact message not found');

  await msg.deleteOne();
  recordAudit({
    req,
    action: 'contact.delete',
    entity: 'ContactMessage',
    entityId: msg._id,
    summary: `Deleted contact message from ${msg.email}`,
  });
  return noContent(res);
});
