import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { JobOpening } from '../../models/JobOpening.js';

const EDITABLE = ['title', 'description', 'applyUrl', 'order', 'status'];

// GET /openings — public list. Anonymous callers see only published openings;
// staff (optionalAuth) see everything and can filter by ?status. Small list, so
// intentionally unpaginated, ordered by the curator's `order`.
export const listOpenings = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);

  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }

  const items = await JobOpening.find(filter).sort('order createdAt');
  return ok(res, items);
});

export const createOpening = asyncHandler(async (req, res) => {
  if (!req.body.title) throw ApiError.badRequest('title is required');
  // applyUrl is optional — blank means Apply points at the careers inbox.

  const opening = new JobOpening();
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) opening[field] = req.body[field];
  }
  await opening.save();

  recordAudit({
    req,
    action: 'jobOpening.create',
    entity: 'JobOpening',
    entityId: opening._id,
    summary: `Created job opening "${opening.title}"`,
  });
  return created(res, opening);
});

export const updateOpening = asyncHandler(async (req, res) => {
  const opening = await JobOpening.findById(req.params.id);
  if (!opening) throw ApiError.notFound('Job opening not found');
  // Clearing applyUrl is allowed — Apply falls back to the careers inbox.

  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) opening[field] = req.body[field];
  }
  await opening.save();

  recordAudit({
    req,
    action: 'jobOpening.update',
    entity: 'JobOpening',
    entityId: opening._id,
    summary: `Updated job opening "${opening.title}"`,
  });
  return ok(res, opening);
});

export const removeOpening = asyncHandler(async (req, res) => {
  const opening = await JobOpening.findById(req.params.id);
  if (!opening) throw ApiError.notFound('Job opening not found');

  await opening.deleteOne();
  recordAudit({
    req,
    action: 'jobOpening.delete',
    entity: 'JobOpening',
    entityId: opening._id,
    summary: `Deleted job opening "${opening.title}"`,
  });
  return noContent(res);
});
