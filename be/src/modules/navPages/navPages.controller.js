import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { NavVisibility } from '../../models/NavVisibility.js';
import { NAV_PAGES, NAV_PAGE_KEYS } from '../../constants/navPages.js';

// GET / — PUBLIC. The fixed registry merged with any stored overrides, so the
// header and footer can filter their nav by it without authenticating. A page
// with no row is visible — same "missing row means the shipped default" rule
// Link uses, and for the same reason: most pages are never touched.
export const list = asyncHandler(async (req, res) => {
  const overrides = await NavVisibility.find({ key: { $in: NAV_PAGE_KEYS } }).lean();
  const byKey = new Map(overrides.map((o) => [o.key, o.visible]));

  const pages = NAV_PAGES.map((p) => ({
    ...p,
    visible: byKey.has(p.key) ? byKey.get(p.key) : true,
  }));
  return ok(res, pages);
});

// PATCH /:key — show or hide one page's nav entry. `key` is one of the fixed
// registry entries above, not a database id — there is nothing to create or
// delete here, only an existing page's link to switch on or off.
export const setVisible = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const page = NAV_PAGES.find((p) => p.key === key);
  if (!page) throw ApiError.notFound('No such nav page');

  if (typeof req.body.visible !== 'boolean') {
    throw ApiError.badRequest('visible must be true or false', { visible: 'required' });
  }

  const doc = await NavVisibility.findOneAndUpdate(
    { key },
    { visible: req.body.visible },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  recordAudit({
    req,
    action: 'navPage.setVisible',
    entity: 'NavVisibility',
    entityId: doc._id,
    summary: `${doc.visible ? 'Showed' : 'Hid'} "${page.label}" in the site nav`,
  });

  return ok(res, { ...page, visible: doc.visible });
});
