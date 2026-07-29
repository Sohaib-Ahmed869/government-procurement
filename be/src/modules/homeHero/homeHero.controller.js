import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { HomeHero } from '../../models/HomeHero.js';

const AUDIENCES = ['win', 'award'];
const EDITABLE = ['eyebrow', 'heading', 'subheading'];

// GET / — PUBLIC. Both segments in one call, so the homepage can switch between
// them on the toggle without a second request. Missing documents come back as
// empty strings; the page falls back to its built-in copy for those.
export const list = asyncHandler(async (_req, res) => {
  const docs = await HomeHero.find({});
  const byAudience = Object.fromEntries(
    AUDIENCES.map((audience) => {
      const found = docs.find((d) => d.audience === audience);
      return [
        audience,
        {
          eyebrow: found?.eyebrow || '',
          heading: found?.heading || '',
          subheading: found?.subheading || '',
        },
      ];
    }),
  );
  return ok(res, byAudience);
});

// PATCH /:audience — upsert the copy for one segment.
export const save = asyncHandler(async (req, res) => {
  const { audience } = req.params;
  if (!AUDIENCES.includes(audience)) {
    throw ApiError.badRequest(`audience must be one of: ${AUDIENCES.join(', ')}`);
  }

  const update = {};
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }

  const doc = await HomeHero.findOneAndUpdate(
    { audience },
    { $set: update, $setOnInsert: { audience } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  recordAudit({
    req,
    action: 'homeHero.update',
    entity: 'HomeHero',
    entityId: doc._id,
    summary: `Updated homepage hero copy for "${audience}"`,
  });
  return ok(res, doc);
});
