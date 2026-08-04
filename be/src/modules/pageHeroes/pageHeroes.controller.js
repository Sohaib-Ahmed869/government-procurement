import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { PageHero, HERO_PAGES } from '../../models/PageHero.js';

const AUDIENCES = ['win', 'award'];
const EDITABLE = ['eyebrow', 'heading', 'subheading'];

function assertPage(page) {
  if (!HERO_PAGES.includes(page)) {
    throw ApiError.badRequest(`page must be one of: ${HERO_PAGES.join(', ')}`);
  }
}

// GET /:page — PUBLIC. Both segments in one call, so a page can switch between
// them on the toggle without a second request. Missing documents come back as
// empty strings; the page falls back to its built-in copy for those.
export const list = asyncHandler(async (req, res) => {
  const { page } = req.params;
  assertPage(page);

  const docs = await PageHero.find({ page });
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

// PATCH /:page/:audience — upsert the copy for one page + segment.
export const save = asyncHandler(async (req, res) => {
  const { page, audience } = req.params;
  assertPage(page);
  if (!AUDIENCES.includes(audience)) {
    throw ApiError.badRequest(`audience must be one of: ${AUDIENCES.join(', ')}`);
  }

  const update = {};
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }

  const doc = await PageHero.findOneAndUpdate(
    { page, audience },
    { $set: update, $setOnInsert: { page, audience } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  recordAudit({
    req,
    action: 'pageHero.update',
    entity: 'PageHero',
    entityId: doc._id,
    summary: `Updated ${page} hero copy for "${audience}"`,
  });
  return ok(res, doc);
});
