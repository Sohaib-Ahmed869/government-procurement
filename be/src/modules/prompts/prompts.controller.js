import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Prompt, PROMPT_TOPICS, PROMPT_TOOLS } from '../../models/Prompt.js';

const EDITABLE = [
  'mainTopic',
  'useCase',
  'useCaseOrder',
  'tool',
  'title',
  'body',
  'notes',
  'order',
  'status',
];

function validate(body, { partial = false } = {}) {
  const oneOf = (field, values) => {
    if (partial && body[field] === undefined) return;
    if (!values.includes(body[field])) {
      throw ApiError.badRequest(`${field} must be one of: ${values.join(', ')}`);
    }
  };
  oneOf('mainTopic', PROMPT_TOPICS);
  oneOf('tool', PROMPT_TOOLS);

  const missing = (f) => (partial ? body[f] !== undefined && !String(body[f]).trim() : !body[f]);
  if (missing('useCase')) throw ApiError.badRequest('useCase is required');
  if (missing('title')) throw ApiError.badRequest('title is required');
  if (missing('body')) throw ApiError.badRequest('body is required — a prompt with nothing to copy is not a prompt');
}

// GET / — public list. Anonymous callers see published prompts only; staff
// (optionalAuth) see drafts too, which is how one is checked on the page before
// it goes live.
//
// The page filters client-side across all three levels at once, so everything
// comes back in one call and switching a filter costs nothing. The query params
// below exist for the admin screen rather than the public page.
//
// Sorted into the order the page groups in: topic, then the use case's own
// position, then the use case name, then the prompt's order and title.
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  const isStaff = Boolean(req.user);

  if (!isStaff) {
    filter.status = CONTENT_STATUS.PUBLISHED;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.mainTopic) filter.mainTopic = req.query.mainTopic;
  if (req.query.tool) filter.tool = req.query.tool;
  if (req.query.useCase) filter.useCase = req.query.useCase;

  const items = await Prompt.find(filter)
    .collation({ locale: 'en' })
    .sort('mainTopic useCaseOrder useCase order title');
  return ok(res, items);
});

// GET /prompts/:id. Public for a published prompt, so the library's own detail
// page can be opened, linked and shared. Staff additionally see drafts, which is
// the same rule `list` above follows.
export const getById = asyncHandler(async (req, res) => {
  const prompt = await Prompt.findById(req.params.id);
  if (!prompt) throw ApiError.notFound('Prompt not found');
  if (!req.user && prompt.status !== CONTENT_STATUS.PUBLISHED) {
    throw ApiError.notFound('Prompt not found');
  }
  return ok(res, prompt);
});

export const create = asyncHandler(async (req, res) => {
  validate(req.body);

  const prompt = new Prompt();
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) prompt[field] = req.body[field];
  }
  await prompt.save();

  recordAudit({
    req,
    action: 'prompt.create',
    entity: 'Prompt',
    entityId: prompt._id,
    summary: `Created ${prompt.mainTopic} prompt "${prompt.title}"`,
  });
  return created(res, prompt);
});

export const update = asyncHandler(async (req, res) => {
  const prompt = await Prompt.findById(req.params.id);
  if (!prompt) throw ApiError.notFound('Prompt not found');
  validate(req.body, { partial: true });

  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) prompt[field] = req.body[field];
  }
  await prompt.save();

  recordAudit({
    req,
    action: 'prompt.update',
    entity: 'Prompt',
    entityId: prompt._id,
    summary: `Updated ${prompt.mainTopic} prompt "${prompt.title}"`,
  });
  return ok(res, prompt);
});

export const remove = asyncHandler(async (req, res) => {
  const prompt = await Prompt.findById(req.params.id);
  if (!prompt) throw ApiError.notFound('Prompt not found');

  await prompt.deleteOne();
  recordAudit({
    req,
    action: 'prompt.delete',
    entity: 'Prompt',
    entityId: prompt._id,
    summary: `Deleted ${prompt.mainTopic} prompt "${prompt.title}"`,
  });
  return noContent(res);
});
