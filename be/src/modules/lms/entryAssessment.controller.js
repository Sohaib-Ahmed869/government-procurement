import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/apiResponse.js';
import { parsePaging, paginate, pageMeta } from '../../utils/pagination.js';
import { uploadBuffer, deleteObject, presignGet } from '../../config/s3.js';
import { recordAudit } from '../../models/AuditLog.js';
import { CourseAssessment } from '../../models/CourseAssessment.js';
import { AssessmentSubmission, gradeForScore } from '../../models/AssessmentSubmission.js';

const FOLDER = 'entry-assessments';
const FILE_URL_TTL_SECONDS = 300;

async function uploadedFile(file) {
  const { key } = await uploadBuffer({
    buffer: file.buffer,
    mimeType: file.mimetype,
    folder: FOLDER,
    originalName: file.originalname,
  });
  return { key, name: file.originalname, mimeType: file.mimetype, sizeBytes: file.size };
}

/* Whether a learner is blocked from the rest of req.course by an entry
   assessment they have not yet passed. Used by learning.controller's gate so
   "start the course" and "open lesson two" answer the same question — a
   required, ungraded-or-failed assessment locks everything past it. */
export async function entryAssessmentLockFor({ userId, courseId }) {
  const assessment = await CourseAssessment.findOne({ course: courseId, required: true }).lean();
  if (!assessment) return null;

  const submission = userId
    ? await AssessmentSubmission.findOne({ course: courseId, user: userId }).lean()
    : null;

  if (submission?.status === 'graded' && submission.passed) return null;
  return { assessmentId: assessment._id, submissionStatus: submission?.status ?? 'not-submitted' };
}

/* Whether the course has a required entry assessment at all, independent of
   whether THIS learner has already cleared it. `entryAssessmentLockFor`
   answers "is it still blocking them" and goes back to null the moment they
   pass — which is exactly right for gating lessons, but leaves the course
   page with no way to say "send them past their result screen once more"
   for someone who passed it back on their first visit. */
export async function hasRequiredEntryAssessment(courseId) {
  const exists = await CourseAssessment.exists({ course: courseId, required: true });
  return Boolean(exists);
}

/* ---- Learner-facing --------------------------------------------------- */

// The answer key is instructor-only. A learner fetching the assessment (to
// answer it) or a grader fetching a submission both go through the same S3-key
// style rule: what proves the answer never reaches the side being marked on it.
function stripAnswerKey(assessment) {
  return {
    ...assessment,
    questions: (assessment.questions ?? []).map((q) => {
      const { referenceAnswer, ...rest } = q;
      return {
        ...rest,
        options: q.options?.length
          ? q.options.map((o) => ({ _id: o._id, text: o.text }))
          : q.options,
      };
    }),
  };
}

// GET /lms/courses/:courseId/entry-assessment
export const getEntryAssessment = asyncHandler(async (req, res) => {
  const assessment = await CourseAssessment.findOne({ course: req.course._id }).lean();
  if (!assessment) return ok(res, { assessment: null, submission: null });

  const submission = await AssessmentSubmission.findOne({
    course: req.course._id,
    user: req.user._id,
  }).lean();

  return ok(res, { assessment: stripAnswerKey(assessment), submission });
});

// mcq questions are marked right here, at submission, rather than waiting on
// the instructor: `answers` carries `selectedOption` for these, matched
// against the answer key kept on the assessment (never sent to the learner).
function markMcq(assessment, answers) {
  const byId = new Map(answers.map((a) => [String(a.question), a]));
  let correct = 0;
  let total = 0;
  const marked = assessment.questions.map((q) => {
    const a = byId.get(String(q._id)) ?? { question: q._id, text: '' };
    if (q.type !== 'mcq') return a;
    total += 1;
    const key = q.options.find((o) => o.correct);
    const isCorrect = Boolean(
      key && a.selectedOption && String(a.selectedOption) === String(key._id),
    );
    if (isCorrect) correct += 1;
    return { question: q._id, selectedOption: a.selectedOption, correct: isCorrect };
  });
  return {
    answers: marked,
    autoCorrect: total ? correct : undefined,
    autoTotal: total || undefined,
    autoScore: total ? Math.round((correct / total) * 100) : undefined,
  };
}

