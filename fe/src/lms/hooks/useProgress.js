import { useEffect, useMemo, useState } from 'react';
import { certificatesApi, enrollmentsApi, quizzesApi } from '../../api/lms.js';
import { WEEK_ACTIVITY } from './placeholderData.js';
import { useNotes } from './useNotes.js';
import { useBookmarks } from './useBookmarks.js';

/* ---------------------------------------------------------------------------
   The progress rollup (L3), from the API.

   Three requests, because they answer three different questions:
     GET /lms/enrollments        what they're enrolled in and how far in
     GET /lms/quizzes/attempts   their standing on every quiz they've taken
     GET /lms/certificates       what they've earned

   None of it is recomputed here. Completion, minutes and the per-module counts
   come from the server, which is the same source My Courses and the course page
   read — that is what stops three screens quoting three different percentages
   for the same course.

   Quiz results used to be re-derived in the browser from answers kept in
   localStorage, which meant they were per-BROWSER rather than per-account
   (a learner saw nothing after switching device) and required shipping the
   answer key to the client to mark them. Both are gone.

   Two things here are still local, and honestly so:
     · notes and bookmarks are local features; there is no server model yet
     · WEEK_ACTIVITY, the per-day chart. Nothing records daily activity: the
       Progress model holds total minutes and a last-accessed date, not a
       history. A real chart needs that history stored first.
   ------------------------------------------------------------------------ */

// Consecutive days with activity, counting back from the most recent day.
function streak(days) {
  let n = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].minutes > 0) n += 1;
    else break;
  }
  return n;
}

export function useProgress() {
  const notes = useNotes();
  const bookmarks = useBookmarks();

  const [data, setData] = useState({ enrolments: [], quizzes: [], certificates: [] });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Fetched together: the page shows one picture, so there is nothing to
        // render usefully until all three have landed.
        const [enrolments, quizzes, certificates] = await Promise.all([
          enrollmentsApi.mine(),
          quizzesApi.allAttempts(),
          certificatesApi.mine(),
        ]);
        if (!alive) return;
        setData({
          enrolments: enrolments ?? [],
          quizzes: quizzes ?? [],
          certificates: certificates ?? [],
        });
        setStatus('ready');
      } catch (err) {
        if (!alive) return;
        setError(err?.message ?? 'Could not load your progress');
        setStatus('error');
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const rollup = useMemo(() => {
    // A revoked enrolment, or one whose course was deleted, comes back without
    // a course. Dropped rather than rendered as a nameless row.
    const courses = data.enrolments
      .filter((e) => e.course)
      .map((e) => ({
        slug: e.course.slug,
        title: e.course.title,
        lessonsDone: e.lessonsDone ?? 0,
        lessonsTotal: e.lessonsTotal ?? 0,
        percent: e.percent ?? 0,
        complete: (e.lessonsTotal ?? 0) > 0 && e.lessonsDone >= e.lessonsTotal,
        minutes: e.minutesLearned ?? 0,
        lastAccessedAt: e.lastAccessedAt,
        modules: e.modules ?? [],
      }))
      .sort((a, b) => b.percent - a.percent);

    // Already one row per quiz, best-first, from the server.
    const quizzes = data.quizzes.map((q) => ({
      key: String(q.lesson),
      slug: q.course.slug,
      quizId: String(q.lesson),
      title: q.title,
      courseTitle: q.course.title,
      percent: q.best.percent,
      score: q.best.score,
      total: q.best.total,
      passed: q.best.passed,
      submittedAt: q.lastAttemptAt,
      attempts: q.attempts,
    }));

    const lessonsDone = courses.reduce((s, c) => s + c.lessonsDone, 0);
    const lessonsTotal = courses.reduce((s, c) => s + c.lessonsTotal, 0);

    return {
      courses,
      quizzes,
      totals: {
        coursesEnrolled: courses.length,
        coursesComplete: courses.filter((c) => c.complete).length,
        lessonsDone,
        lessonsTotal,
        percent: lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0,
        minutes: courses.reduce((s, c) => s + c.minutes, 0),
        certificates: data.certificates.length,
        notes: notes.length,
        bookmarks: bookmarks.length,
        streak: streak(WEEK_ACTIVITY),
        quizzesPassed: quizzes.filter((q) => q.passed).length,
        quizzesTaken: quizzes.length,
      },
    };
  }, [data, notes.length, bookmarks.length]);

  return { ...rollup, status, error };
}
