import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { env } from '../../config/env.js';
import { recordAudit } from '../../models/AuditLog.js';
import { uploadBuffer, deleteObject } from '../../config/s3.js';
import {
  BidWriter,
  BID_WRITER_CATEGORIES,
  BID_WRITER_STATES,
  PLACEMENT_TIERS,
} from '../../models/BidWriter.js';

const EDITABLE = [
  'company',
  'contactName',
  'contactEmail',
  'contactPhone',
  'website',
  'officeState',
  'officeCity',
  'categories',
  'blurb',
  'placementTier',
  'active',
  'notes',
  'order',
];

function validate(body, { partial = false } = {}) {
  if (!partial || body.officeState !== undefined) {
    if (!BID_WRITER_STATES.includes(body.officeState)) {
      throw ApiError.badRequest(`officeState must be one of: ${BID_WRITER_STATES.join(', ')}`);
    }
  }
  if (body.placementTier !== undefined && !PLACEMENT_TIERS.includes(body.placementTier)) {
    throw ApiError.badRequest(`placementTier must be one of: ${PLACEMENT_TIERS.join(', ')}`);
  }
  if (body.categories !== undefined) {
    if (!Array.isArray(body.categories)) throw ApiError.badRequest('categories must be a list');
    const bad = body.categories.filter((c) => !BID_WRITER_CATEGORIES.includes(c));
    if (bad.length) {
      throw ApiError.badRequest(
        `unknown categories: ${bad.join(', ')}. Allowed: ${BID_WRITER_CATEGORIES.join(', ')}`,
      );
    }
  }
  if (!partial && !body.company) throw ApiError.badRequest('company is required');
}

// GET / — the public directory.
//
// B7.8 — held from production. With the flag off this endpoint does not exist
// as far as an anonymous caller is concerned: a 404, not an empty list, because
// an empty list still tells you the feature is coming.
//
// Staff keep access at every flag setting so the directory can be built and
// checked from the CMS before anything is switched on.
export const list = asyncHandler(async (req, res) => {
  const isStaff = Boolean(req.user);

  if (!isStaff && env.features.bidWriters === 'off') {
    throw ApiError.notFound('Not found');
  }

  const filter = {};
  // Anonymous callers only ever see paid, active placements.
  if (!isStaff) filter.active = true;
  else if (req.query.active === 'true') filter.active = true;
  else if (req.query.active === 'false') filter.active = false;

  if (req.query.officeState) filter.officeState = req.query.officeState;
  if (req.query.category) filter.categories = req.query.category;

  const items = await BidWriter.find(filter)
    .collation({ locale: 'en' })
    // Featured first, by explicit rank rather than by tier name — see TIER_RANK.
    .sort('tierRank order company');

  if (isStaff) return ok(res, items);

  // `notes` is internal. Stripped rather than trusted not to be read.
  return ok(
    res,
    items.map((b) => {
      const plain = b.toObject();
      delete plain.notes;
      return plain;
    }),
  );
});

export const create = asyncHandler(async (req, res) => {
  validate(req.body);

  const writer = new BidWriter();
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) writer[field] = req.body[field];
  }
  await writer.save();

  recordAudit({
    req,
    action: 'bidWriter.create',
    entity: 'BidWriter',
    entityId: writer._id,
    summary: `Created bid writer listing "${writer.company}"`,
  });
  return created(res, writer);
});

export const update = asyncHandler(async (req, res) => {
  const writer = await BidWriter.findById(req.params.id);
  if (!writer) throw ApiError.notFound('Listing not found');
  validate(req.body, { partial: true });

  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) writer[field] = req.body[field];
  }
  await writer.save();

  recordAudit({
    req,
    action: 'bidWriter.update',
    entity: 'BidWriter',
    entityId: writer._id,
    summary: `Updated bid writer listing "${writer.company}" (${writer.active ? 'active' : 'inactive'})`,
  });
  return ok(res, writer);
});

export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');

  const writer = await BidWriter.findById(req.params.id);
  if (!writer) throw ApiError.notFound('Listing not found');

  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'bid-writers',
    originalName: req.file.originalname,
  });

  const oldKey = writer.logo?.key;
  writer.logo = { key, url };
  await writer.save();
  if (oldKey && oldKey !== key) deleteObject(oldKey).catch(() => {});

  recordAudit({
    req,
    action: 'bidWriter.update',
    entity: 'BidWriter',
    entityId: writer._id,
    summary: `Updated logo for "${writer.company}"`,
  });
  return ok(res, writer);
});

export const remove = asyncHandler(async (req, res) => {
  const writer = await BidWriter.findById(req.params.id);
  if (!writer) throw ApiError.notFound('Listing not found');

  const key = writer.logo?.key;
  await writer.deleteOne();
  if (key) deleteObject(key).catch(() => {});

  recordAudit({
    req,
    action: 'bidWriter.delete',
    entity: 'BidWriter',
    entityId: writer._id,
    summary: `Deleted bid writer listing "${writer.company}"`,
  });
  return noContent(res);
});
