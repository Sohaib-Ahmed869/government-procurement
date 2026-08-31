import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/apiResponse.js';
import { CATALOGUE, EMPTY_STATS, scoreFor } from '../../constants/badges.js';
import { localDay } from './study.controller.js';
import { Enrollment } from '../../models/Enrollment.js';
import { Progress } from '../../models/Progress.js';
import { Certificate } from '../../models/Certificate.js';
import { QuizAttempt } from '../../models/QuizAttempt.js';
import { Note } from '../../models/Note.js';
import { Bookmark } from '../../models/Bookmark.js';
import { Review } from '../../models/Review.js';
import { Discussion } from '../../models/Discussion.js';
import { LearningActivity } from '../../models/LearningActivity.js';
import { User } from '../../models/User.js';
import { ROLES } from '../../constants/roles.js';

/* Cohort standings (L5).

   This replaces five invented people. `LeaderboardTable` shipped with a
   hardcoded PEERS array — Priya Raman on 285 points, Tom Alderton on 240 — and
   the signed-in learner's real row sorted in among them. It looked like a
   leaderboard and it ranked one person against fiction, so a learner who did
   the work still could not move, and one who had done nothing was told they
   were sixth of six.

   A leaderboard is the one part of the badge scheme that cannot be computed on
   the client, because it needs everyone else's record and a client cannot be
   handed other learners' progress. So it is computed here, from the same
   catalogue (constants/badges.js), and what goes back is a name, an initialled
   avatar, a level and a total — never anybody else's underlying activity.

   WHO IS IN IT: learners with an active enrolment on a course the signed-in
   learner is also actively enrolled in. That is what the card says on the page
   ("Among learners on your courses"), and it is the narrowest scope that still
   contains people worth being ranked against. Instructors and staff are left
   out: they are not learning on the course, and an instructor sitting at the
   top of their own students' table is a scoreboard nobody asked to be in.

   WHAT COMES BACK: a ranked slice, not the whole table — the top few plus the
   signed-in learner's own neighbours. The table only ever shows a handful of
   rows, and sending every learner's total is both an unbounded payload and a
   quiet disclosure of how everyone in the cohort is doing to everyone else. */

// How many rows the page draws. The top of the table plus a window either side
// of the learner, which is what makes the standings useful to somebody in the
// middle: their own next rung is visible without scrolling past everyone.
const TOP_COUNT = 3;
const NEIGHBOURS = 2;

// Guard rails on the cohort. A course with several thousand learners must not
// turn one page load into an aggregation over all of them; the slice that comes
// back is a handful of rows either way, and the ranking is stable well before
// this. Ordered by most recently enrolled so the cap keeps the active cohort.
const MAX_COHORT = 500;

const idKey = (id) => String(id);

/* ---- The stats every badge measures, for a set of learners ----------------

   One grouped aggregation per collection rather than one query per learner: a
   cohort of two hundred would otherwise be two thousand round trips. Each
   returns `{ _id: userId, n }` and is folded into the same map. */
async function statsForUsers(userIds, tzOffset) {
  const stats = new Map(userIds.map((id) => [idKey(id), { ...EMPTY_STATS }]));
  const bump = (rows, field) => {
    rows.forEach((r) => {
      const row = stats.get(idKey(r._id));
      if (row) row[field] = r.n;
    });
  };

  const [
    lessons,
    coursesComplete,
    certificates,
    pathCertificates,
    quizzesPassed,
    perfectScores,
    notes,
    bookmarks,
    reviews,
    questionsAsked,
    repliesPosted,
    activity,
  ] = await Promise.all([
    // Progress holds one document per learner per course, so "lessons done" is
    // the size of `completedLessons` summed across a learner's courses.
    Progress.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', n: { $sum: { $size: { $ifNull: ['$completedLessons', []] } } } } },
    ]),
    Enrollment.aggregate([
      { $match: { user: { $in: userIds }, completedAt: { $ne: null }, revokedAt: null } },
      { $group: { _id: '$user', n: { $sum: 1 } } },
    ]),
    Certificate.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', n: { $sum: 1 } } },
    ]),
    /* Paths completed, measured as path certificates held.

       The client counts programs whose steps are all done. Here the certificate
       IS the record of that: one is issued per learner per program on
       completion, with a unique index behind it. The two can only disagree for
       a learner who finished a path before certificates were issued for
       programs at all, which is a smaller error than re-deriving path
       completion from every step of every program for every learner in the
       cohort on every page load. */
    Certificate.aggregate([
      { $match: { user: { $in: userIds }, kind: 'path' } },
      { $group: { _id: '$user', n: { $sum: 1 } } },
    ]),
    QuizAttempt.aggregate([
      { $match: { user: { $in: userIds }, passed: true } },
      // Distinct quizzes, not attempts: five goes at one quiz is one quiz
      // passed. `lesson` is the quiz — see the QuizAttempt model.
      { $group: { _id: { user: '$user', lesson: '$lesson' } } },
      { $group: { _id: '$_id.user', n: { $sum: 1 } } },
    ]),
    QuizAttempt.aggregate([
      { $match: { user: { $in: userIds }, percent: 100 } },
      { $group: { _id: { user: '$user', lesson: '$lesson' } } },
      { $group: { _id: '$_id.user', n: { $sum: 1 } } },
    ]),
    Note.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', n: { $sum: 1 } } },
    ]),
    Bookmark.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', n: { $sum: 1 } } },
    ]),
    Review.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', n: { $sum: 1 } } },
    ]),
    Discussion.aggregate([
      { $match: { author: { $in: userIds } } },
      { $group: { _id: '$author', n: { $sum: 1 } } },
    ]),
    // Replies are subdocuments on the thread, and the thread's own author is
    // not necessarily the replier — so unwind and group on the reply's author.
    Discussion.aggregate([
      { $unwind: '$replies' },
      { $match: { 'replies.author': { $in: userIds } } },
      { $group: { _id: '$replies.author', n: { $sum: 1 } } },
    ]),
    // The streak needs the days themselves, not a count.
    LearningActivity.find({ user: { $in: userIds } })
      .select('user day')
      .sort('-day')
      .lean(),
  ]);

  bump(lessons, 'lessonsDone');
  bump(coursesComplete, 'coursesComplete');
  bump(certificates, 'certificates');
  bump(pathCertificates, 'pathsComplete');
  bump(quizzesPassed, 'quizzesPassed');
  bump(perfectScores, 'perfectScores');
  bump(notes, 'notes');
  bump(bookmarks, 'bookmarks');
  bump(reviews, 'reviewsWritten');
  bump(questionsAsked, 'questionsAsked');
  bump(repliesPosted, 'repliesPosted');

  const daysByUser = new Map();
  activity.forEach((r) => {
    const key = idKey(r.user);
    if (!daysByUser.has(key)) daysByUser.set(key, new Set());
    daysByUser.get(key).add(r.day);
  });
  const today = localDay(tzOffset);
  daysByUser.forEach((days, key) => {
    const row = stats.get(key);
    if (row) row.streak = streakFrom(days, today);
  });

  return stats;
}

