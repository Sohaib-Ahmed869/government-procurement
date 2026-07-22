import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Category } from '../../models/Category.js';

// GET / — list every category. Supports ?kind (matched against the kinds array)
// and ?q (case-insensitive name search). Ordered by `order` then name.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.kind) filter.kinds = req.query.kind;
  if (req.query.q) filter.name = { $regex: req.query.q, $options: 'i' };

  const items = await Category.find(filter).sort('order name');
  return ok(res, items);
});

// POST / — create a category with a unique slug derived from its name.
export const create = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.slug = await uniqueSlug(Category, data.name);

  const category = await Category.create(data);
  recordAudit({
    req,
    action: 'category.create',
    entity: 'Category',
    entityId: category._id,
    summary: `Created category "${category.name}"`,
  });
  return created(res, category);
});

// PATCH /:id — update a category. Slug is regenerated only when the name changes.
export const update = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  const data = { ...req.body };
  if (data.name !== undefined && data.name !== category.name) {
    data.slug = await uniqueSlug(Category, data.name, category._id);
  }

  Object.assign(category, data);
  await category.save();

  recordAudit({
    req,
    action: 'category.update',
    entity: 'Category',
    entityId: category._id,
    summary: `Updated category "${category.name}"`,
  });
  return ok(res, category);
});

// DELETE /:id — remove a category.
export const remove = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  await category.deleteOne();
  recordAudit({
    req,
    action: 'category.delete',
    entity: 'Category',
    entityId: category._id,
    summary: `Deleted category "${category.name}"`,
  });
  return noContent(res);
});
