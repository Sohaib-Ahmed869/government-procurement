import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { AuditLog } from '../../models/AuditLog.js';

// GET / — paginated audit trail (newest first). Super-admin only (guarded in
// the routes). Supports ?entity, ?action, ?q filters.
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = {};
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.q) {
    const rx = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ summary: rx }, { actorEmail: rx }, { action: rx }];
  }
  const { items, meta } = await paginate(AuditLog, filter, { page, limit, skip, sort: '-createdAt' });
  return ok(res, items, meta);
});
