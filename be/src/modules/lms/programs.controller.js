import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Program, UNSUBMITTED_PROGRAM_DRAFT } from '../../models/Program.js';
import { Course } from '../../models/Course.js';
import { Lesson } from '../../models/Lesson.js';
import { Enrollment } from '../../models/Enrollment.js';
import { Progress } from '../../models/Progress.js';
import { Certificate } from '../../models/Certificate.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { toSlug, uniqueSlug } from '../../utils/slugify.js';
import { sanitizeRichTextFields } from '../../utils/richText.js';

/* ---------------------------------------------------------------------------
   Learning paths (LMS 8.0): instructor authoring, admin review, learner view.

   A path is a curation over existing courses. Nothing here creates content;
   every step is a reference to a Course that already stands on its own, which
   is what lets a learner's earlier completion count toward a path they join
   later. See models/Program.js for why that decision was made.
   ------------------------------------------------------------------------ */

// Fields an author may write. `status`, `reviewStatus` and `author` are absent
// for the same reasons they are absent from a course's list: publishing is an
// admin action, the review state is moved by submit/approve, and ownership is
// set once at creation.
const AUTHOR_FIELDS = ['title', 'summary', 'body', 'accent', 'certificate'];

const RESERVED_SLUGS = new Set(['new', 'create', 'edit', 'index', 'admin', 'api']);

async function makeProgramSlug(title) {
  const base = toSlug(title) || 'untitled-path';
  const safe = RESERVED_SLUGS.has(base) ? `${base}-path` : base;
  return uniqueSlug(Program, safe);
}

function pickAuthorFields(body) {
  const out = {};
  AUTHOR_FIELDS.forEach((f) => {
    if (body[f] !== undefined) out[f] = body[f];
  });
  // `body` is rich text and reaches the public site as HTML, so it goes
  // through the same cleaning a course description does.
  return sanitizeRichTextFields(out);
}

/* Steps are replaced wholesale rather than patched, because their meaning is
   positional: reordering, removing a step and repointing a prerequisite are all
   one edit from the author's side. They are validated hard, though, since a
   step is a reference to another document:

     · every course id must exist AND be one this author may put in a path;
     · a prerequisite must be another step in the SAME path, or the graph
       refers to a course the learner has no route to;
     · a step cannot require itself, and the graph must be acyclic, or the path
       contains a step nothing can ever unlock. */
async function normaliseSteps(rawSteps, { author }) {
  if (!Array.isArray(rawSteps)) return undefined;

  const ids = rawSteps.map((s) => String(s.course ?? '')).filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    throw ApiError.badRequest('A course can only appear once in a path');
  }

  const courses = await Course.find({ _id: { $in: ids } }).select('_id author status').lean();
  const byId = new Map(courses.map((c) => [String(c._id), c]));
  ids.forEach((id) => {
    if (!byId.has(id)) throw ApiError.badRequest('That course does not exist');
  });

  // An author may only build on courses they wrote or that are already live.
  // Otherwise a path becomes a way to point at somebody else's unpublished
  // draft and learn its title from the 404 it does not give.
  const mine = String(author);
  courses.forEach((c) => {
    const isOwn = String(c.author ?? '') === mine;
    if (!isOwn && c.status !== CONTENT_STATUS.PUBLISHED) {
      throw ApiError.badRequest('A path can only include your own courses or published ones');
    }
  });

  const inPath = new Set(ids);
  const steps = rawSteps.map((s, i) => {
    const requires = (Array.isArray(s.requires) ? s.requires : []).map(String);
    requires.forEach((r) => {
      if (!inPath.has(r)) throw ApiError.badRequest('A prerequisite must be another step in this path');
      if (r === String(s.course)) throw ApiError.badRequest('A step cannot require itself');
    });
    return {
      course: s.course,
      order: Number.isFinite(s.order) ? s.order : i,
      required: s.required !== false,
      requires,
    };
  });

  assertAcyclic(steps);
  return steps.sort((a, b) => a.order - b.order).map((s, i) => ({ ...s, order: i }));
}

// Depth-first cycle check over the prerequisite graph. A cycle is not a subtle
// bug in the UI, it is a path with steps that can never open, and it is far
// cheaper to refuse it here than to explain it to a stuck learner.
function assertAcyclic(steps) {
  const edges = new Map(steps.map((s) => [String(s.course), s.requires.map(String)]));
  const state = new Map(); // undefined | 'open' | 'done'

  const walk = (node) => {
    if (state.get(node) === 'done') return;
    if (state.get(node) === 'open') {
      throw ApiError.badRequest('These prerequisites form a loop, so some steps could never open');
    }
    state.set(node, 'open');
    (edges.get(node) ?? []).forEach(walk);
    state.set(node, 'done');
  };

  [...edges.keys()].forEach(walk);
}

