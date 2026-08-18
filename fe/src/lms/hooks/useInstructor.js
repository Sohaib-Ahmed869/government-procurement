import { useEffect, useMemo, useState } from 'react';
import { authoringApi } from '../../api/lms.js';
import { useApi } from './useApi.js';
import { useAuthoredCourses, displayStatus } from './useAuthoring.js';
import { formatCourseLength } from '../utils/formatDuration.js';
import { levelLabel } from '../constants/courseTaxonomy.js';

/* The instructor's courses and how they're doing (R1).

   Everything comes from GET /lms/authoring/courses, which the server scopes to
   the signed-in instructor. Counts (lessons, videos, transcripts, learners) are
   computed there too. The client no longer walks the curriculum to add them
   up, and cannot disagree with the server about them.
*/
export function useInstructorCourses() {
  const { courses, status, error, reload } = useAuthoredCourses();

  const rows = useMemo(
    () =>
      courses.map((c) => ({
        ...c,
        state: displayStatus(c),
        levelLabel: levelLabel(c.level),
        durationLabel: c.durationLabel || formatCourseLength(c.minutes) || 'No lessons yet',
        completions: 0,
        completionRate: 0,
        rating: c.rating ?? null,
        ratingCount: c.ratingCount ?? 0,
      })),
    [courses],
  );

  return { courses: rows, status, error, reload };
}

/* Enrolments, course by course (R1).

   Two hooks rather than one, mirroring the two endpoints. The page opens on the
   summary — a card per course — and only asks for a roster once a course is
   chosen, so opening the page doesn't pull down every learner of every course.
*/
export function useEnrolmentSummary() {
  const { data, status, error, reload } = useApi(() => authoringApi.enrolments(), []);

  // Busiest first. The server returns them in edit order, which is the right
  // default for My Courses and the wrong one here: on a page about enrolments,
  // an instructor with thirty courses should not have to hunt past the empty
  // ones to reach the two people are actually taking. Ties fall back to the
  // most recent joiner, then to the title so the order is stable.
  const rows = useMemo(() => {
    const list = data ?? [];
    return [...list].sort(
      (a, b) =>
        b.learners - a.learners ||
        Date.parse(b.lastEnrolledAt ?? 0) - Date.parse(a.lastEnrolledAt ?? 0) ||
        (a.course.title ?? '').localeCompare(b.course.title ?? ''),
    );
  }, [data]);

  const totals = useMemo(
    () => ({
      courses: rows.length,
      // Someone enrolled in two of this instructor's courses is two enrolments
      // and one person. This counts ENROLMENTS, which is what the number beside
      // a course means, and the label says so rather than claiming "students".
      learners: rows.reduce((s, r) => s + (r.learners ?? 0), 0),
      completed: rows.reduce((s, r) => s + (r.completed ?? 0), 0),
      withLearners: rows.filter((r) => r.learners > 0).length,
    }),
    [rows],
  );

  return { rows, totals, status, error, reload };
}

// One course's roster. `courseId` may be null while nothing is selected, in
// which case nothing is fetched.
export function useCourseRoster(courseId) {
  const [state, setState] = useState({ status: 'idle', students: [], course: null, error: '' });

  useEffect(() => {
    if (!courseId) {
      setState({ status: 'idle', students: [], course: null, error: '' });
      return undefined;
    }

    let alive = true;
    setState((s) => ({ ...s, status: 'loading', error: '' }));

    (async () => {
      try {
        const data = await authoringApi.courseEnrolments(courseId);
        if (!alive) return;
        setState({
          status: 'ready',
          students: data.students ?? [],
          course: data.course ?? null,
          lessonCount: data.lessonCount ?? 0,
          error: '',
        });
      } catch (err) {
        if (!alive) return;
        setState({
          status: 'error',
          students: [],
          course: null,
          error: err?.message ?? 'Could not load this roster',
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, [courseId]);

  return state;
}

/* Cohort analytics (L3 / R1).

   How the assessments are actually performing, which is the one thing the
   teaching side cannot work out for itself: a pass rate has to be counted where
   the attempts are marked.
*/
export function useCohortAnalytics() {
  const { data, status, error, reload } = useApi(() => authoringApi.analytics(), []);
  return {
    totals: data?.totals ?? {},
    quizzes: data?.quizzes ?? [],
    stalled: data?.stalled ?? { rows: [], omitted: 0, afterDays: 14 },
    status,
    error,
    reload,
  };
}

// One quiz's item analysis. `lessonId` because a quiz is a lesson.
export function useQuizAnalytics(lessonId) {
  const { data, status, error } = useApi(
    () => authoringApi.quizAnalytics(lessonId),
    [lessonId],
    { skip: !lessonId },
  );
  return { data, status, error };
}

export function useInstructorSummary() {
  const { courses, status } = useInstructorCourses();

  const summary = useMemo(() => {
    const rated = courses.filter((c) => c.rating != null);
    return {
      courses: courses.length,
      published: courses.filter((c) => c.state === 'published').length,
      pending: courses.filter((c) => c.state === 'pending').length,
      lessons: courses.reduce((s, c) => s + (c.lessonCount ?? 0), 0),
      learners: courses.reduce((s, c) => s + (c.learners ?? 0), 0),
      // Video lessons with a file but no transcript (L2).
      missingTranscripts: courses.reduce(
        (s, c) => s + Math.max(0, (c.videoCount ?? 0) - (c.transcriptCount ?? 0)),
        0,
      ),
      averageRating: rated.length
        ? (rated.reduce((s, c) => s + c.rating, 0) / rated.length).toFixed(1)
        : null,
    };
  }, [courses]);

  return { ...summary, status };
}
