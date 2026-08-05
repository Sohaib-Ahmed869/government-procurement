import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Capability } from '../../models/Capability.js';

const EDITABLE = ['title', 'body', 'icon', 'order', 'active'];

function pickEditable(body) {
  const out = {};
  for (const field of EDITABLE) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

// GET / — PUBLIC list of capability cards. Anonymous callers only see active
// ones; staff (optionalAuth) can pass ?all=1 to include the rest.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);
  if (!(isStaff && req.query.all === '1')) filter.active = true;

  const items = await Capability.find(filter).sort('order createdAt');
  return ok(res, items);
});

// POST / — create a card.
export const create = asyncHandler(async (req, res) => {
  const body = pickEditable(req.body);
  if (!body.title) throw ApiError.badRequest('Title is required');

  const capability = await Capability.create(body);
  recordAudit({
    req,
    action: 'capability.create',
    entity: 'Capability',
    entityId: capability._id,
    summary: `Created capability "${capability.title}"`,
  });
  return created(res, capability);
});

// PATCH /:id — update a card.
export const update = asyncHandler(async (req, res) => {
  const capability = await Capability.findById(req.params.id);
  if (!capability) throw ApiError.notFound('Capability not found');

  Object.assign(capability, pickEditable(req.body));
  await capability.save();

  recordAudit({
    req,
    action: 'capability.update',
    entity: 'Capability',
    entityId: capability._id,
    summary: `Updated capability "${capability.title}"`,
  });
  return ok(res, capability);
});

// DELETE /:id — remove a card.
export const remove = asyncHandler(async (req, res) => {
  const capability = await Capability.findById(req.params.id);
  if (!capability) throw ApiError.notFound('Capability not found');

  await capability.deleteOne();
  recordAudit({
    req,
    action: 'capability.delete',
    entity: 'Capability',
    entityId: capability._id,
    summary: `Deleted capability "${capability.title}"`,
  });
  return noContent(res);
});
