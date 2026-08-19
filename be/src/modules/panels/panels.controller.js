import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { GovernmentPanel } from '../../models/GovernmentPanel.js';

const EDITABLE = [
  'group',
  'groupOrder',
  'agency',
  'name',
  'reference',
  'sourceUrl',
  'order',
  'status',
];

// GET / — public list. Anonymous callers see only published entries; staff
// (optionalAuth) see everything, which is how a draft is checked on the page
// itself before it is published.
//
// The page is a few dozen rows read top to bottom, so this is unpaginated and
// unfiltered by design — there is nothing to query. Sorted into the order the
// page prints: heading sequence, then heading name, then the editor's order
// within it, then name as the tie-break.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);

  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }
  // Staff-only, for the admin screen's heading filter. Not offered publicly:
  // the public page has no filters at all.
  if (isStaff && req.query.group) filter.group = req.query.group;

  const items = await GovernmentPanel.find(filter)
    .collation({ locale: 'en' })
    .sort('groupOrder group order name');
  return ok(res, items);
});

// Both required fields are free text, so this is the whole of validation —
// there are no enums left on this model beyond `status`, which Mongoose covers.
function validate(body, { partial = false } = {}) {
  const missing = (field) => (partial ? body[field] !== undefined && !body[field] : !body[field]);
  if (missing('group')) throw ApiError.badRequest('group is required');
  if (missing('name')) throw ApiError.badRequest('name is required');
}

export const create = asyncHandler(async (req, res) => {
  validate(req.body);

  const panel = new GovernmentPanel();
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) panel[field] = req.body[field];
  }
  await panel.save();

  recordAudit({
    req,
    action: 'governmentPanel.create',
    entity: 'GovernmentPanel',
    entityId: panel._id,
    summary: `Created ${panel.group} panel "${panel.name}"`,
  });
  return created(res, panel);
});

export const update = asyncHandler(async (req, res) => {
  const panel = await GovernmentPanel.findById(req.params.id);
  if (!panel) throw ApiError.notFound('Panel not found');
  validate(req.body, { partial: true });

  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) panel[field] = req.body[field];
  }
  await panel.save();

  recordAudit({
    req,
    action: 'governmentPanel.update',
    entity: 'GovernmentPanel',
    entityId: panel._id,
    summary: `Updated ${panel.group} panel "${panel.name}"`,
  });
  return ok(res, panel);
});

export const remove = asyncHandler(async (req, res) => {
  const panel = await GovernmentPanel.findById(req.params.id);
  if (!panel) throw ApiError.notFound('Panel not found');

  await panel.deleteOne();
  recordAudit({
    req,
    action: 'governmentPanel.delete',
    entity: 'GovernmentPanel',
    entityId: panel._id,
    summary: `Deleted ${panel.group} panel "${panel.name}"`,
  });
  return noContent(res);
});
