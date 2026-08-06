import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { CapabilitiesHero } from '../../models/CapabilitiesHero.js';

const AUDIENCES = ['win', 'award'];
const EDITABLE = ['eyebrow', 'heading', 'subheading'];

// The copy the page shipped with, and what it shows until someone writes
// something else. It lives here rather than in the frontend for two reasons:
// the page is never blank on a database that has no row for it yet, and the
// browser only ever paints one version of the copy — the built-in wording can't
// flash on screen ahead of the saved wording, because the client never sees it
// as a separate thing.
//
// `subheading` has no default: the hero never carried one. The field is there
// for whoever wants to add it, and stays off the page until they do.
const DEFAULT_COPY = {
  win: {
    eyebrow: 'Win Government Contracts',
    heading: 'Our Capabilities',
    subheading: '',
  },
  award: {
    eyebrow: 'Award Government Contracts',
    heading: 'Our Capabilities',
    subheading: '',
  },
};

// GET / — PUBLIC. Both segments in one call, so the page can switch between them
// on the toggle without a second request. A field nobody has written falls back
// to the default above — including for the CMS editor, which reads this same
// endpoint and so opens showing the copy that is actually live.
export const list = asyncHandler(async (_req, res) => {
  const docs = await CapabilitiesHero.find({});
  const byAudience = Object.fromEntries(
    AUDIENCES.map((audience) => {
      const found = docs.find((d) => d.audience === audience);
      const fallback = DEFAULT_COPY[audience];
      return [
        audience,
        {
          eyebrow: found?.eyebrow || fallback.eyebrow,
          heading: found?.heading || fallback.heading,
          subheading: found?.subheading || fallback.subheading,
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

  const doc = await CapabilitiesHero.findOneAndUpdate(
    { audience },
    { $set: update, $setOnInsert: { audience } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  recordAudit({
    req,
    action: 'capabilitiesHero.update',
    entity: 'CapabilitiesHero',
    entityId: doc._id,
    summary: `Updated Capabilities hero copy for "${audience}"`,
  });
  return ok(res, doc);
});
