import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Media } from '../../models/Media.js';
import { uploadBuffer, deleteObject } from '../../config/s3.js';

// Media library (SF-04): a catalogue of every asset uploaded to S3 so it can be
// browsed and reused across content. All endpoints require authentication; only
// content roles may write.

// Derives the Media `kind` from a mimetype. uploadMedia's fileFilter already
// restricts to these three families, so the fall-through is purely defensive.
function kindFromMime(mime) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'document';
  throw ApiError.badRequest(`Unsupported file type: ${mime}`);
}

// GET / — paginated list, filterable by kind/folder/q (text search).
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = {};
  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.folder) filter.folder = req.query.folder;
  if (req.query.q) filter.$text = { $search: req.query.q };

  const { items, meta } = await paginate(Media, filter, {
    page,
    limit,
    skip,
    sort: req.query.sort || '-createdAt',
  });
  return ok(res, items, meta);
});

// POST / — upload a file to S3 and catalogue it. Folder comes from the body
// (default 'general'); kind is derived from the mimetype.
export const create = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');

  const folder = req.body.folder || 'general';
  const kind = kindFromMime(req.file.mimetype);
  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder,
    originalName: req.file.originalname,
  });

  const media = await Media.create({
    filename: req.file.originalname,
    key,
    url,
    kind,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    folder,
    uploadedBy: req.user._id,
  });

  recordAudit({
    req,
    action: 'media.create',
    entity: 'Media',
    entityId: media._id,
    summary: `Uploaded ${kind} "${media.filename}"`,
  });
  return created(res, media);
});

// GET /:id — a single media asset.
export const getById = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) throw ApiError.notFound('Media not found');
  return ok(res, media);
});

// PATCH /:id — only alt text and folder may be edited.
export const update = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) throw ApiError.notFound('Media not found');

  if (req.body.alt !== undefined) media.alt = req.body.alt;
  if (req.body.folder !== undefined) media.folder = req.body.folder;
  await media.save();

  return ok(res, media);
});

// DELETE /:id — best-effort remove the S3 object, then delete the record.
export const remove = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) throw ApiError.notFound('Media not found');

  if (media.key) await deleteObject(media.key).catch(() => {});
  await media.deleteOne();

  recordAudit({
    req,
    action: 'media.delete',
    entity: 'Media',
    entityId: media._id,
    summary: `Deleted ${media.kind} "${media.filename}"`,
  });
  return noContent(res);
});
