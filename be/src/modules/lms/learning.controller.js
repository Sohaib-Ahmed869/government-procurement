import { randomUUID } from 'node:crypto';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/apiResponse.js';
import { Course, CERTIFICATE_DEFAULTS } from '../../models/Course.js';
import { Module } from '../../models/Module.js';
import { Lesson } from '../../models/Lesson.js';
import { Enrollment, ENROLMENT_SOURCE } from '../../models/Enrollment.js';
import { Progress } from '../../models/Progress.js';
import { QuizAttempt } from '../../models/QuizAttempt.js';
import { Certificate } from '../../models/Certificate.js';
import { markAttempt, reviewFor } from '../../utils/grading.js';
import { presignGet } from '../../config/s3.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { STAFF_ROLES } from '../../constants/roles.js';

const VIDEO_URL_TTL_SECONDS = 300;

/* ---- Gating (L1/L4/L6) ----------------------------------------------------
   One function decides whether a lesson is open, so no endpoint can disagree
   with another about it. The client has a mirror of this for display, but this
   is the one that is enforced.                                              */
function gateFor({ lesson, module: mod, enrolment, now = new Date() }) {
  if (lesson.preview) return { reason: 'preview' };
  if (!enrolment) return { reason: 'locked-enrolment' };

  // Drip (L4): an absolute date, or days after this learner enrolled.
  if (mod?.releaseAt && now < mod.releaseAt) {
    return { reason: 'locked-drip', unlocksOn: mod.releaseAt };
  }
  if (mod?.releaseAfterDays) {
    const unlocksOn = new Date(enrolment.enrolledAt);
    unlocksOn.setDate(unlocksOn.getDate() + mod.releaseAfterDays);
    if (now < unlocksOn) return { reason: 'locked-drip', unlocksOn };
  }

  return { reason: 'open' };
}

const isLocked = (gate) => gate.reason !== 'open' && gate.reason !== 'preview';

/* ---- Catalogue + outline --------------------------------------------------- */

// Who may open a course that isn't published.
//
// Taking a course offline is an editorial decision, and it shouldn't retract
// what someone already has. An active enrolment survives it; the author and
// staff keep access so they can check what came down. Everyone else gets the
// same 404 as a course that never existed. The point of taking it offline is
// that it is gone from the site.
//
// Note what this does NOT do: `enrol` still requires `published`, so nobody new
// can get in. Access is preserved, never granted.
// Who reaches lesson media without an enrolment: the author, who wrote it, and
// staff, who have to be able to watch a video before approving the course it
// sits in. Reviewing a course you cannot open is signing off on a filename.
//
// This grants a signed URL, not the S3 key, and on the same short expiry as a
// learner's. It is an audience check, not a different level of trust.
function mayBypassGate({ user, course }) {
  if (!user) return false;
  if (STAFF_ROLES.includes(user.role)) return true;
  return Boolean(course?.author) && String(course.author) === String(user._id);
}

function mayViewUnpublished({ user, course, enrolment }) {
  if (enrolment?.isActive()) return true;
  if (!user) return false;
  if (STAFF_ROLES.includes(user.role)) return true;
  return Boolean(course.author) && String(course.author) === String(user._id);
}

