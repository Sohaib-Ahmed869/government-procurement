import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Faq } from '../../models/Faq.js';

// Public content module. Anonymous users see only published FAQs; staff
// (optionalAuth) see everything and can filter by ?status. FAQs are small and
// intentionally unpaginated, sorted by curator order then age.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);

  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.category) filter.category = req.query.category;

  const items = await Faq.find(filter).sort('order createdAt');
  return ok(res, items);
});

export const create = asyncHandler(async (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) throw ApiError.badRequest('question and answer are required');

  const faq = await Faq.create(req.body);
  recordAudit({
    req,
    action: 'faq.create',
    entity: 'Faq',
    entityId: faq._id,
    summary: `Created FAQ "${faq.question}"`,
  });
  return created(res, faq);
});

export const update = asyncHandler(async (req, res) => {
  const faq = await Faq.findById(req.params.id);
  if (!faq) throw ApiError.notFound('FAQ not found');

  const fields = ['question', 'answer', 'category', 'order', 'status'];
  for (const f of fields) {
    if (req.body[f] !== undefined) faq[f] = req.body[f];
  }

  await faq.save();
  recordAudit({
    req,
    action: 'faq.update',
    entity: 'Faq',
    entityId: faq._id,
    summary: `Updated FAQ "${faq.question}"`,
  });
  return ok(res, faq);
});

export const remove = asyncHandler(async (req, res) => {
  const faq = await Faq.findById(req.params.id);
  if (!faq) throw ApiError.notFound('FAQ not found');

  await faq.deleteOne();
  recordAudit({
    req,
    action: 'faq.delete',
    entity: 'Faq',
    entityId: faq._id,
    summary: `Deleted FAQ "${faq.question}"`,
  });
  return noContent(res);
});
