import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Video } from '../../models/Video.js';
import { uploadBuffer, deleteObject, presignPut } from '../../config/s3.js';
import { parseYouTubeId } from '../../utils/youtube.js';

// Videos are plain video files (mp4/webm) stored on S3. `video.file.url` is what
// the frontend <video> tag plays. This controller manages the metadata plus the
// two upload paths: presigned direct-to-S3 (large files) and server-proxied
// (smaller files via multer).

// Loads a video by id or 404s.
async function findVideoOr404(id) {
  const video = await Video.findById(id);
  if (!video) throw ApiError.notFound('Video not found');
  return video;
}

// Sets publishedAt the first time a video transitions to published.
function applyPublishedAt(video) {
  if (video.status === CONTENT_STATUS.PUBLISHED && !video.publishedAt) {
    video.publishedAt = new Date();
  }
}

// GET / — paginated list. Anonymous users see published only; staff (any signed
// -in user) see everything and may filter by status/category/featured/q.
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = {};

  const isStaff = Boolean(req.user);
  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
  } else {
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.featured !== undefined) filter.featured = req.query.featured === 'true';
  }
  if (req.query.q) filter.$text = { $search: req.query.q };

  const { items, meta } = await paginate(Video, filter, {
    page,
    limit,
    skip,
    sort: req.query.sort || '-createdAt',
  });
  return ok(res, items, meta);
});

// GET /slug/:slug — anonymous callers only see published videos.
export const getBySlug = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ slug: req.params.slug });
  if (!video) throw ApiError.notFound('Video not found');
  if (!req.user && video.status !== CONTENT_STATUS.PUBLISHED) {
    throw ApiError.notFound('Video not found');
  }
  return ok(res, video);
});

// GET /:id — anonymous callers only see published videos.
export const getById = asyncHandler(async (req, res) => {
  const video = await findVideoOr404(req.params.id);
  if (!req.user && video.status !== CONTENT_STATUS.PUBLISHED) {
    throw ApiError.notFound('Video not found');
  }
  return ok(res, video);
});

// POST / — create video metadata. The file may be attached now (via body) or
// later through the upload routes below.
export const create = asyncHandler(async (req, res) => {
  const { title, description, category, durationSeconds, featured, status, file, thumbnail, youtubeUrl } =
    req.body;
  if (!title) throw ApiError.badRequest('title is required');

  // A video is either an uploaded S3 file or a pasted YouTube link.
  let source = 'upload';
  let youtube;
  if (youtubeUrl) {
    const videoId = parseYouTubeId(youtubeUrl);
    if (!videoId) throw ApiError.badRequest('That does not look like a valid YouTube link');
    source = 'youtube';
    youtube = { url: youtubeUrl, videoId };
  }

  const slug = await uniqueSlug(Video, title);
  const video = await Video.create({
    title,
    slug,
    description,
    category: category || undefined,
    durationSeconds,
    featured,
    status,
    source,
    youtube,
    file,
    thumbnail,
  });
  applyPublishedAt(video);
  if (video.isModified()) await video.save();

  recordAudit({
    req,
    action: 'video.create',
    entity: 'Video',
    entityId: video._id,
    summary: `Created video "${video.title}"`,
  });
  return created(res, video);
});

// POST /upload-url — returns a presigned PUT so the browser can upload a large
// video straight to S3, bypassing this server. The client then PATCHes the
// video with the returned key/url.
export const getUploadUrl = asyncHandler(async (req, res) => {
  const { filename, mimeType } = req.body;
  if (!filename || !mimeType) {
    throw ApiError.badRequest('filename and mimeType are required');
  }
  const presigned = await presignPut({ folder: 'videos', originalName: filename, mimeType });
  return ok(res, presigned);
});

// POST /:id/file — server-side upload path for smaller files. Streams the buffer
// to S3 and points video.file at it, deleting any previous object best-effort.
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');
  const video = await findVideoOr404(req.params.id);

  const oldKey = video.file?.key;
  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'videos',
    originalName: req.file.originalname,
  });

  video.file = { key, url, sizeBytes: req.file.size, mimeType: req.file.mimetype };
  await video.save();

  // Best-effort cleanup of the replaced object.
  if (oldKey && oldKey !== key) await deleteObject(oldKey).catch(() => {});

  recordAudit({
    req,
    action: 'video.update',
    entity: 'Video',
    entityId: video._id,
    summary: `Uploaded file for video "${video.title}"`,
  });
  return ok(res, video);
});

// POST /:id/thumbnail — uploads a poster image to S3 and points video.thumbnail
// at it, deleting any previous poster best-effort.
export const uploadThumbnail = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');
  const video = await findVideoOr404(req.params.id);

  const oldKey = video.thumbnail?.key;
  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'videos/thumbnails',
    originalName: req.file.originalname,
  });

  video.thumbnail = { key, url };
  await video.save();

  if (oldKey && oldKey !== key) await deleteObject(oldKey).catch(() => {});

  recordAudit({
    req,
    action: 'video.update',
    entity: 'Video',
    entityId: video._id,
    summary: `Updated thumbnail for video "${video.title}"`,
  });
  return ok(res, video);
});

// PATCH /:id — update metadata. Also allows setting file/thumbnail/durationSeconds
// from the body (used after a presigned direct-to-S3 upload).
export const update = asyncHandler(async (req, res) => {
  const video = await findVideoOr404(req.params.id);
  const { title, description, category, durationSeconds, featured, status, file, thumbnail, youtubeUrl } =
    req.body;

  if (title !== undefined && title !== video.title) {
    video.title = title;
    video.slug = await uniqueSlug(Video, title, video._id);
  }
  if (description !== undefined) video.description = description;
  if (category !== undefined) video.category = category || undefined;
  if (durationSeconds !== undefined) video.durationSeconds = durationSeconds;
  if (featured !== undefined) video.featured = featured;
  if (status !== undefined) video.status = status;
  if (file !== undefined) video.file = file;
  if (thumbnail !== undefined) video.thumbnail = thumbnail;

  // Switch to / update a YouTube link. Passing an empty string clears it and
  // reverts the video to an upload source.
  if (youtubeUrl !== undefined) {
    if (youtubeUrl) {
      const videoId = parseYouTubeId(youtubeUrl);
      if (!videoId) throw ApiError.badRequest('That does not look like a valid YouTube link');
      video.source = 'youtube';
      video.youtube = { url: youtubeUrl, videoId };
    } else {
      video.source = 'upload';
      video.youtube = { url: '', videoId: '' };
    }
  }

  applyPublishedAt(video);
  await video.save();

  recordAudit({
    req,
    action: 'video.update',
    entity: 'Video',
    entityId: video._id,
    summary: `Updated video "${video.title}"`,
  });
  return ok(res, video);
});

// DELETE /:id — removes the record and best-effort deletes its S3 objects.
export const remove = asyncHandler(async (req, res) => {
  const video = await findVideoOr404(req.params.id);

  if (video.file?.key) await deleteObject(video.file.key).catch(() => {});
  if (video.thumbnail?.key) await deleteObject(video.thumbnail.key).catch(() => {});

  await video.deleteOne();

  recordAudit({
    req,
    action: 'video.delete',
    entity: 'Video',
    entityId: video._id,
    summary: `Deleted video "${video.title}"`,
  });
  return noContent(res);
});
