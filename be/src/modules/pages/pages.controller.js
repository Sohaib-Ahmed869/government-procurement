import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Page } from '../../models/Page.js';

// GET / — public list of pages. Anonymous callers only see published pages;
// signed-in staff (optionalAuth) see everything and may filter by ?status.
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const isStaff = Boolean(req.user);

  const filter = {};
  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }

  const { items, meta } = await paginate(Page, filter, {
    page,
    limit,
    skip,
    sort: req.query.sort || '-createdAt',
  });
  return ok(res, items, meta);
});

// GET /slug/:slug — fetch one page by slug. Anonymous callers can only reach
// published pages (anything else is a 404 so drafts stay hidden).
export const getBySlug = asyncHandler(async (req, res) => {
  const filter = { slug: req.params.slug };
  if (!req.user) filter.status = CONTENT_STATUS.PUBLISHED;
  const page = await Page.findOne(filter);
  if (!page) throw ApiError.notFound('Page not found');
  return ok(res, page);
});

// GET /:id — fetch by id (staff use, e.g. the admin editor).
export const getById = asyncHandler(async (req, res) => {
  const page = await Page.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found');
  return ok(res, page);
});

// POST / — create a page. Slug is derived from the title. Pages use `status`
// only, so there is no publishedAt to stamp.
export const create = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.slug = await uniqueSlug(Page, data.title);

  const page = await Page.create(data);
  recordAudit({
    req,
    action: 'page.create',
    entity: 'Page',
    entityId: page._id,
    summary: `Created page "${page.title}"`,
  });
  return created(res, page);
});

// PATCH /:id — update a page. The slug is only regenerated when the title
// changes.
export const update = asyncHandler(async (req, res) => {
  const page = await Page.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found');

  const data = { ...req.body };
  const titleChanged = data.title !== undefined && data.title !== page.title;
  if (titleChanged) {
    data.slug = await uniqueSlug(Page, data.title, page._id);
  }

  Object.assign(page, data);
  await page.save();

  recordAudit({
    req,
    action: 'page.update',
    entity: 'Page',
    entityId: page._id,
    summary: `Updated page "${page.title}"`,
  });
  return ok(res, page);
});

// DELETE /:id — remove a page.
export const remove = asyncHandler(async (req, res) => {
  const page = await Page.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found');

  await page.deleteOne();
  recordAudit({
    req,
    action: 'page.delete',
    entity: 'Page',
    entityId: page._id,
    summary: `Deleted page "${page.title}"`,
  });
  return noContent(res);
});