/* Consecutive days of activity, counting back from today.

   Yesterday is where a live streak may legitimately start: somebody who studied
   every day for a week and has not opened the app yet TODAY still has a
   seven-day streak, and zeroing it at midnight would punish them for the hour.
   So a run ending yesterday counts; a gap before that ends it. */
function streakFrom(days, today) {
  if (!days.size) return 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  for (;;) {
    const day = cursor.toISOString().slice(0, 10);
    if (!days.has(day)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/* ---- GET /lms/badges/leaderboard ---------------------------------------- */
export const leaderboard = asyncHandler(async (req, res) => {
  const meId = req.user._id;

  // The courses the signed-in learner is actually in. No enrolments, no cohort
  // — and that is a real state to render, not an error.
  const mine = await Enrollment.find({ user: meId, revokedAt: null }).select('course').lean();
  const courseIds = mine.map((e) => e.course);

  const me = {
    id: idKey(meId),
    name: req.user.name,
    isYou: true,
    ...scoreFor((await statsForUsers([meId], req.query.tzOffset)).get(idKey(meId))),
  };

  if (!courseIds.length) {
    // Alone on the board rather than sixth of five invented people. `rank: 1`
    // is honest — there is nobody else on the courses they are taking.
    return ok(res, { rows: [{ ...me, rank: 1 }], you: { ...me, rank: 1 }, cohort: 1 });
  }

  const peerEnrolments = await Enrollment.find({ course: { $in: courseIds }, revokedAt: null })
    .select('user')
    .sort('-enrolledAt')
    .limit(MAX_COHORT)
    .lean();

  const peerIds = [...new Map(peerEnrolments.map((e) => [idKey(e.user), e.user])).values()];

  // Students only. Instructors and staff share the user collection, so an
  // enrolment alone does not say somebody is a learner on the course.
  const learners = await User.find({ _id: { $in: peerIds }, role: ROLES.STUDENT })
    .select('name')
    .lean();

  const withMe = learners.some((u) => idKey(u._id) === idKey(meId))
    ? learners
    : [...learners, { _id: meId, name: req.user.name }];

  const stats = await statsForUsers(
    withMe.map((u) => u._id),
    req.query.tzOffset,
  );

  const ranked = withMe
    .map((u) => ({
      id: idKey(u._id),
      name: u.name,
      isYou: idKey(u._id) === idKey(meId),
      ...scoreFor(stats.get(idKey(u._id))),
    }))
    // Points first, then name, so a table of ties has a stable order instead of
    // reshuffling itself between requests.
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((row, i) => ({ ...row, rank: i + 1 }));

  const myIndex = ranked.findIndex((r) => r.isYou);
  const youRow = ranked[myIndex] ?? { ...me, rank: ranked.length + 1 };

  // The top of the table, plus a window around the learner. Deduped and
  // re-sorted, so somebody already in the top three is not listed twice.
  const window = new Map();
  ranked.slice(0, TOP_COUNT).forEach((r) => window.set(r.rank, r));
  ranked
    .slice(Math.max(0, myIndex - NEIGHBOURS), myIndex + NEIGHBOURS + 1)
    .forEach((r) => window.set(r.rank, r));

  return ok(res, {
    rows: [...window.values()].sort((a, b) => a.rank - b.rank),
    you: youRow,
    cohort: ranked.length,
  });
});

// Exported for the badge page's own use if it ever needs the server's view of a
// learner's points — and so the catalogue has one importable definition here.
export const badgeCatalogueSize = CATALOGUE.length;
