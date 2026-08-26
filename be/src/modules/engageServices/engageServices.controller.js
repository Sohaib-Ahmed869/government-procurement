import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { EngageService } from '../../models/EngageService.js';

const EDITABLE = ['title', 'body', 'serviceKey', 'order', 'status'];

// GET / — public list. Anonymous callers see only published rows; staff
// (optionalAuth) see drafts too, which is how a row is checked on the page
// itself before it goes live. A handful of rows read top to bottom, so this is
// unpaginated by design, sorted into the order the page prints.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);

  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }

  const items = await EngageService.find(filter).collation({ locale: 'en' }).sort('order title');
  return ok(res, items);
});

function validate(body, { partial = false } = {}) {
  const missing = (field) => (partial ? body[field] !== undefined && !body[field] : !body[field]);
  if (missing('title')) throw ApiError.badRequest('title is required');
}

export const create = asyncHandler(async (req, res) => {
  validate(req.body);

  const service = new EngageService();
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) service[field] = req.body[field];
  }
  await service.save();

  recordAudit({
    req,
    action: 'engageService.create',
    entity: 'EngageService',
    entityId: service._id,
    summary: `Created engage service "${service.title}"`,
  });
  return created(res, service);
});

export const update = asyncHandler(async (req, res) => {
  const service = await EngageService.findById(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');
  validate(req.body, { partial: true });

  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) service[field] = req.body[field];
  }
  await service.save();

  recordAudit({
    req,
    action: 'engageService.update',
    entity: 'EngageService',
    entityId: service._id,
    summary: `Updated engage service "${service.title}"`,
  });
  return ok(res, service);
});

export const remove = asyncHandler(async (req, res) => {
  const service = await EngageService.findById(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');

  await service.deleteOne();
  recordAudit({
    req,
    action: 'engageService.delete',
    entity: 'EngageService',
    entityId: service._id,
    summary: `Deleted engage service "${service.title}"`,
  });
  return noContent(res);
});
