import { useEffect, useMemo, useState } from 'react';
import { certificatesApi, enrollmentsApi, quizzesApi } from '../../api/lms.js';
import { useActivity } from './useActivity.js';

/* ---------------------------------------------------------------------------
   Everything on the learner dashboard, from the API.

   The page it feeds was written entirely as constants: a resume panel pointing
   at one hardcoded course, two stat tiles with the numbers 3 and 2 typed into
   them, three "upcoming" items with dates in August and four lines of recent
   activity naming lessons the learner had never opened. Every account saw the
   same dashboard, and finishing a course changed nothing on it.

   Three requests, the same three My Progress makes, so the two screens quote
   the same figures rather than two roundings of them:
     GET /lms/enrollments      what they are enrolled in and how far in
     GET /lms/quizzes/attempts every quiz they have sat
     GET /lms/certificates     what they have earned

   The fourth, GET /lms/activity, is shared with the chart on this same page —
   one request, read twice, rather than one per card.
   ------------------------------------------------------------------------ */

// Newest first, on whichever date field the record carries.
function byRecency(a, b) {
  return Date.parse(b.at ?? 0) - Date.parse(a.at ?? 0);
}

// "2h ago" / "Yesterday" / "4 days ago" / "12 Aug". Relative while that is the
// more useful reading, absolute once it stops being.
export function relativeTime(iso) {
  if (!iso) return '';
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';

  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return new Date(then).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/* The chart window, and the reason it is not 7.

   The dashboard's chart offers 7, 14 and 30 days, and the headline tile
   compares this week against the one before it — which needs fourteen days on
   its own. Asking for thirty once and slicing what each card needs is one
   request; asking per range is a request every time somebody presses a button,
   for data already in the browser. */
const WINDOW_DAYS = 30;

// Minutes over the last `n` days of the window.
function sumLast(rows, n) {
  return rows.slice(-n).reduce((total, r) => total + (r.minutes || 0), 0);
}

export function useDashboard() {
  const [data, setData] = useState({ enrolments: [], quizzes: [], certificates: [] });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  const { activity: fullActivity, streak, status: activityStatus } = useActivity(WINDOW_DAYS);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [enrolments, quizzes, certificates] = await Promise.all([
          enrollmentsApi.mine(),
          quizzesApi.allAttempts(),
          certificatesApi.mine(),
        ]);
        if (!alive) return;
        setData({
          // A revoked enrolment, or one whose course was deleted, comes back
          // without a course. Dropped rather than rendered as a nameless row.
          enrolments: (enrolments ?? []).filter((e) => e.course),
          quizzes: quizzes ?? [],
          certificates: certificates ?? [],
        });
        setStatus('ready');
      } catch (err) {
        if (!alive) return;
        setError(err?.message ?? 'Could not load your dashboard');
        setStatus('error');
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const view = useMemo(() => {
    const { enrolments, quizzes, certificates } = data;

    const started = enrolments.filter((e) => (e.lessonsDone ?? 0) > 0);
    const inProgress = enrolments.filter(
      (e) => (e.lessonsTotal ?? 0) > 0 && (e.lessonsDone ?? 0) < e.lessonsTotal,
    );

    /* The resume panel. The most recently touched course that still has a
       lesson left in it — which is what "continue" means, and is not the same
       as the most recently enrolled. A learner who has opened nothing yet gets
       their first enrolment instead, so the panel says "start" rather than
       disappearing on the account it matters most to. */
    const resumeFrom =
      [...inProgress]
        .filter((e) => e.lastAccessedAt)
        .sort((a, b) => Date.parse(b.lastAccessedAt) - Date.parse(a.lastAccessedAt))[0] ??
      inProgress[0] ??
      null;

    const resume = resumeFrom
      ? {
          courseTitle: resumeFrom.course.title,
          courseSlug: resumeFrom.course.slug,
          // `next` is the server's answer, gate included. A next lesson the
          // learner cannot open yet comes back locked, and the panel offers the
          // course rather than a link that will bounce them.
          lesson: resumeFrom.next ?? null,
          lessonsDone: resumeFrom.lessonsDone ?? 0,
          lessonsTotal: resumeFrom.lessonsTotal ?? 0,
          percent: resumeFrom.percent ?? 0,
          minutesLeft: resumeFrom.minutesLeft ?? 0,
          started: (resumeFrom.lessonsDone ?? 0) > 0,
        }
      : null;

    /* What is actually next, per course. There are no due dates anywhere in the
       model — no assignment deadlines, no cohort schedule — so this card cannot
       be "Upcoming" without inventing them, which is what the three hardcoded
       due dates it used to show were. It is the next lesson in each course
       instead: real, and the same thing the learner came here to find. */
    const nextUp = inProgress
      .filter((e) => e.next)
      .sort((a, b) => Date.parse(b.lastAccessedAt ?? 0) - Date.parse(a.lastAccessedAt ?? 0))
      .slice(0, 4)
      .map((e) => ({
        id: String(e._id),
        title: e.next.title,
        meta: e.course.title,
        kind: e.next.kind,
        // `gate` is null when the lesson is open. A gated lesson links to the
        // course rather than to a player that would turn it away.
        locked: Boolean(e.next.gate),
        lockReason: e.next.gate?.message ?? e.next.gate?.reason ?? '',
        to: e.next.gate
          ? `/learn/courses/${e.course.slug}`
          : `/learn/courses/${e.course.slug}/watch/${e.next.id}`,
      }));

    /* The recent feed, assembled from records that already exist rather than
       from an event log — there is no such log, and writing one for a list of
       four lines is a table to maintain forever. Each source contributes what
       it can date, and the merge takes the newest. */
    const recent = [
      ...certificates.map((c) => ({
        id: `cert-${c._id}`,
        icon: 'award',
        // The certificate carries its own title — the course's name at the
        // moment it was issued, which is the name that is printed on it.
        title: `Earned ${c.title}`,
        meta: c.credentialId ? `Credential ${c.credentialId}` : 'Certificate',
        at: c.issuedAt ?? c.createdAt,
      })),
      // GET /lms/quizzes/attempts groups by lesson and returns the best attempt
      // with the date of the latest, so one row per quiz rather than one per
      // sitting — a learner who took a quiz four times is one line here, not
      // four identical ones.
      ...quizzes
        .filter((q) => q.best)
        .map((q) => ({
          id: `quiz-${q.lesson}`,
          icon: 'quiz',
          title: `${q.best.passed ? 'Passed' : 'Scored'} ${q.best.percent}% on ${q.title}`,
          meta: q.course?.title ?? '',
          at: q.lastAttemptAt,
        })),
      ...started.map((e) => ({
        id: `course-${e._id}`,
        icon: 'check',
        title:
          (e.lessonsDone ?? 0) >= (e.lessonsTotal ?? 0) && (e.lessonsTotal ?? 0) > 0
            ? `Finished ${e.course.title}`
            : `${e.lessonsDone} of ${e.lessonsTotal} lessons in ${e.course.title}`,
        meta: 'Course progress',
        at: e.lastAccessedAt,
      })),
    ]
      .filter((row) => row.at)
      .sort(byRecency)
      .slice(0, 5);

    /* The breakdown behind the donut: which courses the learner's completed
       lessons actually sit in.

       Lessons rather than courses, because a count of courses is already two of
       the tiles above it and would tell the same story twice. This one answers
       "where has the time gone", which nothing else on the page does.

       Courses with nothing done are left out. A slice of zero draws nothing and
       still takes a legend row, so an untouched course would appear only as a
       name against a blank. */
    const courseMix = enrolments
      .filter((e) => (e.lessonsDone ?? 0) > 0)
      .map((e) => ({
        id: String(e._id),
        label: e.course.title,
        value: e.lessonsDone ?? 0,
        percent: e.percent ?? 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      resume,
      nextUp,
      recent,
      courseMix,
      stats: {
        inProgress: inProgress.length,
        enrolled: enrolments.length,
        certificates: certificates.length,
        quizzesPassed: quizzes.filter((q) => q.best?.passed).length,
        lessonsDone: enrolments.reduce((n, e) => n + (e.lessonsDone ?? 0), 0),
        lessonsTotal: enrolments.reduce((n, e) => n + (e.lessonsTotal ?? 0), 0),
      },
    };
  }, [data]);

  const weekMinutes = sumLast(fullActivity, 7);
  // The seven days before those seven, which is what "vs last week" compares
  // against. Slicing rather than a second request — the window already holds it.
  const priorWeekMinutes = sumLast(fullActivity.slice(0, -7), 7);

  return {
    ...view,
    // The whole window. The page slices it to whichever range is selected, so
    // changing the range is a re-render rather than a round trip.
    activity: fullActivity,
    weekMinutes,
    priorWeekMinutes,
    streak,
    // One status for the page. The activity request is part of the picture, so
    // a dashboard that has its courses but not its chart is still loading —
    // painting half of it and rearranging a moment later is worse than waiting.
    status: status === 'ready' && activityStatus === 'loading' ? 'loading' : status,
    error,
  };
}
