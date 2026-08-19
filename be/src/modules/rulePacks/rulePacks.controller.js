import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { RulePack } from '../../models/RulePack.js';

const EDITABLE = ['jurisdiction', 'version', 'asAt', 'changeNote', 'thresholds', 'sources'];

function pickEditable(body) {
  const out = {};
  for (const field of EDITABLE) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

// GET /active/:jurisdiction — PUBLIC. What the site merges over the built-in
// pack. Returns null rather than 404 when nothing is published: the built-in
// pack is complete on its own, so "no overlay" is a normal state, not an error.
export const active = asyncHandler(async (req, res) => {
  const pack = await RulePack.findOne({
    jurisdiction: req.params.jurisdiction,
    active: true,
  }).select('jurisdiction version asAt thresholds sources');
  return ok(res, pack);
});

// GET / — every version, newest first. Staff only.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.jurisdiction) filter.jurisdiction = req.query.jurisdiction;
  const items = await RulePack.find(filter).sort('-createdAt');
  return ok(res, items);
});

export const create = asyncHandler(async (req, res) => {
  const body = pickEditable(req.body);
  if (!body.jurisdiction) throw ApiError.badRequest('Jurisdiction is required');
  if (!body.version) throw ApiError.badRequest('Version is required');

  const pack = await RulePack.create(body);
  recordAudit({
    req,
    action: 'rulepack.create',
    entity: 'RulePack',
    entityId: pack._id,
    summary: `Created ${pack.jurisdiction.toUpperCase()} rule version ${pack.version}`,
  });
  return created(res, pack);
});

export const update = asyncHandler(async (req, res) => {
  const pack = await RulePack.findById(req.params.id);
  if (!pack) throw ApiError.notFound('Rule version not found');

  Object.assign(pack, pickEditable(req.body));
  await pack.save();

  recordAudit({
    req,
    action: 'rulepack.update',
    entity: 'RulePack',
    entityId: pack._id,
    summary: `Updated ${pack.jurisdiction.toUpperCase()} rule version ${pack.version}`,
  });
  return ok(res, pack);
});

// POST /:id/publish — make this the active version for its jurisdiction.
//
// The clear-then-set is two writes rather than one, so a failure between them
// could leave a jurisdiction with no active version. That is the safe direction
// to fail: the site falls back to its built-in pack, which is complete. The
// alternative order could leave two active and make the served overlay depend
// on document order.
export const publish = asyncHandler(async (req, res) => {
  const pack = await RulePack.findById(req.params.id);
  if (!pack) throw ApiError.notFound('Rule version not found');

  await RulePack.updateMany(
    { jurisdiction: pack.jurisdiction, _id: { $ne: pack._id } },
    { $set: { active: false } },
  );
  pack.active = true;
  await pack.save();

  recordAudit({
    req,
    action: 'rulepack.publish',
    entity: 'RulePack',
    entityId: pack._id,
    summary: `Published ${pack.jurisdiction.toUpperCase()} rule version ${pack.version}`,
  });
  return ok(res, pack);
});

export const remove = asyncHandler(async (req, res) => {
  const pack = await RulePack.findById(req.params.id);
  if (!pack) throw ApiError.notFound('Rule version not found');
  if (pack.active) {
    throw ApiError.badRequest(
      'This is the published version. Publish another version before deleting it.',
    );
  }

  await pack.deleteOne();
  recordAudit({
    req,
    action: 'rulepack.delete',
    entity: 'RulePack',
    entityId: pack._id,
    summary: `Deleted ${pack.jurisdiction.toUpperCase()} rule version ${pack.version}`,
  });
  return noContent(res);
});
