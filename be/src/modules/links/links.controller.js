import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Link } from '../../models/Link.js';

// GET / — PUBLIC list of managed links. Anonymous callers only see active
// links; staff (optionalAuth) can pass ?all=1 to include inactive ones.
// Optional filters: ?group (tender|social) and ?region. Sorted by curator order.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);

  // Non-staff always get active-only; staff opt into everything via ?all=1.
  if (!(isStaff && req.query.all === '1')) {
    filter.active = true;
  }

  if (req.query.group) filter.group = req.query.group;
  if (req.query.region) filter.region = req.query.region;

  const items = await Link.find(filter).sort('order');
  return ok(res, items);
});

// POST / — create a link.
export const create = asyncHandler(async (req, res) => {
  const link = await Link.create(req.body);
  recordAudit({
    req,
    action: 'link.create',
    entity: 'Link',
    entityId: link._id,
    summary: `Created ${link.group} link "${link.label}"`,
  });
  return created(res, link);
});

// PATCH /:id — update a link.
export const update = asyncHandler(async (req, res) => {
  const link = await Link.findById(req.params.id);
  if (!link) throw ApiError.notFound('Link not found');

  Object.assign(link, req.body);
  await link.save();

  recordAudit({
    req,
    action: 'link.update',
    entity: 'Link',
    entityId: link._id,
    summary: `Updated ${link.group} link "${link.label}"`,
  });
  return ok(res, link);
});

// DELETE /:id — remove a link.
export const remove = asyncHandler(async (req, res) => {
  const link = await Link.findById(req.params.id);
  if (!link) throw ApiError.notFound('Link not found');

  await link.deleteOne();
  recordAudit({
    req,
    action: 'link.delete',
    entity: 'Link',
    entityId: link._id,
    summary: `Deleted ${link.group} link "${link.label}"`,
  });
  return noContent(res);
});