/* ---- Instructor authoring -------------------------------------------------- */

// GET /lms/authoring/programs
export const myPrograms = asyncHandler(async (req, res) => {
  const programs = await Program.find({ author: req.user._id }).sort({ updatedAt: -1 }).lean();
  const courseIds = programs.flatMap((p) => p.steps.map((s) => s.course));
  const courses = await Course.find({ _id: { $in: courseIds } }).select('title slug status').lean();
  const byId = new Map(courses.map((c) => [String(c._id), c]));

  return ok(
    res,
    programs.map((p) => ({
      ...p,
      stepCount: p.steps.length,
      // Named here so the list can show what a path contains without a second
      // request per row.
      courses: p.steps.map((s) => byId.get(String(s.course))).filter(Boolean),
    })),
  );
});

// POST /lms/authoring/programs
export const createProgram = asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) throw ApiError.badRequest('A path title is required');

  const program = await Program.create({
    ...pickAuthorFields(req.body),
    title: title.trim(),
    slug: await makeProgramSlug(title),
    author: req.user._id,
    status: CONTENT_STATUS.DRAFT,
    reviewStatus: 'none',
  });

  recordAudit({
    req,
    action: 'lms.program.create',
    entity: 'Program',
    entityId: program._id,
    summary: `Instructor created learning path ${program.title}`,
  });

  return created(res, program);
});

// GET /lms/authoring/programs/:programId
export const getProgram = asyncHandler(async (req, res) => {
  const courses = await Course.find({ _id: { $in: req.program.steps.map((s) => s.course) } })
    .select('title slug status level minutes image')
    .lean();
  return ok(res, { program: req.program, courses });
});

// PATCH /lms/authoring/programs/:programId
export const updateProgram = asyncHandler(async (req, res) => {
  Object.assign(req.program, pickAuthorFields(req.body));

  const steps = await normaliseSteps(req.body.steps, { author: req.user._id });
  if (steps) req.program.steps = steps;

  // Same rule courses follow: editing a path that was sent back clears the
  // banner, while a decline is answered by resubmitting rather than by typing.
  if (req.program.reviewStatus === 'rejected') req.program.reviewStatus = 'none';

  await req.program.save();
  return ok(res, req.program);
});

// DELETE /lms/authoring/programs/:programId
export const deleteProgram = asyncHandler(async (req, res) => {
  // Deleting a path never touches the courses inside it. That is the whole
  // point of a curation: the content belongs to the courses, not to this.
  const issued = await Certificate.countDocuments({ program: req.program._id, revokedAt: null });
  if (issued > 0) {
    throw ApiError.badRequest(
      'Learners hold certificates for this path. Ask an admin to unpublish it instead',
    );
  }

  await req.program.deleteOne();
  recordAudit({
    req,
    action: 'lms.program.delete',
    entity: 'Program',
    entityId: req.program._id,
    summary: `Instructor deleted learning path ${req.program.title}`,
  });
  return ok(res, { deleted: true });
});

// POST /lms/authoring/programs/:programId/submit
export const submitProgramForReview = asyncHandler(async (req, res) => {
  if (!req.program.steps.length) {
    throw ApiError.badRequest('Add at least one course before submitting');
  }
  // A path is only as reachable as its steps. Submitting one that points at a
  // course still sitting in the author's drafts would put an admin in front of
  // something they cannot assess.
  const stepIds = req.program.steps.map((s) => s.course);
  const live = await Course.countDocuments({
    _id: { $in: stepIds },
    status: CONTENT_STATUS.PUBLISHED,
  });
  if (live !== stepIds.length) {
    throw ApiError.badRequest('Every course in the path must be published before it can be reviewed');
  }

  req.program.reviewStatus = 'pending';
  req.program.submittedAt = new Date();
  req.program.reviewNote = '';
  await req.program.save();

  recordAudit({
    req,
    action: 'lms.program.submit',
    entity: 'Program',
    entityId: req.program._id,
    summary: `Submitted learning path "${req.program.title}" for review`,
  });

  return ok(res, req.program);
});

// POST /lms/authoring/programs/:programId/withdraw
export const withdrawProgram = asyncHandler(async (req, res) => {
  if (req.program.reviewStatus !== 'pending') {
    throw ApiError.badRequest('This path is not awaiting review');
  }
  req.program.reviewStatus = 'none';
  // Cleared so it reads as unsent again and drops back out of the admin's list,
  // the same contract withdrawing a course has.
  req.program.submittedAt = null;
  await req.program.save();
  return ok(res, req.program);
});

