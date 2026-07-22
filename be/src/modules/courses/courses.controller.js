import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { uniqueSlug } from '../../utils/slugify.js';
import {
  CONTENT_STATUS,
  COURSE_STATES,
  COURSE_RESOURCE_TYPES,
  COURSE_SEGMENTS,
  COURSE_LEVELS,
} from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { uploadBuffer, deleteObject } from '../../config/s3.js';
import { parseYouTubeId } from '../../utils/youtube.js';
import { Course } from '../../models/Course.js';

// Derives a course-media `kind` from an uploaded file's mimetype. uploadMedia's
// fileFilter already restricts to image/video/pdf, so the throw is defensive.
function mediaKindFromMime(mime) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  throw ApiError.badRequest(`Unsupported file type: ${mime}`);
}

// Public content module: anonymous users see only published courses, while
// signed-in staff (optionalAuth attaches req.user) can list everything and use
// the admin filters.
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = {};
  const isStaff = Boolean(req.user);

  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }

  // Admin-facing filters (also harmless for anonymous, but only staff sees drafts).
  if (req.query.availability) filter.availability = req.query.availability;
  if (req.query.featured !== undefined) filter.featured = req.query.featured === 'true';
  if (req.query.category) filter.category = req.query.category;
  // Public /courses side filters.
  if (req.query.resourceType) filter.resourceType = req.query.resourceType;
  if (req.query.segment) filter.segment = req.query.segment;
  if (req.query.level) filter.level = req.query.level;
  if (req.query.q) filter.$text = { $search: req.query.q };

  const { items, meta } = await paginate(Course, filter, {
    page,
    limit,
    skip,
    sort: req.query.sort || '-createdAt',
  });
  return ok(res, items, meta);
});

export const getBySlug = asyncHandler(async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug });
  if (!course) throw ApiError.notFound('Course not found');
  // Anonymous users may only see published courses.
  if (!req.user && course.status !== CONTENT_STATUS.PUBLISHED) {
    throw ApiError.notFound('Course not found');
  }
  return ok(res, course);
});

export const getById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');
  if (!req.user && course.status !== CONTENT_STATUS.PUBLISHED) {
    throw ApiError.notFound('Course not found');
  }
  return ok(res, course);
});

// Reject unknown enum values with a clear 400 before they reach Mongoose.
function assertTaxonomy(body) {
  const checks = [
    ['availability', COURSE_STATES],
    ['resourceType', COURSE_RESOURCE_TYPES],
    ['segment', COURSE_SEGMENTS],
    ['level', COURSE_LEVELS],
  ];
  for (const [field, allowed] of checks) {
    if (body[field] && !allowed.includes(body[field])) {
      throw ApiError.badRequest(`${field} must be one of: ${allowed.join(', ')}`);
    }
  }
}

export const create = asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title) throw ApiError.badRequest('title is required');
  assertTaxonomy(req.body);

  const slug = await uniqueSlug(Course, title);
  const data = { ...req.body, slug };
  // Stamp publishedAt the moment a course goes live.
  if (data.status === CONTENT_STATUS.PUBLISHED && !data.publishedAt) {
    data.publishedAt = new Date();
  }

  const course = await Course.create(data);
  recordAudit({
    req,
    action: 'course.create',
    entity: 'Course',
    entityId: course._id,
    summary: `Created course "${course.title}"`,
  });
  return created(res, course);
});

export const update = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');

  assertTaxonomy(req.body);

  // Re-slug only when the title changes, keeping the course's own slug free.
  if (req.body.title && req.body.title !== course.title) {
    course.slug = await uniqueSlug(Course, req.body.title, course._id);
  }

  const fields = [
    'title',
    'summary',
    'body',
    'category',
    'resourceType',
    'segment',
    'level',
    'durationLabel',
    'availability',
    'startDate',
    'featured',
    'status',
  ];
  for (const f of fields) {
    if (req.body[f] !== undefined) course[f] = req.body[f];
  }

  if (course.status === CONTENT_STATUS.PUBLISHED && !course.publishedAt) {
    course.publishedAt = new Date();
  }

  await course.save();
  recordAudit({
    req,
    action: 'course.update',
    entity: 'Course',
    entityId: course._id,
    summary: `Updated course "${course.title}"`,
  });
  return ok(res, course);
});

export const remove = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');

  // Best-effort cleanup of the owned S3 objects: hero image + any uploaded media.
  const keys = [course.image?.key, ...(course.media || []).map((m) => m.key)].filter(Boolean);
  for (const key of keys) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await deleteObject(key);
    } catch {
      /* ignore — orphaned object is acceptable */
    }
  }

  await course.deleteOne();
  recordAudit({
    req,
    action: 'course.delete',
    entity: 'Course',
    entityId: course._id,
    summary: `Deleted course "${course.title}"`,
  });
  return noContent(res);
});

export const uploadCourseImage = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');
  if (!req.file) throw ApiError.badRequest('File is required');

  const oldKey = course.image?.key;
  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'courses',
    originalName: req.file.originalname,
  });
  course.image = { key, url };
  await course.save();

  // Delete the previous image best-effort after the new one is stored.
  if (oldKey && oldKey !== key) {
    try {
      await deleteObject(oldKey);
    } catch {
      /* ignore */
    }
  }

  recordAudit({
    req,
    action: 'course.image',
    entity: 'Course',
    entityId: course._id,
    summary: `Updated image for course "${course.title}"`,
  });
  return ok(res, course);
});

// POST /:id/media — attach an uploaded file (video / pdf / image) to a course.
export const addCourseMedia = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');
  if (!req.file) throw ApiError.badRequest('File is required');

  const kind = mediaKindFromMime(req.file.mimetype);
  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'courses/media',
    originalName: req.file.originalname,
  });

  course.media.push({
    kind,
    title: req.body.title?.trim() || req.file.originalname || '',
    key,
    url,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size || 0,
    order: course.media.length,
  });
  await course.save();

  recordAudit({
    req,
    action: 'course.media.add',
    entity: 'Course',
    entityId: course._id,
    summary: `Added ${kind} to course "${course.title}"`,
  });
  return created(res, course);
});

// POST /:id/media/link — attach a YouTube link to a course.
export const addCourseMediaLink = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');

  const youtubeId = parseYouTubeId(req.body.url);
  if (!youtubeId) throw ApiError.badRequest('A valid YouTube URL is required');

  course.media.push({
    kind: 'youtube',
    title: req.body.title?.trim() || '',
    youtubeUrl: String(req.body.url).trim(),
    youtubeId,
    order: course.media.length,
  });
  await course.save();

  recordAudit({
    req,
    action: 'course.media.add',
    entity: 'Course',
    entityId: course._id,
    summary: `Added YouTube link to course "${course.title}"`,
  });
  return created(res, course);
});

// DELETE /:id/media/:mediaId — remove one attached media item (and its S3 file).
export const removeCourseMedia = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');

  const item = course.media.id(req.params.mediaId);
  if (!item) throw ApiError.notFound('Media item not found');

  const { key } = item;
  item.deleteOne();
  await course.save();

  if (key) {
    try {
      await deleteObject(key);
    } catch {
      /* ignore — orphaned object is acceptable */
    }
  }

  recordAudit({
    req,
    action: 'course.media.remove',
    entity: 'Course',
    entityId: course._id,
    summary: `Removed media from course "${course.title}"`,
  });
  return ok(res, course);
});