// POST /lms/courses/:courseId/entry-assessment/submit
// multipart: files[] + fields `answers` (JSON array of {question, text}) and
// `integrityAck` ('true'). Resubmitting overwrites the previous lodgement and
// puts it back in front of the instructor for marking.
export const submitEntryAssessment = asyncHandler(async (req, res) => {
  const assessment = await CourseAssessment.findOne({ course: req.course._id });
  if (!assessment) throw ApiError.notFound('This course has no entry assessment');

  if (req.body.integrityAck !== 'true' && req.body.integrityAck !== true) {
    throw ApiError.badRequest('You must acknowledge this is your own independent work');
  }

  let answers = [];
  if (req.body.answers) {
    try {
      answers = JSON.parse(req.body.answers);
    } catch {
      throw ApiError.badRequest('Invalid answers payload');
    }
  }

  const files = await Promise.all((req.files ?? []).map(uploadedFile));

  const existing = await AssessmentSubmission.findOne({
    course: req.course._id,
    user: req.user._id,
  });
  // Resubmission is a fresh lodgement: old files are dropped from S3 and the
  // previous grade no longer applies to work the learner has since changed.
  if (existing) {
    await Promise.all(existing.files.map((f) => f.key && deleteObject(f.key).catch(() => {})));
  }

  const { answers: marked, autoCorrect, autoTotal, autoScore } = markMcq(assessment, answers);

  // If every question on the assessment is mcq, there is nothing left for an
  // instructor to mark — the submission is graded the moment it lands, same
  // scale (A-F, pass/fail against passScore) as a manual grade.
  const fullyAuto = autoTotal === assessment.questions.length && assessment.questions.length > 0;

  const doc = await AssessmentSubmission.findOneAndUpdate(
    { course: req.course._id, user: req.user._id },
    {
      course: req.course._id,
      assessment: assessment._id,
      user: req.user._id,
      answers: marked,
      files,
      integrityAcknowledgedAt: new Date(),
      submittedAt: new Date(),
      autoScore,
      autoCorrect,
      autoTotal,
      status: fullyAuto ? 'graded' : 'submitted',
      score: fullyAuto ? autoScore : undefined,
      grade: fullyAuto ? gradeForScore(autoScore) : undefined,
      passed: fullyAuto ? autoScore >= assessment.passScore : undefined,
      instructorComment: '',
      gradedBy: undefined,
      gradedAt: fullyAuto ? new Date() : undefined,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return created(res, doc);
});

// GET /lms/courses/:courseId/entry-assessment/files/:fileId/url
// A learner reading back their own lodged file.
export const learnerFileUrl = asyncHandler(async (req, res) => {
  const submission = await AssessmentSubmission.findOne({
    course: req.course._id,
    user: req.user._id,
  });
  const file = submission?.files?.id?.(req.params.fileId);
  if (!file?.key) throw ApiError.notFound('File not found');

  const url = await presignGet(file.key, FILE_URL_TTL_SECONDS);
  return ok(res, { url, name: file.name });
});

// GET /lms/courses/:courseId/entry-assessment/attachments/:attachmentId/url
// The brief (e.g. a PPT) or a marking-criteria file the instructor attached —
// gated on enrolment like everything else here, rather than served as a plain
// link. Checks both lists since the client only ever hands back one id.
export const briefAttachmentUrl = asyncHandler(async (req, res) => {
  const assessment = await CourseAssessment.findOne({ course: req.course._id });
  if (!assessment) throw ApiError.notFound('This course has no entry assessment');

  const file =
    assessment.attachments?.id?.(req.params.attachmentId) ??
    assessment.markingCriteria?.attachments?.id?.(req.params.attachmentId);
  if (!file?.key) throw ApiError.notFound('File not found');

  const url = await presignGet(file.key, FILE_URL_TTL_SECONDS);
  return ok(res, { url, name: file.name });
});

/* ---- Instructor-facing (use AFTER the `owns` middleware chain) -------- */

// GET /lms/authoring/courses/:courseId/entry-assessment
export const getEntryAssessmentForAuthoring = asyncHandler(async (req, res) => {
  const assessment = await CourseAssessment.findOne({ course: req.course._id }).lean();
  return ok(res, assessment ?? null);
});

// PUT /lms/authoring/courses/:courseId/entry-assessment
export const upsertEntryAssessment = asyncHandler(async (req, res) => {
  const { title, instructions, questions, required, passScore, markingCriteriaText } = req.body;

  const update = {
    course: req.course._id,
    createdBy: req.user._id,
  };
  if (title !== undefined) update.title = title;
  if (instructions !== undefined) update.instructions = instructions;
  if (Array.isArray(questions)) {
    update.questions = questions.map((q, i) => ({
      prompt: q.prompt,
      type: ['file', 'mcq'].includes(q.type) ? q.type : 'written',
      order: q.order ?? i,
      referenceAnswer: q.referenceAnswer ?? '',
      options:
        q.type === 'mcq'
          ? (q.options ?? []).map((o) => ({ text: o.text ?? '', correct: Boolean(o.correct) }))
          : [],
    }));
  }
  if (required !== undefined) update.required = Boolean(required);
  if (passScore !== undefined) {
    const n = Number(passScore);
    if (Number.isNaN(n) || n < 0 || n > 100) throw ApiError.badRequest('passScore must be 0-100');
    update.passScore = n;
  }
  if (markingCriteriaText !== undefined) update['markingCriteria.text'] = markingCriteriaText;

  const assessment = await CourseAssessment.findOneAndUpdate(
    { course: req.course._id },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  recordAudit({
    req,
    action: 'entryAssessment.upsert',
    entity: 'CourseAssessment',
    entityId: assessment._id,
    summary: `Updated entry assessment for "${req.course.title}"`,
  });

  return ok(res, assessment);
});

// POST /lms/authoring/courses/:courseId/entry-assessment/attachments
// field `file`; body `target` = 'brief' (default) | 'criteria'.
export const addEntryAssessmentAttachment = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');

  const assessment = await CourseAssessment.findOneAndUpdate(
    { course: req.course._id },
    { $setOnInsert: { course: req.course._id, createdBy: req.user._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const file = await uploadedFile(req.file);
  const path = req.body.target === 'criteria' ? 'markingCriteria.attachments' : 'attachments';
  assessment.set(path, [...assessment.get(path), file]);
  await assessment.save();

  return created(res, assessment);
});

// DELETE /lms/authoring/courses/:courseId/entry-assessment/attachments/:attachmentId
export const removeEntryAssessmentAttachment = asyncHandler(async (req, res) => {
  const assessment = await CourseAssessment.findOne({ course: req.course._id });
  if (!assessment) throw ApiError.notFound('No entry assessment on this course');

  for (const path of ['attachments', 'markingCriteria.attachments']) {
    const list = assessment.get(path);
    const item = list?.id?.(req.params.attachmentId);
    if (item) {
      if (item.key) await deleteObject(item.key).catch(() => {});
      item.deleteOne();
      await assessment.save();
      return ok(res, assessment);
    }
  }
  throw ApiError.notFound('Attachment not found');
});

// GET /lms/authoring/courses/:courseId/entry-assessment/submissions
export const listSubmissions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = { course: req.course._id };
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    AssessmentSubmission.find(filter)
      .populate('user', 'name email')
      .sort('-submittedAt')
      .skip(skip)
      .limit(limit)
      .lean(),
    AssessmentSubmission.countDocuments(filter),
  ]);

  return ok(res, items, pageMeta({ page, limit, total }));
});