/* ---- Admin review ---------------------------------------------------------- */

// GET /lms/review/programs. Every path the CMS has business seeing, which is
// everything except one an author is still writing and has never submitted.
export const allPrograms = asyncHandler(async (req, res) => {
  const { review, status, q } = req.query;
  const filter = { $nor: [UNSUBMITTED_PROGRAM_DRAFT] };
  if (review) filter.reviewStatus = review;
  if (status) filter.status = status;
  if (q) filter.title = { $regex: String(q).trim(), $options: 'i' };

  const programs = await Program.find(filter)
    .populate('author', 'name email')
    .sort({ submittedAt: -1, updatedAt: -1 })
    .lean();

  const courseIds = programs.flatMap((p) => p.steps.map((s) => s.course));
  const courses = await Course.find({ _id: { $in: courseIds } }).select('title slug status').lean();
  const byId = new Map(courses.map((c) => [String(c._id), c]));

  return ok(
    res,
    programs.map((p) => ({
      ...p,
      stepCount: p.steps.length,
      courses: p.steps.map((s) => byId.get(String(s.course))).filter(Boolean),
    })),
  );
});

// GET /lms/review/programs/:programId. What an admin needs to judge it: the
// path itself and the courses it strings together, since approving a path is
// approving the sequence rather than the content.
export const programReviewDetail = asyncHandler(async (req, res) => {
  const program = await Program.findById(req.params.programId).populate('author', 'name email');
  if (!program) throw ApiError.notFound('Learning path not found');

  const courses = await Course.find({ _id: { $in: program.steps.map((s) => s.course) } })
    .select('title slug status level')
    .lean();
  const byId = new Map(courses.map((c) => [String(c._id), c]));

  const lessonCounts = await Lesson.aggregate([
    { $match: { course: { $in: program.steps.map((s) => s.course) } } },
    { $group: { _id: '$course', lessons: { $sum: 1 }, minutes: { $sum: '$minutes' } } },
  ]);
  const statsById = new Map(lessonCounts.map((r) => [String(r._id), r]));

  return ok(res, {
    program,
    steps: program.steps.map((s) => ({
      ...(s.toObject?.() ?? s),
      course: byId.get(String(s.course)) ?? null,
      lessons: statsById.get(String(s.course))?.lessons ?? 0,
      minutes: statsById.get(String(s.course))?.minutes ?? 0,
    })),
    learners: await Certificate.countDocuments({ program: program._id }),
  });
});

async function decide(req, { reviewStatus, publish = false, note = '', action, summary }) {
  const program = await Program.findById(req.params.programId);
  if (!program) throw ApiError.notFound('Learning path not found');

  program.reviewStatus = reviewStatus;
  program.reviewedAt = new Date();
  program.reviewedBy = req.user._id;
  program.reviewNote = note;
  if (publish) {
    program.status = CONTENT_STATUS.PUBLISHED;
    program.publishedAt = program.publishedAt ?? new Date();
  }
  await program.save();

  recordAudit({ req, action, entity: 'Program', entityId: program._id, summary: summary(program) });
  return program;
}

// POST /lms/review/programs/:programId/approve. The only path to published.
export const approveProgram = asyncHandler(async (req, res) =>
  ok(
    res,
    await decide(req, {
      reviewStatus: 'approved',
      publish: true,
      note: req.body.note ?? '',
      action: 'lms.program.approve',
      summary: (p) => `Approved and published learning path "${p.title}"`,
    }),
  ),
);

// POST /lms/review/programs/:programId/reject. Sent back to be fixed.
export const rejectProgram = asyncHandler(async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) throw ApiError.badRequest('Give a reason so the instructor knows what to change');
  return ok(
    res,
    await decide(req, {
      reviewStatus: 'rejected',
      note: note.trim(),
      action: 'lms.program.reject',
      summary: (p) => `Sent back learning path "${p.title}"`,
    }),
  );
});

// POST /lms/review/programs/:programId/decline. Refused outright, with a reason.
export const declineProgram = asyncHandler(async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) {
    throw ApiError.badRequest('Give a reason. A refusal without one is a dead end for the author');
  }
  return ok(
    res,
    await decide(req, {
      reviewStatus: 'declined',
      note: note.trim(),
      action: 'lms.program.decline',
      summary: (p) => `Declined learning path "${p.title}"`,
    }),
  );
});

// POST /lms/review/programs/:programId/unpublish
export const unpublishProgram = asyncHandler(async (req, res) => {
  const program = await Program.findByIdAndUpdate(
    req.params.programId,
    { status: CONTENT_STATUS.DRAFT, reviewStatus: 'none' },
    { new: true },
  );
  if (!program) throw ApiError.notFound('Learning path not found');

  recordAudit({
    req,
    action: 'lms.program.unpublish',
    entity: 'Program',
    entityId: program._id,
    summary: `Unpublished learning path "${program.title}"`,
  });
  return ok(res, program);
});