// GET /lms/courses/:slug/outline. Public. Shows structure to anyone, with each
// lesson's gate resolved for whoever is asking.
export const outline = asyncHandler(async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug });
  if (!course) throw ApiError.notFound('Course not found');

  const [modules, lessons, enrolment] = await Promise.all([
    Module.find({ course: course._id }).sort({ order: 1 }).lean(),
    Lesson.find({ course: course._id }).sort({ order: 1 }).lean(),
    req.user ? Enrollment.findOne({ user: req.user._id, course: course._id }) : null,
  ]);

  const published = course.status === CONTENT_STATUS.PUBLISHED;
  if (!published && !mayViewUnpublished({ user: req.user, course, enrolment })) {
    throw ApiError.notFound('Course not found');
  }

  const progress = req.user
    ? await Progress.findOne({ user: req.user._id, course: course._id })
    : null;
  const done = new Set((progress?.completedLessons ?? []).map(String));

  // The learner's own position in the course. Null for a visitor, who has
  // none. Same shape and same source as My Courses, so "up next" is one answer
  // rather than two that can drift.
  const rollup = enrolment?.isActive()
    ? await rollupFor({
        userId: req.user._id,
        courseId: course._id,
        modules,
        lessons,
        enrolment,
        progress,
      })
    : null;

  return ok(res, {
    course,
    enrolled: Boolean(enrolment?.isActive()),
    enrolment: rollup,
    // Told plainly rather than left to be inferred. Whoever is seeing this is
    // seeing something the site no longer offers, and the page says so instead
    // of showing an enrol button for a course nobody can enrol in.
    offline: !published,
    // Counts a visitor sees before enrolling. The course page shows "12
    // lessons across 4 modules" whether or not anyone is signed in.
    moduleCount: modules.length,
    lessonCount: lessons.length,
    minutesTotal: lessons.reduce((s, l) => s + (l.minutes || 0), 0),
    modules: modules.map((m) => ({
      ...m,
      lessons: lessons
        .filter((l) => String(l.module) === String(m._id))
        .map((l) => {
          const gate = gateFor({ lesson: l, module: m, enrolment });
          return {
            _id: l._id,
            title: l.title,
            kind: l.kind,
            minutes: l.minutes,
            preview: l.preview,
            complete: done.has(String(l._id)),
            gate: gate.reason === 'open' ? null : gate,
          };
        }),
    })),
  });
});

/* ---- Resume (L3) ----------------------------------------------------------
   Where to drop the learner back into a video they left part-way through.

   The position has been recorded on a throttle for a while; this is what reads
   it back. Two cases are deliberately NOT resumed, because picking up where you
   left off is only welcome some of the time:

     · a lesson already marked complete. They finished it, and coming back is
       almost always to re-watch, not to sit through the last ten seconds again.
     · anything in the first few seconds, which is not a position worth
       restoring and reads as the video simply failing to start at the start.

   Decided here rather than in the browser so both players follow one rule.   */
const MIN_RESUME_SECONDS = 10;

async function resumeFor({ user, lesson }) {
  if (!user) return 0;

  const progress = await Progress.findOne({ user: user._id, course: lesson.course });
  if (!progress) return 0;

  const done = (progress.completedLessons ?? []).some(
    (id) => String(id) === String(lesson._id),
  );
  if (done) return 0;

  const saved = progress.positions?.get?.(String(lesson._id)) ?? 0;
  return saved >= MIN_RESUME_SECONDS ? Math.floor(saved) : 0;
}

// GET /lms/courses/:slug/lessons/:lessonId. The lesson itself, gated.
export const getLesson = asyncHandler(async (req, res) => {
  const course = req.course;
  const lesson = await Lesson.findOne({ _id: req.params.lessonId, course: course._id });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const mod = await Module.findById(lesson.module);
  const enrolment = req.user
    ? await Enrollment.findOne({ user: req.user._id, course: course._id })
    : null;

  // The author and staff read their own course without an enrolment, the same
  // audience that already reached its video, documents and quizzes. The
  // builder's "Preview" link lands here, and an instructor being told to enrol
  // in their own unpublished course is a dead end: `enrol` requires it to be
  // published, which is the thing they are checking before submitting it.
  const gate = mayBypassGate({ user: req.user, course })
    ? { reason: 'open' }
    : gateFor({ lesson, module: mod, enrolment });

  if (isLocked(gate)) {
    // The gate reason is safe to return. It tells the learner what to do next
    // without exposing the content itself.
    throw ApiError.forbidden(JSON.stringify(gate));
  }

  return ok(res, {
    ...lesson.forLearner(),
    resumeAt: await resumeFor({ user: req.user, lesson }),
  });
});

