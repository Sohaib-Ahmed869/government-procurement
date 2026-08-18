import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/apiResponse.js';
import { Course } from '../../models/Course.js';
import { Lesson } from '../../models/Lesson.js';
import { Enrollment } from '../../models/Enrollment.js';
import { Progress } from '../../models/Progress.js';
import { QuizAttempt } from '../../models/QuizAttempt.js';

/* ---------------------------------------------------------------------------
   Cohort analytics for the teaching side (L3 / R1).

   Enrolments answers "who is on this course and how far in are they". This
   answers the other question an instructor has: "is my assessment any good, and
   who is stuck".

   Everything is computed from QuizAttempt records, which the server writes when
   it marks a submission. Nothing here is derived from a client's own copy of
   anything, which is what makes a pass rate worth quoting.
   ------------------------------------------------------------------------ */

// A learner who has not touched a course in this long, and has not finished it,
// is stuck rather than merely slow. Two weeks is a judgement call: short enough
// that a nudge still lands, long enough not to flag someone on annual leave.
const STALLED_DAYS = 14;
// The list is a to-do, not a report. Past this many it stops being actionable,
// and the response says how many were left out rather than quietly truncating.
const STALLED_LIMIT = 50;

const dayMs = 24 * 60 * 60 * 1000;
const mean = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);

// The instructor's own courses, and the quiz lessons inside them. Everything
// below is scoped by these ids, so ownership is enforced by what is loaded
// rather than by a check that could be forgotten later.
async function ownedQuizzes(userId) {
  const courses = await Course.find({ author: userId }).select('title slug status').lean();
  if (!courses.length) return { courses: [], courseById: new Map(), quizzes: [] };

  const quizzes = await Lesson.find({
    course: { $in: courses.map((c) => c._id) },
    kind: 'quiz',
  })
    .select('title course quiz')
    .lean();

  return {
    courses,
    courseById: new Map(courses.map((c) => [String(c._id), c])),
    quizzes,
  };
}

// One quiz's numbers, from its attempts.
//
// Rates are per LEARNER, not per attempt. "62% pass rate" has to mean 62% of
// the people got through it; counting attempts instead would let one learner
// failing six times drag the figure down as if six people had.
function summarise(attempts) {
  const byLearner = new Map();
  attempts.forEach((a) => {
    const key = String(a.user);
    const seen = byLearner.get(key) ?? { attempts: [], passed: false };
    seen.attempts.push(a);
    if (a.passed) seen.passed = true;
    byLearner.set(key, seen);
  });

  const learners = [...byLearner.values()];
  // Attempts arrive newest first, so the last of each learner's is their first.
  const firsts = learners.map((l) => l.attempts[l.attempts.length - 1].percent);
  const bests = learners.map((l) => Math.max(...l.attempts.map((a) => a.percent)));
  const passedCount = learners.filter((l) => l.passed).length;

  // How many goes it takes the people who get there. Learners who never passed
  // are left out on purpose: including them measures how long they gave up
  // after, which is a different question.
  const attemptsToPass = learners
    .filter((l) => l.passed)
    .map((l) => {
      const inOrder = [...l.attempts].reverse();
      return inOrder.findIndex((a) => a.passed) + 1;
    });

  return {
    learners: learners.length,
    attempts: attempts.length,
    passed: passedCount,
    passRate: learners.length ? Math.round((passedCount / learners.length) * 100) : 0,
    averageFirst: mean(firsts),
    averageBest: mean(bests),
    averageAttempts: learners.length
      ? Math.round((attempts.length / learners.length) * 10) / 10
      : 0,
    averageAttemptsToPass: attemptsToPass.length
      ? Math.round((attemptsToPass.reduce((s, n) => s + n, 0) / attemptsToPass.length) * 10) / 10
      : null,
  };
}

