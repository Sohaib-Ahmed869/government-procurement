import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { uploadBuffer, deleteObject } from '../../config/s3.js';
import { Article } from '../../models/Article.js';

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

  const { items, meta } = await paginate(Article, filter, { page, limit, skip, sort });
  return ok(res, items, meta);
});

// GET /slug/:slug — fetch one article by slug. Anonymous callers can only reach
// published articles (anything else is a 404 so drafts stay hidden).
export const getBySlug = asyncHandler(async (req, res) => {
  const filter = { slug: req.params.slug };
  if (!req.user) filter.status = CONTENT_STATUS.PUBLISHED;
  const article = await Article.findOne(filter);
  if (!article) throw ApiError.notFound('Article not found');
  return ok(res, article);
});

// GET /:id — fetch by id (staff use, e.g. the admin editor).
export const getById = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
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

  const article = await Article.create(data);
  recordAudit({
    req,
    action: article.status === CONTENT_STATUS.PUBLISHED ? 'article.publish' : 'article.create',
    entity: 'Article',
    entityId: article._id,
    summary: `Created article "${article.title}"`,
  });
  return created(res, article);
});

// PATCH /:id — update an article. The slug is only regenerated when the title
// changes; publishedAt is stamped the first time it transitions to published.
export const update = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) throw ApiError.notFound('Article not found');

  const data = { ...req.body };
  const titleChanged = data.title !== undefined && data.title !== article.title;
  if (titleChanged) {
    data.slug = await uniqueSlug(Article, data.title, article._id);
  }

  const publishing =
    data.status === CONTENT_STATUS.PUBLISHED &&
    article.status !== CONTENT_STATUS.PUBLISHED &&
    !article.publishedAt;
  if (publishing && !data.publishedAt) {
    data.publishedAt = new Date();
  }

  Object.assign(article, data);
  await article.save();

  recordAudit({
    req,
    action: publishing ? 'article.publish' : 'article.update',
    entity: 'Article',
    entityId: article._id,
    summary: `Updated article "${article.title}"`,
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
    summary: `Deleted article "${article.title}"`,
  });
  return noContent(res);
});
