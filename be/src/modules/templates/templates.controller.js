import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { uploadBuffer, deleteObject, getObject } from '../../config/s3.js';
import {
  Template,
  TEMPLATE_CATEGORIES,
  TEMPLATE_FORMATS,
  FORMAT_MEDIA,
} from '../../models/Template.js';

const EDITABLE = [
  'title',
  'description',
  'category',
  'useCase',
  'useCaseOrder',
  'format',
  'source',
  'sourceUrl',
  'licence',
  'order',
  'status',
];

function validate(body, { partial = false } = {}) {
  const oneOf = (field, values) => {
    if (partial && body[field] === undefined) return;
    if (!values.includes(body[field])) {
      throw ApiError.badRequest(`${field} must be one of: ${values.join(', ')}`);
    }
  };
  oneOf('category', TEMPLATE_CATEGORIES);
  oneOf('format', TEMPLATE_FORMATS);

  const missing = (f) => (partial ? body[f] !== undefined && !String(body[f]).trim() : !body[f]);
  if (missing('title')) throw ApiError.badRequest('title is required');
  if (missing('useCase')) throw ApiError.badRequest('useCase is required');
}

// GET / — public list. Anonymous callers see published documents only.
//
// `file.key` is stripped for anonymous callers: the download goes through
// /templates/:id/download, which is what counts the tally and names the file.
// Handing out the raw storage key would route around both.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);

  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.format) filter.format = req.query.format;
  if (req.query.useCase) filter.useCase = req.query.useCase;

  const items = await Template.find(filter)
    .collation({ locale: 'en' })
    .sort('category useCaseOrder useCase order title');

  if (isStaff) return ok(res, items);

  return ok(
    res,
    items.map((t) => {
      const plain = t.toObject();
      plain.file = {
        // Kept: the page shows the format and the size before you commit to a
        // download. Dropped: the key and the direct URL.
        name: plain.file?.name || '',
        size: plain.file?.size || 0,
      };
      return plain;
    }),
  );
});

// POST / — create. Always lands as a draft: the gate below decides when it can
// be anything else.
export const create = asyncHandler(async (req, res) => {
  validate(req.body);

  const template = new Template();
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) template[field] = req.body[field];
  }
  // A new record has no file yet, so it cannot be published whatever was asked
  // for. Set explicitly rather than left to the schema default so the intent is
  // visible here too.
  template.status = CONTENT_STATUS.DRAFT;
  await template.save();

  recordAudit({
    req,
    action: 'template.create',
    entity: 'Template',
    entityId: template._id,
    summary: `Created template "${template.title}" (draft)`,
  });
  return created(res, template);
});

// PATCH /:id — update, including the publish attempt.
export const update = asyncHandler(async (req, res) => {
  const template = await Template.findById(req.params.id);
  if (!template) throw ApiError.notFound('Template not found');
  validate(req.body, { partial: true });

  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) template[field] = req.body[field];
  }

  // B6.1 — the hard gate. Checked after the incoming fields are applied, so a
  // request that fills in the licence and publishes in one go is allowed, and
  // one that publishes without it is not.
  if (template.status === CONTENT_STATUS.PUBLISHED) {
    const blocker = template.publishBlocker();
    if (blocker) throw ApiError.badRequest(`Cannot publish: ${blocker}.`);
  }

  // Stamp the sign-off the moment a name is put to it, so the date is recorded
  // rather than typed.
  if (template.isModified('licence.confirmedBy')) {
    template.licence.confirmedAt = template.licence.confirmedBy ? new Date() : null;
  }

  await template.save();

  recordAudit({
    req,
    action: 'template.update',
    entity: 'Template',
    entityId: template._id,
    summary: `Updated template "${template.title}" (${template.status})`,
  });
  return ok(res, template);
});

// POST /:id/file — attach the document itself.
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');

  const template = await Template.findById(req.params.id);
  if (!template) throw ApiError.notFound('Template not found');

  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'templates',
    originalName: req.file.originalname,
  });

  const oldKey = template.file?.key;
  template.file = {
    key,
    url,
    // The name the visitor will receive. Taken from the upload rather than from
    // the title, because the extension has to match the actual bytes.
    name: req.file.originalname,
    size: req.file.size,
    mime: req.file.mimetype,
  };
  await template.save();

  if (oldKey && oldKey !== key) deleteObject(oldKey).catch(() => {});

  recordAudit({
    req,
    action: 'template.update',
    entity: 'Template',
    entityId: template._id,
    summary: `Uploaded document for template "${template.title}"`,
  });
  return ok(res, template);
});

// GET /:id/download — B6.4 and B6.8.
//
// Serves the original bytes with the format's own media type and a filename a
// visitor will recognise, and adds one to the tally. No conversion of any kind:
// the point of the library is a document that opens in Office and can be
// edited.
export const download = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (!req.user) filter.status = CONTENT_STATUS.PUBLISHED;

  const template = await Template.findOne(filter);
  if (!template || !template.file?.key) throw ApiError.notFound('Template not found');

  let out;
  try {
    out = await getObject(template.file.key);
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      throw ApiError.notFound('Template file not found');
    }
    throw err;
  }

  // What the file actually is, in order of trust: what was stored at upload,
  // then the format's canonical type. Never the S3 guess.
  const media = FORMAT_MEDIA[template.format];
  const mime = template.file.mime || media?.mime || 'application/octet-stream';

  // The name the browser saves it as. Falls back to the title plus the format's
  // extension where the original name was lost.
  const fallback = `${template.title}.${media?.ext || 'dat'}`;
  const filename = template.file.name || fallback;
  // Non-ASCII in a filename breaks the plain form of this header in older
  // clients, so both forms are sent: a stripped ASCII one and the RFC 5987
  // UTF-8 one that modern browsers prefer.
  const asciiName = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');

  res.setHeader('Content-Type', mime);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  if (out.ContentLength !== undefined) res.setHeader('Content-Length', out.ContentLength);
  // A template changes when we replace it, and the URL does not change with it,
  // so this must not be cached for a day the way an image key can be.
  res.setHeader('Cache-Control', 'no-cache');

  // Counted without waiting and without failing the download if it misses: a
  // tally is not worth costing somebody their file.
  Template.updateOne({ _id: template._id }, { $inc: { downloads: 1 } }).catch(() => {});

  out.Body.on('error', () => {
    if (!res.headersSent) res.status(500);
    res.end();
  });
  out.Body.pipe(res);
});

export const remove = asyncHandler(async (req, res) => {
  const template = await Template.findById(req.params.id);
  if (!template) throw ApiError.notFound('Template not found');

  const key = template.file?.key;
  await template.deleteOne();
  if (key) deleteObject(key).catch(() => {});

  recordAudit({
    req,
    action: 'template.delete',
    entity: 'Template',
    entityId: template._id,
    summary: `Deleted template "${template.title}"`,
  });
  return noContent(res);
});