// GET /lms/authoring/analytics. The progress page: every quiz with attempts on
// it, plus the learners who have stopped.
export const cohortAnalytics = asyncHandler(async (req, res) => {
  const { courses, courseById, quizzes } = await ownedQuizzes(req.user._id);

  const attempts = quizzes.length
    ? await QuizAttempt.find({ lesson: { $in: quizzes.map((q) => q._id) } })
        .sort({ submittedAt: -1 })
        .select('user lesson percent passed submittedAt')
        .lean()
    : [];

  const byLesson = new Map();
  attempts.forEach((a) => {
    const key = String(a.lesson);
    byLesson.set(key, [...(byLesson.get(key) ?? []), a]);
  });

  const rows = quizzes.map((q) => {
    const own = byLesson.get(String(q._id)) ?? [];
    const course = courseById.get(String(q.course));
    return {
      lesson: q._id,
      title: q.title,
      course: course
        ? { _id: course._id, title: course.title, slug: course.slug }
        : null,
      questionCount: q.quiz?.questions?.length ?? 0,
      passMark: q.quiz?.passMark ?? 70,
      lastAttemptAt: own[0]?.submittedAt ?? null,
      ...summarise(own),
    };
  });

  // Taken quizzes first, hardest first within them: this page exists to surface
  // the assessment that isn't working, so it should be the first row.
  rows.sort(
    (a, b) => b.learners - a.learners || a.passRate - b.passRate,
  );

  const taken = rows.filter((r) => r.learners > 0);
  const totals = {
    quizzes: rows.length,
    taken: taken.length,
    attempts: attempts.length,
    // Distinct people, across every quiz. Someone who took three is one learner.
    learnersAssessed: new Set(attempts.map((a) => String(a.user))).size,
    passRate: taken.length ? mean(taken.map((r) => r.passRate)) : 0,
  };

  return ok(res, { totals, quizzes: rows, stalled: await stalledFor(courses) });
});

// Learners who have stopped. Two ways to be stuck, and they need different
// nudges, so the reason is returned rather than left to be guessed.
async function stalledFor(courses) {
  if (!courses.length) return { rows: [], omitted: 0, afterDays: STALLED_DAYS };

  const courseIds = courses.map((c) => c._id);
  const cutoff = new Date(Date.now() - STALLED_DAYS * dayMs);

  const [enrolments, progresses, lessonCounts] = await Promise.all([
    Enrollment.find({ course: { $in: courseIds }, revokedAt: null, completedAt: null })
      .populate('user', 'name email')
      .lean(),
    Progress.find({ course: { $in: courseIds } })
      .select('user course completedLessons lastLessonAt')
      .lean(),
    Lesson.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: '$course', n: { $sum: 1 } } },
    ]),
  ]);

  const progressBy = new Map(
    progresses.map((p) => [`${p.user}:${p.course}`, p]),
  );
  const lessonsBy = new Map(lessonCounts.map((r) => [String(r._id), r.n]));
  const courseBy = new Map(courses.map((c) => [String(c._id), c]));

  const rows = [];
  enrolments.forEach((e) => {
    if (!e.user) return;
    const progress = progressBy.get(`${e.user._id}:${e.course}`);
    const lastActive = progress?.lastLessonAt ?? null;
    const done = progress?.completedLessons?.length ?? 0;

    // Never opened a lesson: idle since they enrolled. Otherwise: idle since
    // they last did one.
    const since = lastActive ?? e.enrolledAt;
    if (!since || new Date(since) > cutoff) return;

    const total = lessonsBy.get(String(e.course)) ?? 0;
    rows.push({
      user: { _id: e.user._id, name: e.user.name, email: e.user.email },
      course: {
        _id: e.course,
        title: courseBy.get(String(e.course))?.title ?? '',
      },
      reason: done > 0 ? 'idle' : 'never-started',
      lessonsDone: done,
      lessonsTotal: total,
      percent: total ? Math.round((done / total) * 100) : 0,
      lastActiveAt: lastActive,
      enrolledAt: e.enrolledAt,
      idleDays: Math.floor((Date.now() - new Date(since).getTime()) / dayMs),
    });
  });

  rows.sort((a, b) => b.idleDays - a.idleDays);
  return {
    rows: rows.slice(0, STALLED_LIMIT),
    omitted: Math.max(0, rows.length - STALLED_LIMIT),
    afterDays: STALLED_DAYS,
  };
}