// GET /lms/lessons/:lessonId/video-url. A short-lived signed URL (L2).
//
// This is the ONLY way to play a lesson video. The S3 key never leaves the
// server, and the URL it returns lapses in minutes, so a link that escapes is
// worth a few minutes rather than forever.
export const videoUrl = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson || lesson.kind !== 'video' || !lesson.video?.key) {
    throw ApiError.notFound('No video on this lesson');
  }

  const [course, mod] = await Promise.all([
    Course.findById(lesson.course),
    Module.findById(lesson.module),
  ]);
  const enrolment = await Enrollment.findOne({ user: req.user._id, course: lesson.course });

  if (!mayBypassGate({ user: req.user, course })) {
    const gate = gateFor({ lesson, module: mod, enrolment });
    if (isLocked(gate)) throw ApiError.forbidden('You need to be enrolled to watch this');
  }

  const url = await presignGet(lesson.video.key, VIDEO_URL_TTL_SECONDS);
  return ok(res, {
    url,
    expiresAt: new Date(Date.now() + VIDEO_URL_TTL_SECONDS * 1000),
  });
});

// GET /lms/lessons/:lessonId/document-url. The same treatment as video: an
// uploaded document is fetched through a short-lived signed URL, gated on the
// enrolment, so the S3 key never reaches the browser.
//
// A document lesson pointing at an external `url` never reaches here. That link
// is already public and the page renders it directly.
export const documentUrl = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson || lesson.kind !== 'doc' || !lesson.document?.key) {
    throw ApiError.notFound('No document on this lesson');
  }

  const [course, mod] = await Promise.all([
    Course.findById(lesson.course),
    Module.findById(lesson.module),
  ]);
  const enrolment = await Enrollment.findOne({ user: req.user._id, course: lesson.course });

  if (!mayBypassGate({ user: req.user, course })) {
    const gate = gateFor({ lesson, module: mod, enrolment });
    if (isLocked(gate)) throw ApiError.forbidden('You need to be enrolled to open this');
  }

  const url = await presignGet(lesson.document.key, VIDEO_URL_TTL_SECONDS);
  return ok(res, {
    url,
    name: lesson.document.name,
    expiresAt: new Date(Date.now() + VIDEO_URL_TTL_SECONDS * 1000),
  });
});

// GET /lms/lessons/:lessonId/resources/:resourceId/url. A lesson handout.
//
// Gated exactly like lesson video and lesson documents, and for the same
// reason: the list of resources is visible to anyone browsing the course, but
// the file behind it is part of what was paid for. The S3 key stays here; what
// the browser gets is a link that lapses in minutes.
export const resourceUrl = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const resource = lesson.resources?.id?.(req.params.resourceId);
  if (!resource?.key) throw ApiError.notFound('No such download on this lesson');

  const [course, mod] = await Promise.all([
    Course.findById(lesson.course),
    Module.findById(lesson.module),
  ]);
  const enrolment = await Enrollment.findOne({ user: req.user._id, course: lesson.course });

  if (!mayBypassGate({ user: req.user, course })) {
    const gate = gateFor({ lesson, module: mod, enrolment });
    if (isLocked(gate)) throw ApiError.forbidden('You need to be enrolled to download this');
  }

  const url = await presignGet(resource.key, VIDEO_URL_TTL_SECONDS);
  return ok(res, {
    url,
    name: resource.name || resource.title,
    expiresAt: new Date(Date.now() + VIDEO_URL_TTL_SECONDS * 1000),
  });
});

// GET /lms/lessons/:lessonId/transcript. Synced captions (L2).
export const transcript = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId).select('transcript course');
  if (!lesson) throw ApiError.notFound('Lesson not found');
  return ok(res, lesson.transcript ?? []);
});

/* ---- Enrolment (L6) -------------------------------------------------------- */

// POST /lms/enrollments. Free courses only.
//
// A paid course is NEVER enrolled here. That enrolment is created by the
// payment webhook when Stripe confirms the charge; letting a client ask for it
// would be letting a client grant itself a paid course.
export const enrol = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.body.courseId);
  if (!course || course.status !== CONTENT_STATUS.PUBLISHED) {
    throw ApiError.notFound('Course not found');
  }
  if (course.price > 0) {
    throw ApiError.badRequest('This course must be purchased');
  }

  const existing = await Enrollment.findOne({ user: req.user._id, course: course._id });
  if (existing) return ok(res, existing);

  const enrolment = await Enrollment.create({
    user: req.user._id,
    course: course._id,
    source: ENROLMENT_SOURCE.FREE,
  });
  return created(res, enrolment);
});

