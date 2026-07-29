import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { uploadBuffer, deleteObject } from '../../config/s3.js';
import { TeamMember } from '../../models/TeamMember.js';

// Fields a client may set directly. `slug` is derived from the name and `photo`
// only ever comes from the upload route, so neither is accepted here.
const EDITABLE = [
  'name',
  'role',
  'location',
  'email',
  'linkedin',
  'summary',
  'about',
  'expertise',
  'pastExperience',
  'education',
  'hasProfile',
  'order',
  'status',
];

// `about` and `expertise` arrive from the CMS as a textarea (one entry per
// line). Accept either that or a real array, and drop blank lines.
function toList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value || '')
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
}

// Past experience / education arrive as one entry per line, each "left | right"
// — "Unilever | Manager, procurement". A line with no separator keeps the whole
// text as the first field. Blank lines are dropped, so an empty box clears the
// list and the profile page hides that section.
function toPairs(value, leftKey, rightKey) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => ({
        [leftKey]: String(entry?.[leftKey] || '').trim(),
        [rightKey]: String(entry?.[rightKey] || '').trim(),
      }))
      .filter((entry) => entry[leftKey] || entry[rightKey]);
  }
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [left, ...rest] = line.split('|');
      return { [leftKey]: left.trim(), [rightKey]: rest.join('|').trim() };
    });
}

function applyFields(member, body) {
  for (const field of EDITABLE) {
    if (body[field] === undefined) continue;
    if (field === 'about' || field === 'expertise') member[field] = toList(body[field]);
    else if (field === 'pastExperience') member[field] = toPairs(body[field], 'org', 'role');
    else if (field === 'education') member[field] = toPairs(body[field], 'school', 'qualification');
    else member[field] = body[field];
  }
}

// GET / — public list. Anonymous callers see only published members; staff
// (optionalAuth) see everything and can filter by ?status. The roster is small,
// so this is intentionally unpaginated, ordered by the curator's `order`.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);

  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }

  const items = await TeamMember.find(filter).sort('order createdAt');
  return ok(res, items);
});

// GET /slug/:slug — one member for the profile page. Anonymous callers can only
// reach published members, and only those that have a profile at all.
export const getBySlug = asyncHandler(async (req, res) => {
  const filter = { slug: req.params.slug };
  if (!req.user) {
    filter.status = CONTENT_STATUS.PUBLISHED;
    filter.hasProfile = true;
  }

  const member = await TeamMember.findOne(filter);
  if (!member) throw ApiError.notFound('Team member not found');
  return ok(res, member);
});

export const create = asyncHandler(async (req, res) => {
  if (!req.body.name) throw ApiError.badRequest('name is required');

  const member = new TeamMember({ slug: await uniqueSlug(TeamMember, req.body.name) });
  applyFields(member, req.body);
  await member.save();

  recordAudit({
    req,
    action: 'teamMember.create',
    entity: 'TeamMember',
    entityId: member._id,
    summary: `Created team member "${member.name}"`,
  });
  return created(res, member);
});

export const update = asyncHandler(async (req, res) => {
  const member = await TeamMember.findById(req.params.id);
  if (!member) throw ApiError.notFound('Team member not found');

  // Renaming re-derives the slug, so the profile URL follows the name.
  if (req.body.name && req.body.name !== member.name) {
    member.slug = await uniqueSlug(TeamMember, req.body.name, member._id);
  }
  applyFields(member, req.body);
  await member.save();

  recordAudit({
    req,
    action: 'teamMember.update',
    entity: 'TeamMember',
    entityId: member._id,
    summary: `Updated team member "${member.name}"`,
  });
  return ok(res, member);
});

// POST /:id/photo — upload the headshot and attach it. The old object (if any)
// is removed best-effort so we don't orphan files.
export const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');

  const member = await TeamMember.findById(req.params.id);
  if (!member) throw ApiError.notFound('Team member not found');

  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'team',
    originalName: req.file.originalname,
  });

  const oldKey = member.photo?.key;
  member.photo = { key, url };
  await member.save();

  if (oldKey && oldKey !== key) {
    // Best-effort cleanup — never fail the request over a stale object.
    deleteObject(oldKey).catch(() => {});
  }

  recordAudit({
    req,
    action: 'teamMember.update',
    entity: 'TeamMember',
    entityId: member._id,
    summary: `Updated photo for team member "${member.name}"`,
  });
  return ok(res, member);
});

export const remove = asyncHandler(async (req, res) => {
  const member = await TeamMember.findById(req.params.id);
  if (!member) throw ApiError.notFound('Team member not found');

  const key = member.photo?.key;
  await member.deleteOne();
  if (key) deleteObject(key).catch(() => {});

  recordAudit({
    req,
    action: 'teamMember.delete',
    entity: 'TeamMember',
    entityId: member._id,
    summary: `Deleted team member "${member.name}"`,
  });
  return noContent(res);
});