/* ---- Learner --------------------------------------------------------------- */

// Resolves a path against one learner's record. The single definition of what
// "done", "current", "open" and "locked" mean for a step, so the list, the
// detail page and the certificate rule cannot disagree about it.
//
// Server-side, unlike the placeholder it replaces: a client that decides its
// own gating is a client that can award itself a certificate.
export async function resolveForLearner(program, userId) {
  const courseIds = program.steps.map((s) => s.course);
  const [courses, enrolments, progresses, lessons] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }).select('title slug summary level image status').lean(),
    userId
      ? Enrollment.find({ user: userId, course: { $in: courseIds }, revokedAt: null }).lean()
      : [],
    userId ? Progress.find({ user: userId, course: { $in: courseIds } }).lean() : [],
    Lesson.find({ course: { $in: courseIds } }).select('course').lean(),
  ]);

  const courseById = new Map(courses.map((c) => [String(c._id), c]));
  const enrolByCourse = new Map(enrolments.map((e) => [String(e.course), e]));
  const progressByCourse = new Map(progresses.map((p) => [String(p.course), p]));
  const totals = lessons.reduce((acc, l) => {
    const k = String(l.course);
    acc.set(k, (acc.get(k) ?? 0) + 1);
    return acc;
  }, new Map());

  const doneFor = (courseId) => {
    const total = totals.get(courseId) ?? 0;
    const done = progressByCourse.get(courseId)?.completedLessons?.length ?? 0;
    return total > 0 && done >= total;
  };

  let currentAssigned = false;
  const steps = [...program.steps]
    .sort((a, b) => a.order - b.order)
    .map((step) => {
      const id = String(step.course);
      const total = totals.get(id) ?? 0;
      const done = progressByCourse.get(id)?.completedLessons?.length ?? 0;
      const complete = doneFor(id);
      const unmet = (step.requires ?? []).map(String).filter((r) => !doneFor(r));

      let state;
      if (complete) state = 'done';
      else if (unmet.length) state = 'locked';
      else if (!currentAssigned) {
        state = 'current';
        currentAssigned = true;
      } else state = 'open';

      return {
        id: String(step._id),
        required: step.required !== false,
        order: step.order,
        course: courseById.get(id) ?? null,
        enrolled: Boolean(enrolByCourse.get(id)),
        lessonsDone: done,
        lessonsTotal: total,
        percent: total ? Math.round((done / total) * 100) : 0,
        state,
        unmet: unmet.map((r) => courseById.get(r)?.title ?? 'Another course'),
      };
    });

  const required = steps.filter((s) => s.required);
  const doneCount = steps.filter((s) => s.state === 'done').length;

  return {
    steps,
    doneCount,
    // Only REQUIRED steps decide completion. An elective counts toward the
    // path's progress bar but cannot hold the certificate hostage.
    complete: required.length > 0 && required.every((s) => s.state === 'done'),
    percent: steps.length ? Math.round((doneCount / steps.length) * 100) : 0,
  };
}

// GET /lms/programs. The published paths, with this learner's progress when
// there is one. Optional auth: the catalogue is a shop window.
export const listPrograms = asyncHandler(async (req, res) => {
  const programs = await Program.find({ status: CONTENT_STATUS.PUBLISHED })
    .sort({ publishedAt: -1 })
    .lean();

  const rows = await Promise.all(
    programs.map(async (p) => ({
      ...p,
      ...(await resolveForLearner(p, req.user?._id)),
    })),
  );
  return ok(res, rows);
});

// GET /lms/programs/:slug
export const getProgramBySlug = asyncHandler(async (req, res) => {
  const program = await Program.findOne({ slug: req.params.slug }).lean();
  if (!program) throw ApiError.notFound('Learning path not found');

  // An unpublished path is visible to its author and to staff, so the builder's
  // preview link works before it goes live.
  if (program.status !== CONTENT_STATUS.PUBLISHED) {
    const isAuthor = req.user && String(program.author) === String(req.user._id);
    const isStaff = req.user && ['superadmin', 'editor', 'moderator'].includes(req.user.role);
    if (!isAuthor && !isStaff) throw ApiError.notFound('Learning path not found');
  }

  const resolved = await resolveForLearner(program, req.user?._id);
  const certificate = req.user
    ? await Certificate.findOne({ user: req.user._id, program: program._id }).lean()
    : null;

  return ok(res, { ...program, ...resolved, certificate });
});