// Lessons in the order a learner meets them: by module order, then by lesson
// order within it. `order` is per-module, so sorting lessons alone would
// interleave module 2's first lesson with module 1's.
function inCourseOrder(modules, lessons) {
  const rank = new Map(modules.map((m, i) => [String(m._id), i]));
  return [...lessons].sort((a, b) => {
    const ma = rank.get(String(a.module)) ?? Infinity;
    const mb = rank.get(String(b.module)) ?? Infinity;
    return ma - mb || (a.order ?? 0) - (b.order ?? 0);
  });
}

// Everything derived about one learner's place in one course: how far in they
// are, what is next and whether it is gated, and the certificate if they've
// finished. Both the course page and My Courses show this, and computing it in
// one place is what stops those two screens disagreeing about what "next" is.
async function rollupFor({
  userId,
  courseId,
  modules,
  lessons,
  enrolment,
  progress,
  // The per-module breakdown the progress page expands to. Opt-in, because the
  // outline endpoint already sends the modules in full and would be carrying
  // the same counts twice.
  withModules = false,
}) {
  const ordered = inCourseOrder(modules, lessons);
  const done = new Set((progress?.completedLessons ?? []).map(String));
  const remaining = ordered.filter((l) => !done.has(String(l._id)));

  const first = remaining[0] ?? null;
  let next = null;
  if (first) {
    const mod = modules.find((m) => String(m._id) === String(first.module));
    const gate = gateFor({ lesson: first, module: mod, enrolment });
    next = {
      id: first._id,
      title: first.title,
      kind: first.kind,
      gate: gate.reason === 'open' || gate.reason === 'preview' ? null : gate,
    };
  }

  const certificate = await Certificate.findOne({ user: userId, course: courseId, revokedAt: null })
    .select('_id issuedAt')
    .lean();

  const total = ordered.length;

  // `order` is a zero-based sort key, not a label, so the number shown is the
  // module's position in the sorted list. Same rule the outline follows.
  const moduleRows = withModules
    ? modules.map((m, i) => {
        const own = lessons.filter((l) => String(l.module) === String(m._id));
        const doneHere = own.filter((l) => done.has(String(l._id))).length;
        return {
          id: m._id,
          order: i + 1,
          title: m.title,
          done: doneHere,
          total: own.length,
          percent: own.length ? Math.round((doneHere / own.length) * 100) : 0,
        };
      })
    : undefined;

  return {
    moduleCount: modules.length,
    lessonsTotal: total,
    lessonsDone: done.size,
    percent: total ? Math.round((done.size / total) * 100) : 0,
    minutesLearned: progress?.minutesLearned ?? 0,
    minutesLeft: remaining.reduce((s, l) => s + (l.minutes || 0), 0),
    lastAccessedAt: progress?.lastLessonAt ?? null,
    next,
    certificate: certificate ? { id: certificate._id, earnedAt: certificate.issuedAt } : null,
    ...(moduleRows ? { modules: moduleRows } : {}),
  };
}

// GET /lms/enrollments. The learner's courses, with everything My Courses puts
// on a card: progress, what's next and why it might be locked, and the
// certificate if the course is finished.
//
// Rolled up here rather than left to the client because "what's next" depends
// on the drip gate, and gateFor() is the server's decision to make.
export const myEnrollments = asyncHandler(async (req, res) => {
  const enrolments = await Enrollment.find({ user: req.user._id, revokedAt: null })
    .populate('course')
    .lean();

  const rows = await Promise.all(
    enrolments.filter((e) => e.course).map(async (e) => {
      const courseId = e.course._id;
      const [modules, lessons, progress] = await Promise.all([
        Module.find({ course: courseId }).sort({ order: 1 }).lean(),
        Lesson.find({ course: courseId }).select('title kind minutes preview module order').lean(),
        Progress.findOne({ user: req.user._id, course: courseId }).lean(),
      ]);

      const rollup = await rollupFor({
        userId: req.user._id,
        courseId,
        modules,
        lessons,
        enrolment: e,
        progress,
        // My Courses ignores this; the progress page expands into it. One
        // request either way, rather than a second round of outline calls just
        // to count lessons the server has already counted.
        withModules: true,
      });
      return { ...e, ...rollup };
    }),
  );

  return ok(res, rows);
});

