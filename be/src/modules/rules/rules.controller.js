import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import {
  ProcurementRule,
  RULE_STATES,
  RULE_CATEGORIES,
} from '../../models/ProcurementRule.js';

const EDITABLE = [
  'state',
  'category',
  'title',
  'threshold',
  'body',
  'sourceUrl',
  'order',
  'status',
];

function validate(body, { partial = false } = {}) {
  if (!partial || body.state !== undefined) {
    if (!RULE_STATES.includes(body.state)) {
      throw ApiError.badRequest(`state must be one of: ${RULE_STATES.join(', ')}`);
    }
  }
  if (!partial || body.category !== undefined) {
    if (!RULE_CATEGORIES.includes(body.category)) {
      throw ApiError.badRequest(`category must be one of: ${RULE_CATEGORIES.join(', ')}`);
    }
  }
  if (!partial && !body.title) throw ApiError.badRequest('title is required');
}

// GET / — public list. Anonymous callers see only published rules; staff
// (optionalAuth) see everything and can filter by ?status, ?state, ?category.
// The set is small, so this is intentionally unpaginated.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);

  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.state) filter.state = req.query.state;
  if (req.query.category) filter.category = req.query.category;

  // `order` was retired from the CMS, so rules sort themselves: by jurisdiction,
  // then alphabetically by title. The site re-orders jurisdiction and category to
  // its own sequences (see JurisdictionsList) and keeps this as the tie-break.
  const items = await ProcurementRule.find(filter).collation({ locale: 'en' }).sort('state title');
  return ok(res, items);
});

export const create = asyncHandler(async (req, res) => {
  validate(req.body);

  const rule = new ProcurementRule();
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) rule[field] = req.body[field];
  }
  await rule.save();

  recordAudit({
    req,
    action: 'procurementRule.create',
    entity: 'ProcurementRule',
    entityId: rule._id,
    summary: `Created ${rule.state} rule "${rule.title}"`,
  });
  return created(res, rule);
});

export const update = asyncHandler(async (req, res) => {
  const rule = await ProcurementRule.findById(req.params.id);
  if (!rule) throw ApiError.notFound('Rule not found');
  validate(req.body, { partial: true });

  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) rule[field] = req.body[field];
  }
  await rule.save();

  recordAudit({
    req,
    action: 'procurementRule.update',
    entity: 'ProcurementRule',
    entityId: rule._id,
    summary: `Updated ${rule.state} rule "${rule.title}"`,
  });
  return ok(res, rule);
});

export const remove = asyncHandler(async (req, res) => {
  const rule = await ProcurementRule.findById(req.params.id);
  if (!rule) throw ApiError.notFound('Rule not found');

  await rule.deleteOne();
  recordAudit({
    req,
    action: 'procurementRule.delete',
    entity: 'ProcurementRule',
    entityId: rule._id,
    summary: `Deleted ${rule.state} rule "${rule.title}"`,
  });
  return noContent(res);
});
