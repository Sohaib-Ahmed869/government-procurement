import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
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
  'linkedinUrl',
  'caseStudiesUrl',
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
// B7.8 — no longer held behind a feature flag. Whether the page is
// advertised is now the same "Site Navigation" toggle (be/src/constants/
// navPages.js, key 'find-a-bid-writer') every other nav page uses: turning it
// off removes the link, not the page or this endpoint. An anonymous caller
// only ever sees paid, active placements regardless — an empty directory (no
// placements marked active yet) is what "not ready" looks like now.
export const list = asyncHandler(async (req, res) => {
  const isStaff = Boolean(req.user);

  const filter = {};
  // Anonymous callers only ever see paid, active placements.
  if (!isStaff) filter.active = true;
  else if (req.query.active === 'true') filter.active = true;
  else if (req.query.active === 'false') filter.active = false;

  if (req.query.officeState) filter.officeState = req.query.officeState;
  if (req.query.category) filter.categories = req.query.category;

  const items = await BidWriter.find(filter)
    .collation({ locale: 'en' })
    // The editor's order decides the page, top to bottom. Tier only settles two
    // listings that share a number, and the name only settles those — see the
    // note on `order` in the model.
    .sort('order tierRank company');

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
  // A new listing goes to the BOTTOM unless someone said otherwise. The field
  // defaults to 0, which is first — so without this every listing added would
  // arrive at the top of the page and quietly push down the placements already
  // arranged there.
  if (req.body.order === undefined) {
    const last = await BidWriter.findOne().sort('-order').select('order').lean();
    writer.order = last ? (last.order ?? 0) + 1 : 0;
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

// PATCH /reorder — the whole ordered list of ids at once.
//
// One request for a whole arrangement rather than one per row: a nudge that
// swaps two listings changes two numbers, and sending them separately can leave
// the directory half-renumbered if the second call fails. The position IS the
// index in the array, so the sequence that arrives is the sequence that shows.
export const reorder = asyncHandler(async (req, res) => {
  const { order } = req.body; // array of listing ids, first on the page first
  if (!Array.isArray(order)) throw ApiError.badRequest('order must be an array of listing ids');

  await Promise.all(order.map((id, i) => BidWriter.updateOne({ _id: id }, { order: i })));

  recordAudit({
    req,
    action: 'bidWriter.reorder',
    entity: 'BidWriter',
    summary: `Reordered the bid writer directory (${order.length} listings)`,
  });
  return ok(res, { reordered: order.length });
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
