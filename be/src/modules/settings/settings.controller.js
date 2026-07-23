import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Setting } from '../../models/Setting.js';

// Recursively merge plain objects from `patch` into `target`. Arrays and scalar
// values replace wholesale (e.g. `redirects` is swapped, not merged elementwise).
function deepMerge(target, patch) {
  for (const [key, value] of Object.entries(patch || {})) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

// GET /public — PUBLIC. Only the public-safe subset the website needs; redirects
// (server-side routing config) are deliberately excluded.
export const getPublic = asyncHandler(async (req, res) => {
  const doc = await Setting.getSingleton();
  return ok(res, { seo: doc.seo, contact: doc.contact, analytics: doc.analytics, social: doc.social });
});

// GET / — admin only. The full settings document.
export const getAll = asyncHandler(async (req, res) => {
  const doc = await Setting.getSingleton();
  return ok(res, doc);
});

// PATCH / — admin only. Deep-merge the incoming seo/contact/analytics/redirects
// into the singleton so partial updates don't clobber untouched sections.
export const update = asyncHandler(async (req, res) => {
  const doc = await Setting.getSingleton();

  const { seo, contact, analytics, social, redirects } = req.body;
  deepMerge(doc, { seo, contact, analytics, social });
  if (redirects !== undefined) doc.redirects = redirects;

  // Nested Mixed/subdocument mutations can go undetected — mark them dirty.
  doc.markModified('seo');
  doc.markModified('contact');
  doc.markModified('analytics');
  doc.markModified('social');
  await doc.save();

  recordAudit({
    req,
    action: 'settings.update',
    entity: 'Setting',
    entityId: doc._id,
    summary: 'Updated site settings',
  });
  return ok(res, doc);
});
