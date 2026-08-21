import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { STAFF_ROLES } from '../../constants/roles.js';
import { recordAudit } from '../../models/AuditLog.js';
import { uploadBuffer, deleteObject } from '../../config/s3.js';
import { Bundle } from '../../models/Bundle.js';
import { Course } from '../../models/Course.js';
import { sanitizeRichTextFields } from '../../utils/richText.js';

/* ---------------------------------------------------------------------------
   Course bundles: several courses sold together for less than their total.

   Priced against the courses' CURRENT prices on every read, never against a
   stored total. An admin who re-prices a course inside a bundle would
   otherwise leave every card on the site advertising a saving that no longer
   exists — and the number a shop window promises is the one thing that has to
   be true.
   ------------------------------------------------------------------------ */

const COURSE_FIELDS = 'title slug summary price currency image level levelLabel durationLabel status';

// The courses in a bundle, in the order the admin arranged them, plus what the
// grouping is worth. For public reads a course that has been unpublished drops
// out, because a bundle should never link a visitor to something that isn't
// there; staff see the full list so they can fix it.
async function withCourses(bundle, { staff = false } = {}) {
  const ids = (bundle.courses ?? []).map(String);
  const filter = { _id: { $in: ids } };
  if (!staff) filter.status = CONTENT_STATUS.PUBLISHED;

  const rows = await Course.find(filter).select(COURSE_FIELDS).lean();
  const byId = new Map(rows.map((c) => [String(c._id), c]));
  const courses = ids.map((id) => byId.get(id)).filter(Boolean);

  const listPrice = courses.reduce((sum, c) => sum + (c.price ?? 0), 0);
  const price = bundle.price ?? 0;

  return {
    ...bundle,
    courses,
    courseCount: courses.length,
    // What the same courses would cost bought one at a time.
    listPrice,
    saving: Math.max(0, listPrice - price),
    savingPercent: listPrice > 0 ? Math.round(((listPrice - price) / listPrice) * 100) : 0,
  };
}

// A bundle of one course is not a bundle, and one that costs more than its
// parts is a worse deal presented as a better one. Both are refused at publish
// rather than left for a customer to notice. Drafts are exempt: an admin builds
// one a field at a time and would otherwise be blocked before they finished.
async function assertSellable(bundle) {
  if (bundle.status !== CONTENT_STATUS.PUBLISHED) return;
  const ids = (bundle.courses ?? []).map(String);

  if (ids.length < 2) {
    throw ApiError.badRequest('A bundle needs at least two courses before it can be published');
  }
  const rows = await Course.find({ _id: { $in: ids } }).select('price status').lean();
  if (rows.some((c) => c.status !== CONTENT_STATUS.PUBLISHED) || rows.length !== ids.length) {
    throw ApiError.badRequest('Every course in the bundle must be published first');
  }
  const listPrice = rows.reduce((sum, c) => sum + (c.price ?? 0), 0);
  if (listPrice > 0 && (bundle.price ?? 0) >= listPrice) {
    throw ApiError.badRequest(
      `A bundle has to cost less than its courses do separately (${listPrice} in total).`,
    );
  }
}

// Validates that every id given is a real course, so a typo becomes a 400 here
// rather than an empty bundle on the site.
async function normaliseCourses(raw) {
  if (!Array.isArray(raw)) return undefined;
  const ids = raw.map(String).filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    throw ApiError.badRequest('A course can only appear once in a bundle');
  }
  const found = await Course.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) throw ApiError.badRequest('One of those courses does not exist');
  return ids;
}

// GET /bundles. Anonymous callers see published bundles only; staff can ask for
// drafts, the same contract /courses has.
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const isStaff = STAFF_ROLES.includes(req.user?.role);

  const filter = {};
  if (!isStaff) filter.status = CONTENT_STATUS.PUBLISHED;
  else if (req.query.status) filter.status = req.query.status;
  if (req.query.q) filter.$text = { $search: String(req.query.q).trim() };

  const { items, meta } = await paginate(Bundle, filter, {
    page,
    limit,
    skip,
    sort: req.query.sort || '-createdAt',
  });

  const rows = await Promise.all(
    items.map((b) => withCourses(b.toObject?.() ?? b, { staff: isStaff })),
  );
  return ok(res, rows, meta);
});

