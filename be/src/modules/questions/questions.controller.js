import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { QUESTION_STATUS, QUESTION_STATUSES } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Question } from '../../models/Question.js';

// POST / — PUBLIC. The website forum submission form. Always born 'submitted';
// staff-only fields (status, answer, slug, history) are never taken from input.
export const submit = asyncHandler(async (req, res) => {
  const { title, body, category } = req.body;
  if (!title || !body) throw ApiError.badRequest('Title and body are required');

  // Accept either a nested submitter object or flat name/email fields.
  const submitter = {
    name: req.body.submitter?.name ?? req.body.name ?? '',
    email: req.body.submitter?.email ?? req.body.email ?? '',
  };

  const question = await Question.create({
    title,
    body,
    category: category === 'award' ? 'award' : 'win',
    submitter,
    status: QUESTION_STATUS.SUBMITTED,
  });

  recordAudit({
    req,
    action: 'question.submit',
    entity: 'Question',
    entityId: question._id,
    summary: `Question submitted: "${question.title}"`,
  });

  // Minimal confirmation — never leak internal moderation fields to the public.
  return created(res, { id: question._id, status: question.status });
});

// GET / — optionalAuth. Anonymous callers only ever see published questions
// (this is the public forum); staff see all statuses and drive the moderation
// queue via ?status. Supports ?category and ?q text search.
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const isStaff = Boolean(req.user);

  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.q) filter.$text = { $search: req.query.q };
  if (req.query.featured === 'true') filter.featured = true;

  let sort;
  if (!isStaff) {
    filter.status = QUESTION_STATUS.PUBLISHED;
    sort = req.query.sort || '-publishedAt';
  } else {
    if (req.query.status) filter.status = req.query.status;
    sort = req.query.sort || '-createdAt';
  }

  const { items, meta } = await paginate(Question, filter, { page, limit, skip, sort });
  return ok(res, items, meta);
});

// GET /slug/:slug — optionalAuth. Anonymous callers reach published only.
export const getBySlug = asyncHandler(async (req, res) => {
  const filter = { slug: req.params.slug };
  if (!req.user) filter.status = QUESTION_STATUS.PUBLISHED;
  const question = await Question.findOne(filter);
  if (!question) throw ApiError.notFound('Question not found');
  return ok(res, question);
});

// GET /:id — optionalAuth. Anonymous callers reach published only.
export const getById = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (!req.user) filter.status = QUESTION_STATUS.PUBLISHED;
  const question = await Question.findOne(filter);
  if (!question) throw ApiError.notFound('Question not found');
  return ok(res, question);
});

// PATCH /:id/status — moderation transition. Records a history entry and applies
// the side effects of each target status (slug, publishedAt, rejectionReason).
export const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!QUESTION_STATUSES.includes(status)) {
    throw ApiError.badRequest(`Invalid status. Must be one of: ${QUESTION_STATUSES.join(', ')}`);
  }

  const question = await Question.findById(req.params.id);
  if (!question) throw ApiError.notFound('Question not found');

  const from = question.status;
  question.status = status;

  // Approving or publishing needs a public slug; generate one lazily.
  if ((status === QUESTION_STATUS.APPROVED || status === QUESTION_STATUS.PUBLISHED) && !question.slug) {
    question.slug = await uniqueSlug(Question, question.title);
  }
  // Stamp the first publish.
  if (status === QUESTION_STATUS.PUBLISHED && !question.publishedAt) {
    question.publishedAt = new Date();
  }
  // Capture the reason a question was rejected.
  if (status === QUESTION_STATUS.REJECTED) {
    question.rejectionReason = note || '';
  }

  question.history.push({
    from,
    to: status,
    by: req.user._id,
    at: new Date(),
    note: note || '',
  });

  await question.save();

  recordAudit({
    req,
    action: status === QUESTION_STATUS.PUBLISHED ? 'question.publish' : `question.${status}`,
    entity: 'Question',
    entityId: question._id,
    summary: `Question "${question.title}" ${from} → ${status}`,
  });

  return ok(res, question);
});

// PATCH /:id/answer — attach or update the moderator's answer.
export const answer = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw ApiError.notFound('Question not found');

  const { paragraphs, lessons } = req.body;
  question.answer = {
    paragraphs: Array.isArray(paragraphs) ? paragraphs : [],
    lessons: Array.isArray(lessons) ? lessons : [],
    answeredBy: req.user._id,
    answeredAt: new Date(),
  };

  await question.save();

  recordAudit({
    req,
    action: 'question.answer',
    entity: 'Question',
    entityId: question._id,
    summary: `Answered question "${question.title}"`,
  });

  return ok(res, question);
});

// PATCH /:id/featured — toggle whether a question is featured in the sidebar.
export const setFeatured = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw ApiError.notFound('Question not found');

  question.featured = Boolean(req.body.featured);
  await question.save();

  recordAudit({
    req,
    action: 'question.featured',
    entity: 'Question',
    entityId: question._id,
    summary: `Question "${question.title}" featured = ${question.featured}`,
  });

  return ok(res, question);
});

// DELETE /:id — remove a question.
export const remove = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw ApiError.notFound('Question not found');

  await question.deleteOne();

  recordAudit({
    req,
    action: 'question.delete',
    entity: 'Question',
    entityId: question._id,
    summary: `Deleted question "${question.title}"`,
  });

  return noContent(res);
});
