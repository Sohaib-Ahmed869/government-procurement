import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Link } from '../../models/Link.js';

// GET / — PUBLIC list of managed links. Active-only by default; ?all=1 includes
// the inactive ones. Optional filters: ?group and ?region. Sorted by curator
// order.
//
// ?all=1 is open to anonymous callers, not just staff. The footer renders from a
// fixed catalogue in the site and treats a saved link as an override of it, so it
// has to see a link that has been switched off — otherwise "no row returned" is
// indistinguishable from "never edited", and the built-in link reappears. These
// are published URLs either way; `active` is a display preference rather than an
// access control.
export const list = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.all !== '1') {
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
