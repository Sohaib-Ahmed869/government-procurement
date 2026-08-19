import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Capability } from '../../models/Capability.js';
import { uploadBuffer, deleteObject } from '../../config/s3.js';

const EDITABLE = ['key', 'title', 'body', 'stage', 'icon', 'audience', 'order', 'active'];

function pickEditable(body) {
  const out = {};
  for (const field of EDITABLE) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

// GET / — PUBLIC list of capability cards. Anonymous callers only see active
// ones; staff (optionalAuth) can pass ?all=1 to include the rest.
//
// ?audience=win|award narrows the list to the cards written for that side of
// the toggle, plus the ones marked for both. Left off, every card comes back —
// which is what the public page asks for, so switching the toggle filters what
// it already has rather than refetching.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);
  if (!(isStaff && req.query.all === '1')) filter.active = true;

  const { audience } = req.query;
  if (audience === 'win' || audience === 'award') {
    // `null` also matches documents saved before the field existed, which are
    // treated as belonging to both segments.
    filter.audience = { $in: ['both', audience, null] };
  }

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

// POST /:id/image — attach the photograph shown beside this service on the
// Service Offering page.
//
// Its own endpoint rather than a field on PATCH, because the file has to be
// stored before there is a URL to save: the same shape as a team member's
// photo. `image` is deliberately absent from EDITABLE, so a PATCH carrying a
// stale copy of the card can't overwrite what was just uploaded.
export const uploadCardImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');

  const capability = await Capability.findById(req.params.id);
  if (!capability) throw ApiError.notFound('Capability not found');

  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'service-offering',
    originalName: req.file.originalname,
  });

  const oldKey = capability.image?.key;
  capability.image = { key, url };
  await capability.save();

  if (oldKey && oldKey !== key) {
    // Best-effort cleanup — never fail the request over a stale object.
    deleteObject(oldKey).catch(() => {});
  }

  recordAudit({
    req,
    action: 'capability.update',
    entity: 'Capability',
    entityId: capability._id,
    summary: `Updated image for capability "${capability.title}"`,
  });
  return ok(res, capability);
});

// DELETE /:id/image — drop the photograph, so the row falls back to the
// built-in one for that service rather than keeping a picture an editor has
// decided against.
export const removeCardImage = asyncHandler(async (req, res) => {
  const capability = await Capability.findById(req.params.id);
  if (!capability) throw ApiError.notFound('Capability not found');

  const oldKey = capability.image?.key;
  capability.image = { key: '', url: '' };
  await capability.save();

  if (oldKey) deleteObject(oldKey).catch(() => {});

  recordAudit({
    req,
    action: 'capability.update',
    entity: 'Capability',
    entityId: capability._id,
    summary: `Removed image for capability "${capability.title}"`,
  });
  return ok(res, capability);
});

// DELETE /:id — remove a card.
export const remove = asyncHandler(async (req, res) => {
  const capability = await Capability.findById(req.params.id);
  if (!capability) throw ApiError.notFound('Capability not found');

  const imageKey = capability.image?.key;
  await capability.deleteOne();
  if (imageKey) deleteObject(imageKey).catch(() => {});

  recordAudit({
    req,
    action: 'capability.delete',
    entity: 'Capability',
    entityId: capability._id,
    summary: `Deleted capability "${capability.title}"`,
  });
  return noContent(res);
});