// GET /lms/authoring/analytics/quizzes/:lessonId. Item analysis for one quiz:
// how each question performed.
//
// This is the part an instructor cannot get anywhere else. A question everyone
// fails is usually a question that is wrong — an ambiguous prompt, two
// defensible answers, or an answer key with the wrong option ticked — and
// without this it looks like a cohort that didn't do the reading.
export const quizAnalytics = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId).lean();
  if (!lesson || lesson.kind !== 'quiz') throw ApiError.notFound('Quiz not found');

  const course = await Course.findById(lesson.course).select('title slug author').lean();
  // Ownership is checked here rather than by route middleware, because the id
  // in the URL is a LESSON, and `owns` works on a course id.
  if (!course || String(course.author) !== String(req.user._id)) {
    throw ApiError.notFound('Quiz not found');
  }

  const attempts = await QuizAttempt.find({ lesson: lesson._id })
    .sort({ submittedAt: -1 })
    .select('user answers percent passed submittedAt durationSeconds')
    .lean();

  // Counted per question id against the CURRENT quiz. A question that has since
  // been deleted has answers in old attempts and nowhere to show them; a
  // question added yesterday was not asked of everyone, so its counts are its
  // own rather than the attempt total.
  const stats = new Map();
  attempts.forEach((a) => {
    (a.answers ?? []).forEach((ans) => {
      const key = String(ans.question);
      const row = stats.get(key) ?? { asked: 0, correct: 0, skipped: 0, chose: new Map() };
      row.asked += 1;
      if (ans.correct) row.correct += 1;
      if (!ans.given?.length) row.skipped += 1;
      // What people actually picked, which is where a misleading distractor
      // shows up: one wrong option taking most of the answers is a different
      // problem from the answers being spread evenly.
      (ans.given ?? []).forEach((g) => row.chose.set(g, (row.chose.get(g) ?? 0) + 1));
      stats.set(key, row);
    });
  });

  // A true/false question stores no options — the two are implied — but the
  // split between them is worth seeing for exactly the same reason as any other
  // distribution, so it is filled in here rather than left blank on the page.
  const BOOLEAN_OPTIONS = [
    { id: 'true', text: 'True' },
    { id: 'false', text: 'False' },
  ];

  const questions = (lesson.quiz?.questions ?? []).map((q, i) => {
    const row = stats.get(String(q._id)) ?? { asked: 0, correct: 0, skipped: 0, chose: new Map() };
    const options = q.type === 'boolean' ? BOOLEAN_OPTIONS : q.options ?? [];
    return {
      _id: q._id,
      number: i + 1,
      prompt: q.prompt,
      type: q.type,
      explanation: q.explanation ?? '',
      asked: row.asked,
      correct: row.correct,
      skipped: row.skipped,
      correctRate: row.asked ? Math.round((row.correct / row.asked) * 100) : null,
      // Only meaningful where there are options to choose between. A short
      // answer has none, so it falls through to its accepted-answers list.
      options: options.map((o) => ({
        id: o.id,
        text: o.text,
        chose: row.chose.get(o.id) ?? 0,
        isAnswer: (q.correct ?? []).map(String).includes(String(o.id)),
      })),
      answer: q.type === 'text' ? q.accept ?? [] : q.correct ?? [],
    };
  });

  return ok(res, {
    course: { _id: course._id, title: course.title, slug: course.slug },
    lesson: { _id: lesson._id, title: lesson.title },
    passMark: lesson.quiz?.passMark ?? 70,
    ...summarise(attempts),
    questions,
  });
});