// GET /bundles/slug/:slug
export const getBySlug = asyncHandler(async (req, res) => {
  const bundle = await Bundle.findOne({ slug: req.params.slug }).lean();
  if (!bundle) throw ApiError.notFound('Bundle not found');
  const isStaff = STAFF_ROLES.includes(req.user?.role);
  if (!isStaff && bundle.status !== CONTENT_STATUS.PUBLISHED) {
    throw ApiError.notFound('Bundle not found');
  }
  return ok(res, await withCourses(bundle, { staff: isStaff }));
});

// GET /bundles/:id
export const getById = asyncHandler(async (req, res) => {
  const bundle = await Bundle.findById(req.params.id).lean();
  if (!bundle) throw ApiError.notFound('Bundle not found');
  const isStaff = STAFF_ROLES.includes(req.user?.role);
  if (!isStaff && bundle.status !== CONTENT_STATUS.PUBLISHED) {
    throw ApiError.notFound('Bundle not found');
  }
  return ok(res, await withCourses(bundle, { staff: isStaff }));
});

// POST /bundles
export const create = asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) throw ApiError.badRequest('title is required');

  const courses = (await normaliseCourses(req.body.courses)) ?? [];
  const data = sanitizeRichTextFields({
    ...req.body,
    title: title.trim(),
    courses,
    slug: await uniqueSlug(Bundle, title),
  });
  await assertSellable(data);
  if (data.status === CONTENT_STATUS.PUBLISHED && !data.publishedAt) data.publishedAt = new Date();

  const bundle = await Bundle.create(data);
  recordAudit({
    req,
    action: 'bundle.create',
    entity: 'Bundle',
    entityId: bundle._id,
    summary: `Created bundle "${bundle.title}"`,
  });
  return created(res, await withCourses(bundle.toObject(), { staff: true }));
});

const WRITABLE = ['title', 'summary', 'body', 'price', 'currency', 'accent', 'status'];

// PATCH /bundles/:id
export const update = asyncHandler(async (req, res) => {
  const bundle = await Bundle.findById(req.params.id);
  if (!bundle) throw ApiError.notFound('Bundle not found');

  sanitizeRichTextFields(req.body);
  if (req.body.title && req.body.title !== bundle.title) {
    bundle.slug = await uniqueSlug(Bundle, req.body.title, bundle._id);
  }
  WRITABLE.forEach((f) => {
    if (req.body[f] !== undefined) bundle[f] = req.body[f];
  });

  const courses = await normaliseCourses(req.body.courses);
  if (courses) bundle.courses = courses;

  await assertSellable(bundle);
  if (bundle.status === CONTENT_STATUS.PUBLISHED && !bundle.publishedAt) {
    bundle.publishedAt = new Date();
  }

  await bundle.save();
  recordAudit({
    req,
    action: 'bundle.update',
    entity: 'Bundle',
    entityId: bundle._id,
    summary: `Updated bundle "${bundle.title}"`,
  });
  return ok(res, await withCourses(bundle.toObject(), { staff: true }));
});

// DELETE /bundles/:id. Never touches the courses inside it — that is the whole
// point of a grouping.
export const remove = asyncHandler(async (req, res) => {
  const bundle = await Bundle.findById(req.params.id);
  if (!bundle) throw ApiError.notFound('Bundle not found');

  if (bundle.image?.key) {
    try {
      await deleteObject(bundle.image.key);
    } catch {
      /* ignore — an orphaned object is acceptable */
    }
  }

  await bundle.deleteOne();
  recordAudit({
    req,
    action: 'bundle.delete',
    entity: 'Bundle',
    entityId: bundle._id,
    summary: `Deleted bundle "${bundle.title}"`,
  });
  return noContent(res);
});

// POST /bundles/:id/image
export const uploadBundleImage = asyncHandler(async (req, res) => {
  const bundle = await Bundle.findById(req.params.id);
  if (!bundle) throw ApiError.notFound('Bundle not found');
  if (!req.file) throw ApiError.badRequest('File is required');

  const oldKey = bundle.image?.key;
  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'bundles',
    originalName: req.file.originalname,
  });
  bundle.image = { key, url };
  await bundle.save();

  // Deleted best-effort after the new one is stored, so a failed cleanup never
  // costs the admin the upload they just made.
  if (oldKey && oldKey !== key) {
    try {
      await deleteObject(oldKey);
    } catch {
      /* ignore */
    }
  }

  return ok(res, await withCourses(bundle.toObject(), { staff: true }));
});
