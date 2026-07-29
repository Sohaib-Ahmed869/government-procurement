import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { QUESTION_STATUS, QUESTION_STATUSES } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
import { sendMail } from '../../utils/mailer.js';
import { env } from '../../config/env.js';
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

// GET / — optionalAuth. This is the PUBLIC forum feed by default: it returns
// published questions only, even for a signed-in staff member. Seeing the other
// statuses is an explicit opt-in via ?all=1 (staff only), which is what the
// moderation queue passes. Holding a token must not change what the public site
// shows — an admin browsing the site in the same browser as the CMS would
// otherwise still see questions they had just unpublished.
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const wantsAll = Boolean(req.user) && req.query.all === '1';

  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.q) filter.$text = { $search: req.query.q };
  if (req.query.featured === 'true') filter.featured = true;

  let sort;
  if (!wantsAll) {
    filter.status = QUESTION_STATUS.PUBLISHED;
    sort = req.query.sort || '-publishedAt';
  } else {
    if (req.query.status) filter.status = req.query.status;
    sort = req.query.sort || '-createdAt';
  }

  const { items, meta } = await paginate(Question, filter, { page, limit, skip, sort });
  return ok(res, items, meta);
});

// GET /slug/:slug — optionalAuth. Published only unless staff ask for ?all=1.
export const getBySlug = asyncHandler(async (req, res) => {
  const filter = { slug: req.params.slug };
  if (!(req.user && req.query.all === '1')) filter.status = QUESTION_STATUS.PUBLISHED;
  const question = await Question.findOne(filter);
  if (!question) throw ApiError.notFound('Question not found');
  return ok(res, question);
});

// GET /:id — optionalAuth. Published only unless staff ask for ?all=1.
export const getById = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (!(req.user && req.query.all === '1')) filter.status = QUESTION_STATUS.PUBLISHED;
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

// POST /:id/send-answer — email the saved answer to whoever asked. Separate from
// saving so a moderator can revise an answer without notifying on every save,
// and can re-send if needed. Awaited, so the CMS can report success or failure.
export const sendAnswer = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw ApiError.notFound('Question not found');

  const to = question.submitter?.email;
  if (!to) throw ApiError.badRequest('This question was submitted without an email address');

  const paras = question.answer?.paragraphs || [];
  if (paras.length === 0) throw ApiError.badRequest('Save an answer before sending it');

  const lessonList = question.answer?.lessons || [];
  const origin = env.clientOrigins[0];
  // Only published questions have a page to link to.
  const link =
    question.status === QUESTION_STATUS.PUBLISHED && question.slug
      ? `${origin}/forum/answers/${question.slug}`
      : '';

  const html = [
    `<p>Hi ${question.submitter?.name || 'there'},</p>`,
    `<p>Your question has been answered:</p>`,
    `<p><strong>${question.title}</strong></p>`,
    ...paras.map((p) => `<p>${p}</p>`),
    lessonList.length
      ? `<p><strong>Key points</strong></p><ul>${lessonList.map((l) => `<li>${l}</li>`).join('')}</ul>`
      : '',
    link ? `<p><a href="${link}">Read it on the forum</a></p>` : '',
    `<p>— Government Procurement</p>`,
  ]
    .filter(Boolean)
    .join('\n');

  const text = [
    `Your question has been answered:`,
    question.title,
    '',
    ...paras,
    ...(lessonList.length ? ['', 'Key points:', ...lessonList.map((l) => `- ${l}`)] : []),
    ...(link ? ['', link] : []),
  ].join('\n');

  await sendMail({ to, subject: 'Your question has been answered', html, text });

  recordAudit({
    req,
    action: 'question.answerSent',
    entity: 'Question',
    entityId: question._id,
    summary: `Emailed the answer for "${question.title}" to ${to}`,
  });

  return ok(res, { sent: true, to });
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