/* ---- Progress (L3) --------------------------------------------------------- */

// Marks a lesson complete and, if that finishes the course, issues the
// certificate. Completion and issuance happen together on the server so a
// learner can't reach one without the other.
export const completeLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const enrolment = await Enrollment.findOne({ user: req.user._id, course: lesson.course });
  if (!enrolment?.isActive()) throw ApiError.forbidden('You need to be enrolled in this course');

  const progress =
    (await Progress.findOne({ user: req.user._id, course: lesson.course })) ??
    new Progress({ user: req.user._id, course: lesson.course });

  const already = progress.completedLessons.some((id) => String(id) === String(lesson._id));
  if (!already) {
    progress.completedLessons.push(lesson._id);
    progress.minutesLearned += lesson.minutes || 0;
  }
  progress.lastLesson = lesson._id;
  progress.lastLessonAt = new Date();
  await progress.save();

  const total = await Lesson.countDocuments({ course: lesson.course });
  const finished = progress.completedLessons.length >= total && total > 0;

  let certificate = null;
  if (finished && !enrolment.completedAt) {
    enrolment.completedAt = new Date();
    await enrolment.save();
    certificate = await issueCertificate({ user: req.user, courseId: lesson.course });
  }

  return ok(res, {
    completedLessons: progress.completedLessons,
    lessonsDone: progress.completedLessons.length,
    lessonsTotal: total,
    percent: total ? Math.round((progress.completedLessons.length / total) * 100) : 0,
    courseComplete: finished,
    certificate,
  });
});

// PATCH /lms/progress/lessons/:lessonId/position. Video resume point.
export const setPosition = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId).select('course');
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const progress =
    (await Progress.findOne({ user: req.user._id, course: lesson.course })) ??
    new Progress({ user: req.user._id, course: lesson.course });

  progress.positions.set(String(lesson._id), Number(req.body.seconds) || 0);
  await progress.save();
  return ok(res, { saved: true });
});

export const myProgress = asyncHandler(async (req, res) => {
  const rows = await Progress.find({ user: req.user._id }).lean();
  return ok(res, rows);
});

/* ---- Quizzes (L3) ---------------------------------------------------------- */

// GET /lms/quizzes/:lessonId. The quiz WITHOUT its answer key.
export const getQuiz = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson || lesson.kind !== 'quiz') throw ApiError.notFound('Quiz not found');

  const [course, enrolment] = await Promise.all([
    Course.findById(lesson.course),
    Enrollment.findOne({ user: req.user._id, course: lesson.course }),
  ]);

  // The same audience that reaches lesson video and documents without an
  // enrolment: the author, who wrote the questions, and staff, who have to be
  // able to sit the quiz before approving the course it belongs to. Reviewing
  // an assessment you cannot open is signing off on a question count.
  //
  // Without this an instructor previewing their own course was told to enrol in
  // it, which is not something they can do — `enrol` requires the course to be
  // published, and it isn't yet.
  const bypass = mayBypassGate({ user: req.user, course });
  if (!bypass && !enrolment?.isActive() && !lesson.preview) {
    throw ApiError.forbidden('You need to be enrolled in this course');
  }

  const attempts = await QuizAttempt.countDocuments({ user: req.user._id, lesson: lesson._id });
  const max = lesson.quiz.maxAttempts;
  // The attempt limit is a learner's. An author checking their own questions is
  // not spending one, so it isn't counted against them either.
  if (!bypass && max > 0 && attempts >= max) {
    throw ApiError.forbidden(`You have used all ${max} attempts on this quiz`);
  }

  // forLearner() strips `correct`, `accept` and `explanation`.
  const safe = lesson.forLearner();
  return ok(res, { lesson: safe, attemptsUsed: attempts, maxAttempts: max });
});

