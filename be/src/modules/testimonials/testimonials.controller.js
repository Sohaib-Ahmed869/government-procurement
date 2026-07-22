import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { uploadBuffer, deleteObject } from '../../config/s3.js';
import { Testimonial } from '../../models/Testimonial.js';

// GET / — public list. Anonymous users see only published testimonials; staff
// (optionalAuth) see everything and can filter by ?status. Sorted by curator
// order then age. Testimonials are few, so this list is intentionally unpaginated.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);

  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }

  const items = await Testimonial.find(filter).sort('order createdAt');
  return ok(res, items);
});

// POST / — create a testimonial.
export const create = asyncHandler(async (req, res) => {
  const testimonial = await Testimonial.create(req.body);
  recordAudit({
    req,
    action: 'testimonial.create',
    entity: 'Testimonial',
    entityId: testimonial._id,
    summary: `Created testimonial by "${testimonial.author}"`,
  });
  return created(res, testimonial);
});

// PATCH /:id — update a testimonial.
export const update = asyncHandler(async (req, res) => {
  const testimonial = await Testimonial.findById(req.params.id);
  if (!testimonial) throw ApiError.notFound('Testimonial not found');

  Object.assign(testimonial, req.body);
  await testimonial.save();

  recordAudit({
    req,
    action: 'testimonial.update',
    entity: 'Testimonial',
    entityId: testimonial._id,
    summary: `Updated testimonial by "${testimonial.author}"`,
  });
  return ok(res, testimonial);
});

// POST /:id/avatar — upload the author avatar to S3 and attach it. The old
// object (if any) is removed best-effort so we don't orphan files.
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');

  const testimonial = await Testimonial.findById(req.params.id);
  if (!testimonial) throw ApiError.notFound('Testimonial not found');

  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'testimonials',
    originalName: req.file.originalname,
  });

  const oldKey = testimonial.avatar?.key;
  testimonial.avatar = { key, url };
  await testimonial.save();

  if (oldKey && oldKey !== key) {
    // Best-effort cleanup — never fail the request over a stale object.
    deleteObject(oldKey).catch(() => {});
  }

  recordAudit({
    req,
    action: 'testimonial.update',
    entity: 'Testimonial',
    entityId: testimonial._id,
    summary: `Updated avatar for testimonial by "${testimonial.author}"`,
  });
  return ok(res, testimonial);
});

// DELETE /:id — remove a testimonial and best-effort delete its avatar.
export const remove = asyncHandler(async (req, res) => {
  const testimonial = await Testimonial.findById(req.params.id);
  if (!testimonial) throw ApiError.notFound('Testimonial not found');

  await testimonial.deleteOne();
  if (testimonial.avatar?.key) {
    deleteObject(testimonial.avatar.key).catch(() => {});
  }

  recordAudit({
    req,
    action: 'testimonial.delete',
    entity: 'Testimonial',
    entityId: testimonial._id,
    summary: `Deleted testimonial by "${testimonial.author}"`,
  });
  return noContent(res);
});