// GET /lms/authoring/courses/:courseId/entry-assessment/submissions/:submissionId
export const getSubmission = asyncHandler(async (req, res) => {
  const submission = await AssessmentSubmission.findOne({
    _id: req.params.submissionId,
    course: req.course._id,
  }).populate('user', 'name email');
  if (!submission) throw ApiError.notFound('Submission not found');
  return ok(res, submission);
});

// GET .../submissions/:submissionId/files/:fileId/url
export const submissionFileUrl = asyncHandler(async (req, res) => {
  const submission = await AssessmentSubmission.findOne({
    _id: req.params.submissionId,
    course: req.course._id,
  });
  const file = submission?.files?.id?.(req.params.fileId);
  if (!file?.key) throw ApiError.notFound('File not found');

  const url = await presignGet(file.key, FILE_URL_TTL_SECONDS);
  return ok(res, { url, name: file.name });
});

// POST .../submissions/:submissionId/grade   body: { score, comment }
export const gradeSubmission = asyncHandler(async (req, res) => {
  const score = Number(req.body.score);
  if (Number.isNaN(score) || score < 0 || score > 100) {
    throw ApiError.badRequest('score must be a number 0-100');
  }

  const assessment = await CourseAssessment.findOne({ course: req.course._id }).lean();
  if (!assessment) throw ApiError.notFound('No entry assessment on this course');

  const submission = await AssessmentSubmission.findOne({
    _id: req.params.submissionId,
    course: req.course._id,
  });
  if (!submission) throw ApiError.notFound('Submission not found');

  submission.score = score;
  submission.grade = gradeForScore(score);
  submission.passed = score >= assessment.passScore;
  submission.instructorComment = req.body.comment ?? '';
  submission.status = 'graded';
  submission.gradedBy = req.user._id;
  submission.gradedAt = new Date();
  await submission.save();

  recordAudit({
    req,
    action: 'entryAssessment.grade',
    entity: 'AssessmentSubmission',
    entityId: submission._id,
    summary: `Graded entry assessment submission (${submission.grade}, ${score}%)`,
  });

  return ok(res, submission);
});