// POST /lms/quizzes/:lessonId/submit. The server marks it.
export const submitQuiz = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson || lesson.kind !== 'quiz') throw ApiError.notFound('Quiz not found');

  const [course, enrolment] = await Promise.all([
    Course.findById(lesson.course),
    Enrollment.findOne({ user: req.user._id, course: lesson.course }),
  ]);

  // Matches getQuiz: an author or a reviewer can sit their own quiz. A quiz you
  // can open but not submit tells you nothing about whether the marking is
  // right, which is the half most worth checking before it goes live.
  const bypass = mayBypassGate({ user: req.user, course });
  if (!bypass && !enrolment?.isActive()) {
    throw ApiError.forbidden('You need to be enrolled in this course');
  }

  const max = lesson.quiz.maxAttempts;
  if (!bypass && max > 0) {
    const used = await QuizAttempt.countDocuments({ user: req.user._id, lesson: lesson._id });
    if (used >= max) throw ApiError.forbidden(`You have used all ${max} attempts`);
  }

  // Note what is NOT read from the body: any score, percent or passed flag.
  const marked = markAttempt(lesson.quiz, req.body.answers ?? []);

  const attempt = await QuizAttempt.create({
    user: req.user._id,
    course: lesson.course,
    lesson: lesson._id,
    ...marked,
    durationSeconds: Number(req.body.durationSeconds) || 0,
    submittedAt: new Date(),
  });

  return created(res, {
    attempt: {
      _id: attempt._id,
      score: attempt.score,
      total: attempt.total,
      percent: attempt.percent,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt,
    },
    // Safe now: the attempt is marked, so the explanations teach rather than leak.
    review: reviewFor(lesson.quiz, attempt),
    passMark: lesson.quiz.passMark,
    // Same shape as GET /quizzes/attempts/:id, so the result screen reads one
    // object whether it arrived here from a submission or from a bookmark.
    title: lesson.title,
  });
});

// GET /lms/quizzes/:lessonId/attempts. This learner's history.
export const myAttempts = asyncHandler(async (req, res) => {
  const attempts = await QuizAttempt.find({ user: req.user._id, lesson: req.params.lessonId })
    .sort({ submittedAt: -1 })
    .select('score total percent passed submittedAt durationSeconds')
    .lean();
  return ok(res, attempts);
});

// GET /lms/quizzes/attempts. Every quiz this learner has taken, across every
// course, folded to one row per quiz.
//
// The progress page shows a learner's STANDING, which is their best result on
// each quiz rather than their most recent one, alongside how many goes it took.
// Folding it here rather than in the browser means the page makes one request
// instead of one per quiz lesson, and the best score is the one the server
// awarded rather than a number re-derived from stored answers — which is what
// the old client-side version needed the answer key to do.
export const allMyAttempts = asyncHandler(async (req, res) => {
  const attempts = await QuizAttempt.find({ user: req.user._id })
    .sort({ submittedAt: -1 })
    .select('lesson course score total percent passed submittedAt')
    .lean();
  if (!attempts.length) return ok(res, []);

  const [lessons, courses] = await Promise.all([
    Lesson.find({ _id: { $in: attempts.map((a) => a.lesson) } })
      .select('title course')
      .lean(),
    Course.find({ _id: { $in: attempts.map((a) => a.course) } })
      .select('title slug')
      .lean(),
  ]);
  const lessonById = new Map(lessons.map((l) => [String(l._id), l]));
  const courseById = new Map(courses.map((c) => [String(c._id), c]));

  const byLesson = new Map();
  attempts.forEach((a) => {
    const lesson = lessonById.get(String(a.lesson));
    const course = courseById.get(String(a.course));
    // A quiz that has since been deleted leaves attempts behind. They are not
    // worth a row headed "undefined", and there is nowhere for it to link to.
    if (!lesson || !course) return;

    const key = String(a.lesson);
    const row = byLesson.get(key) ?? {
      lesson: a.lesson,
      title: lesson.title,
      course: { id: course._id, slug: course.slug, title: course.title },
      attempts: 0,
      // Attempts arrive newest first, so the first one seen is the latest.
      lastAttemptAt: a.submittedAt,
      best: null,
    };

    row.attempts += 1;
    if (!row.best || a.percent > row.best.percent) {
      row.best = {
        _id: a._id,
        score: a.score,
        total: a.total,
        percent: a.percent,
        passed: a.passed,
        submittedAt: a.submittedAt,
      };
    }
    byLesson.set(key, row);
  });

  return ok(res, [...byLesson.values()].sort((a, b) => b.best.percent - a.best.percent));
});

