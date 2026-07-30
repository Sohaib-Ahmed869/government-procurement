import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { uploadBuffer, deleteObject } from '../../config/s3.js';
import { Article } from '../../models/Article.js';

// The category is the article's public topic label — the site prints its name on
// cards and in the article hero — so every read populates it rather than handing
// back a bare ObjectId.
const CATEGORY_FIELDS = 'name slug';

// The homepage "Latest Insights" rail has three slots, so only three articles
// show there at a time.
const MAX_FEATURED = 3;

// A slot is only occupied by an article that is actually live: a featured draft
// isn't on the homepage, so it doesn't hold a slot open for itself. The
// consequence is that a draft can be marked featured while a slot is free, and
// find it taken by the time it's published — the CMS clears the flag and
// publishes it unfeatured, rather than the publish failing.
function countFeaturedLive(exceptId) {
  const filter = { featured: true, status: CONTENT_STATUS.PUBLISHED };
  if (exceptId) filter._id = { $ne: exceptId };
  return Article.countDocuments(filter);
}

// `errors.featured` is what lets the CMS recognise this particular rejection and
// drop the featured flag itself, instead of just printing the message.
function noFreeSlotError() {
  return ApiError.badRequest(
    `No space in featured insights — all ${MAX_FEATURED} homepage slots are taken by published insights.`,
    { featured: 'no-free-slot' },
  );
}

// Throws unless a homepage slot is free for this article. `exceptId` skips the
// article being saved so an already-featured one doesn't count against itself.
async function assertFeaturedSlotFree(exceptId) {
  if ((await countFeaturedLive(exceptId)) >= MAX_FEATURED) throw noFreeSlotError();
}

// GET / — public list. Anonymous callers only ever see published articles and
// are sorted by publish date; signed-in staff see everything and can filter.
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const isStaff = Boolean(req.user);

  const filter = {};
  let sort;
  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
    sort = req.query.sort || '-publishedAt';
  } else {
    if (req.query.status) filter.status = req.query.status;
    if (req.query.featured !== undefined) filter.featured = req.query.featured === 'true';
    if (req.query.category) filter.category = req.query.category;
    if (req.query.q) filter.$text = { $search: req.query.q };
    sort = req.query.sort || '-createdAt';
  }

  const { items, meta } = await paginate(Article, filter, {
    page,
    limit,
    skip,
    sort,
    populate: { path: 'category', select: CATEGORY_FIELDS },
  });
  return ok(res, items, meta);
});

// GET /slug/:slug — fetch one article by slug. Anonymous callers can only reach
// published articles (anything else is a 404 so drafts stay hidden).
export const getBySlug = asyncHandler(async (req, res) => {
  const filter = { slug: req.params.slug };
  if (!req.user) filter.status = CONTENT_STATUS.PUBLISHED;
  const article = await Article.findOne(filter).populate('category', CATEGORY_FIELDS);
  if (!article) throw ApiError.notFound('Article not found');
  return ok(res, article);
});

// GET /:id — fetch by id (staff use, e.g. the admin editor).
export const getById = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id).populate('category', CATEGORY_FIELDS);
  if (!article) throw ApiError.notFound('Article not found');
  return ok(res, article);
});

// POST / — create an article. Slug is derived from the title; publishedAt is
// stamped now if the article is born published.
export const create = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.slug = await uniqueSlug(Article, data.title);
  if (data.status === CONTENT_STATUS.PUBLISHED && !data.publishedAt) {
    data.publishedAt = new Date();
  }
  if (data.featured === true) await assertFeaturedSlotFree();

  const article = await Article.create(data);
  recordAudit({
    req,
    action: article.status === CONTENT_STATUS.PUBLISHED ? 'article.publish' : 'article.create',
    entity: 'Article',
    entityId: article._id,
    // "Insight" is the name the CMS and the public site use for these; the
    // `action` keys stay on `article.*` so existing log entries stay searchable.
    summary: `Created insight "${article.title}"`,
  });
  return created(res, article);
});

// PATCH /:id — update an article. The slug is only regenerated when the title
// changes; publishedAt comes from the editor when set, and is stamped here for
// any published article that doesn't have one yet.
export const update = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) throw ApiError.notFound('Article not found');

  const data = { ...req.body };
  const titleChanged = data.title !== undefined && data.title !== article.title;
  if (titleChanged) {
    data.slug = await uniqueSlug(Article, data.title, article._id);
  }

  const publishing =
    data.status === CONTENT_STATUS.PUBLISHED && article.status !== CONTENT_STATUS.PUBLISHED;

  // Anything live has to carry a publish date — it's the one date both the CMS
  // card and the public site print, and a published article without one shows a
  // blank where the date should be. Normally that's stamped on the transition to
  // published; this also backfills an article that somehow reached published
  // without one, so the site never renders a dateless insight.
  const willBePublished = (data.status ?? article.status) === CONTENT_STATUS.PUBLISHED;
  if (willBePublished && !data.publishedAt && !article.publishedAt) {
    data.publishedAt = new Date();
  }

  // A slot is claimed at two moments: when the flag goes on, and when a featured
  // draft goes live (which is when it actually reaches the homepage). Re-saving
  // an already-live featured article claims nothing new, and clearing the flag
  // never needs a slot.
  const willBeFeatured = data.featured ?? article.featured;
  const claimingSlot =
    willBeFeatured && ((data.featured === true && !article.featured) || publishing);
  if (claimingSlot) await assertFeaturedSlotFree(article._id);

  Object.assign(article, data);
  await article.save();
  await article.populate('category', CATEGORY_FIELDS);

  recordAudit({
    req,
    action: publishing ? 'article.publish' : 'article.update',
    entity: 'Article',
    entityId: article._id,
    summary: `Updated insight "${article.title}"`,
  });
  return ok(res, article);
});

// POST /:id/hero-image — upload the hero image to S3 and attach it. The old
// object (if any) is removed best-effort so we don't orphan files.
export const uploadHeroImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');

  const article = await Article.findById(req.params.id);
  if (!article) throw ApiError.notFound('Article not found');

  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'articles',
    originalName: req.file.originalname,
  });

  const oldKey = article.heroImage?.key;
  article.heroImage = { key, url, alt: article.heroImage?.alt || '' };
  await article.save();

  if (oldKey && oldKey !== key) {
    // Best-effort cleanup — never fail the request over a stale object.
    deleteObject(oldKey).catch(() => {});
  }

  recordAudit({
    req,
    action: 'article.update',
    entity: 'Article',
    entityId: article._id,
    summary: `Updated hero image for "${article.title}"`,
  });
  return ok(res, article);
});

// DELETE /:id — remove an article and best-effort delete its hero image.
export const remove = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) throw ApiError.notFound('Article not found');

  await article.deleteOne();
  if (article.heroImage?.key) {
    deleteObject(article.heroImage.key).catch(() => {});
  }

  recordAudit({
    req,
    action: 'article.delete',
    entity: 'Article',
    entityId: article._id,
    summary: `Deleted insight "${article.title}"`,
  });
  return noContent(res);
});
