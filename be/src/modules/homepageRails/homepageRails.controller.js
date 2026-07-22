import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { HomepageRail } from '../../models/HomepageRail.js';
import { Article } from '../../models/Article.js';
import { Video } from '../../models/Video.js';
import { Course } from '../../models/Course.js';

// Maps a rail's `kind` to the Mongoose model it draws items from.
const KIND_MODEL = { article: Article, video: Video, course: Course };

// GET /resolved — PUBLIC. Return active rails (by order), each with its item
// list resolved: curated items first, then — if short and a fallback is set —
// the newest published (or featured) items of the rail's kind, excluding any
// already curated. The final list is capped at maxItems.
export const resolved = asyncHandler(async (req, res) => {
  const rails = await HomepageRail.find({ active: true }).sort('order');

  const result = [];
  for (const rail of rails) {
    const Model = KIND_MODEL[rail.kind];
    if (!Model) continue; // unknown kind — skip defensively

    // Curated items, in curator order (populate preserves the ids array order).
    // eslint-disable-next-line no-await-in-loop
    await rail.populate({ path: 'items', model: Model });
    const curated = (rail.items || []).filter(Boolean);

    const railObj = rail.toObject();
    let items = [...curated];

    const remaining = rail.maxItems - items.length;
    if (remaining > 0 && rail.fallback !== 'none') {
      const excludeIds = curated.map((doc) => doc._id);
      const fill = {
        status: CONTENT_STATUS.PUBLISHED,
        ...(rail.fallback === 'featured' ? { featured: true } : {}),
        ...(excludeIds.length ? { _id: { $nin: excludeIds } } : {}),
      };
      // eslint-disable-next-line no-await-in-loop
      const extras = await Model.find(fill).sort('-createdAt').limit(remaining);
      items = items.concat(extras);
    }

    railObj.items = items.slice(0, rail.maxItems);
    result.push(railObj);
  }

  return ok(res, result);
});

// GET / — admin list of all rails.
export const list = asyncHandler(async (req, res) => {
  const items = await HomepageRail.find().sort('order');
  return ok(res, items);
});

// POST / — create a rail.
export const create = asyncHandler(async (req, res) => {
  const rail = await HomepageRail.create(req.body);
  recordAudit({
    req,
    action: 'homepageRail.create',
    entity: 'HomepageRail',
    entityId: rail._id,
    summary: `Created homepage rail "${rail.title}"`,
  });
  return created(res, rail);
});

// PATCH /:id — update a rail.
export const update = asyncHandler(async (req, res) => {
  const rail = await HomepageRail.findById(req.params.id);
  if (!rail) throw ApiError.notFound('Homepage rail not found');

  Object.assign(rail, req.body);
  await rail.save();

  recordAudit({
    req,
    action: 'homepageRail.update',
    entity: 'HomepageRail',
    entityId: rail._id,
    summary: `Updated homepage rail "${rail.title}"`,
  });
  return ok(res, rail);
});

// DELETE /:id — remove a rail.
export const remove = asyncHandler(async (req, res) => {
  const rail = await HomepageRail.findById(req.params.id);
  if (!rail) throw ApiError.notFound('Homepage rail not found');

  await rail.deleteOne();
  recordAudit({
    req,
    action: 'homepageRail.delete',
    entity: 'HomepageRail',
    entityId: rail._id,
    summary: `Deleted homepage rail "${rail.title}"`,
  });
  return noContent(res);
});