// GET /lms/quizzes/attempts/:attemptId. One marked attempt, with its review.
//
// The submit response already carries this, so the result screen has it in hand
// the moment it opens. This exists for the second visit: a refresh, a bookmark,
// or the "Review" link from the attempt history. Without it a marked attempt is
// only readable in the seconds after it was marked.
//
// Scoped to the signed-in learner, so an attempt id is not a way to read
// somebody else's paper.
export const getAttemptById = asyncHandler(async (req, res) => {
  const attempt = await QuizAttempt.findOne({ _id: req.params.attemptId, user: req.user._id });
  if (!attempt) throw ApiError.notFound('Attempt not found');

  const lesson = await Lesson.findById(attempt.lesson);
  if (!lesson) throw ApiError.notFound('Attempt not found');

  return ok(res, {
    attempt: {
      _id: attempt._id,
      lesson: attempt.lesson,
      score: attempt.score,
      total: attempt.total,
      percent: attempt.percent,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt,
      durationSeconds: attempt.durationSeconds,
    },
    title: lesson.title,
    passMark: lesson.quiz?.passMark ?? 70,
    // Safe: this attempt is already marked, so the explanations teach rather
    // than leak. See the note on reviewFor().
    review: reviewFor(lesson.quiz, attempt),
  });
});

/* ---- Certificates (L4) ----------------------------------------------------- */

// Issued by the server, never requested by a client. Snapshots the names so the
// document still reads correctly if the course or the learner is renamed later.
async function issueCertificate({ user, courseId }) {
  const existing = await Certificate.findOne({ user: user._id, course: courseId });
  if (existing) return existing;

  const course = await Course.findById(courseId);
  if (!course) return null;

  const lessons = await Lesson.find({ course: courseId }).select('minutes');
  const hours = Math.round(lessons.reduce((s, l) => s + (l.minutes || 0), 0) / 60);

  // The instructor's wording for THIS course, copied in rather than referenced.
  // Rewording the course's certificate later must not silently reword every one
  // already issued: those are documents people have downloaded and filed.
  const c = { ...CERTIFICATE_DEFAULTS, ...(course.certificate?.toObject?.() ?? course.certificate ?? {}) };

  return Certificate.create({
    user: user._id,
    course: courseId,
    credentialId: `GP-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
    recipientName: user.name,
    title: course.title,
    hours,
    issuerName: c.issuerName || 'Government Procurement',
    // The instructor's named signatory wins; the course byline is the fallback.
    signatoryName: c.signatoryName || course.instructor?.name || '',
    signatoryRole: c.signatoryRole || course.instructor?.role || '',
    design: {
      heading: c.heading,
      preamble: c.preamble,
      statement: c.statement,
      footnote: c.footnote,
      accent: c.accent,
      background: c.background,
      textColor: c.textColor,
      showHours: c.showHours,
      showCredentialId: c.showCredentialId,
    },
  });
}

export const myCertificates = asyncHandler(async (req, res) => {
  const rows = await Certificate.find({ user: req.user._id, revokedAt: null })
    .sort({ issuedAt: -1 })
    .lean();
  return ok(res, rows);
});

export const getCertificate = asyncHandler(async (req, res) => {
  const cert = await Certificate.findOne({ _id: req.params.id, user: req.user._id });
  if (!cert) throw ApiError.notFound('Certificate not found');
  return ok(res, cert);
});

// GET /lms/certificates/verify/:credentialId. PUBLIC, no auth.
//
// An employer checking a credential has no account here. It returns only what
// confirms the claim, and distinguishes "revoked" from "never existed" because
// those mean different things to whoever is asking.
export const verifyCertificate = asyncHandler(async (req, res) => {
  const cert = await Certificate.findOne({ credentialId: req.params.credentialId });
  if (!cert) throw ApiError.notFound('No certificate with that credential ID');
  return ok(res, cert.toVerification());
});
