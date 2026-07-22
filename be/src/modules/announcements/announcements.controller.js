import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Announcement } from '../../models/Announcement.js';

// GET /active — PUBLIC. Return the single active banner whose display window
// contains "now": active AND (no start or start<=now) AND (no end or end>=now).
// Most recently created wins if several qualify. Returns null when none apply.
export const active = asyncHandler(async (req, res) => {
  const now = new Date();
  const banner = await Announcement.findOne({
    active: true,
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  }).sort('-createdAt');
  return ok(res, banner || null);
});

// GET / — admin list of all announcements (no window filtering).
export const list = asyncHandler(async (req, res) => {
  const items = await Announcement.find().sort('-createdAt');
  return ok(res, items);
});

// POST / — create an announcement.
export const create = asyncHandler(async (req, res) => {
  const announcement = await Announcement.create(req.body);
  recordAudit({
    req,
    action: 'announcement.create',
    entity: 'Announcement',
    entityId: announcement._id,
    summary: `Created announcement "${announcement.message}"`,
  });
  return created(res, announcement);
});

// PATCH /:id — update an announcement.
export const update = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found');

  Object.assign(announcement, req.body);
  await announcement.save();

  recordAudit({
    req,
    action: 'announcement.update',
    entity: 'Announcement',
    entityId: announcement._id,
    summary: `Updated announcement "${announcement.message}"`,
  });
  return ok(res, announcement);
});

// DELETE /:id — remove an announcement.
export const remove = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found');

  await announcement.deleteOne();
  recordAudit({
    req,
    action: 'announcement.delete',
    entity: 'Announcement',
    entityId: announcement._id,
    summary: `Deleted announcement "${announcement.message}"`,
  });
  return noContent(res);
});
