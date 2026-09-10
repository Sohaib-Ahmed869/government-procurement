import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { TenderSite, TENDER_SITE_GROUPS } from '../../models/TenderSite.js';
import { uploadBuffer, deleteObject } from '../../config/s3.js';

const EDITABLE = [
  'name',
  'subtitle',
  'group',
  'loginRequired',
  'openTendersUrl',
  'upcomingTendersUrl',
  'createAccountUrl',
  'loginUrl',
  'note',
  'active',
];

function pickEditable(body) {
  const out = {};
  for (const field of EDITABLE) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  // An unknown group would be rejected by the schema enum on save; drop it here
  // so a stray value falls back to the default section instead of erroring.
  if (out.group !== undefined && !TENDER_SITE_GROUPS.includes(out.group)) {
    delete out.group;
  }
  return out;
}

// GET / — PUBLIC list of tender portals. Anonymous callers only see active
// entries; staff (optionalAuth) can pass ?all=1 to include inactive ones.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);
  if (!(isStaff && req.query.all === '1')) filter.active = true;

  // Alphabetical by name, within whichever section the entry belongs to. The
  // page used to render whatever hand-kept `order` number the CMS carried,
  // which meant every new portal needed a number picked for it and the list
  // drifted out of order as soon as one was missed. A name sort needs nothing
  // maintained and is the order a visitor scanning for their jurisdiction
  // expects. Collation strength 1 so "eTender" files next to "Etender" rather
  // than after every capitalised name.
  const items = await TenderSite.find(filter)
    .collation({ locale: 'en', strength: 1 })
    .sort('name');
  return ok(res, items);
});

// POST / — create a portal.
export const create = asyncHandler(async (req, res) => {
  const body = pickEditable(req.body);
  if (!body.name) throw ApiError.badRequest('Name is required');

  const site = await TenderSite.create(body);
  recordAudit({
    req,
    action: 'tenderSite.create',
    entity: 'TenderSite',
    entityId: site._id,
    summary: `Created tender site "${site.name}"`,
  });
  return created(res, site);
});

// PATCH /:id — update a portal.
export const update = asyncHandler(async (req, res) => {
  const site = await TenderSite.findById(req.params.id);
  if (!site) throw ApiError.notFound('Tender site not found');

  Object.assign(site, pickEditable(req.body));
  await site.save();

  recordAudit({
    req,
    action: 'tenderSite.update',
    entity: 'TenderSite',
    entityId: site._id,
    summary: `Updated tender site "${site.name}"`,
  });
  return ok(res, site);
});

// POST /:id/logo — replace the portal's logo, cleaning up the old object.
export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');

  const site = await TenderSite.findById(req.params.id);
  if (!site) throw ApiError.notFound('Tender site not found');

  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'tender-sites',
    originalName: req.file.originalname,
  });

  const oldKey = site.logo?.key;
  site.logo = { key, url };
  await site.save();

  if (oldKey && oldKey !== key) {
    // Best-effort cleanup — never fail the request over a stale object.
    deleteObject(oldKey).catch(() => {});
  }

  recordAudit({
    req,
    action: 'tenderSite.update',
    entity: 'TenderSite',
    entityId: site._id,
    summary: `Updated the logo for "${site.name}"`,
  });
  return ok(res, site);
});

// DELETE /:id — remove a portal, and its logo with it.
export const remove = asyncHandler(async (req, res) => {
  const site = await TenderSite.findById(req.params.id);
  if (!site) throw ApiError.notFound('Tender site not found');

  await site.deleteOne();
  if (site.logo?.key) deleteObject(site.logo.key).catch(() => {});

  recordAudit({
    req,
    action: 'tenderSite.delete',
    entity: 'TenderSite',
    entityId: site._id,
    summary: `Deleted tender site "${site.name}"`,
  });
  return noContent(res);
});
