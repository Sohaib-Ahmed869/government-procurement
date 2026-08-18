import { useEffect, useState } from 'react';
import { enrollmentsApi } from '../../api/lms.js';
import { toEnrolledCourse } from '../utils/courseShape.js';

// Derived status, used for the filter tabs and the card's pill. Kept here so
// the rule lives in one place rather than in each component's render.
export function courseStatus(course) {
  if (course.lessons > 0 && course.lessonsDone >= course.lessons) return 'completed';
  if (course.lessonsDone > 0) return 'in-progress';
  return 'not-started';
}

export function coursePercent(course) {
  if (!course.lessons) return 0;
  return Math.round((course.lessonsDone / course.lessons) * 100);
}

// The learner's enrolments (L6. This list is enrolment-scoped by definition).
//
// GET /lms/enrollments returns the course populated and the rest rolled up:
// progress, minutes left, the next lesson with its drip gate, and the
// certificate. Nothing here recomputes any of that. The gate in particular is
// the server's call, and a second opinion in the browser would only ever be a
// way for the two to disagree.
export function useMyCourses() {
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const rows = await enrollmentsApi.mine();
        if (!alive) return;
        // A revoked enrolment, or one whose course was deleted, comes back
        // without a course. Drop it rather than render a nameless card.
        setCourses((rows ?? []).filter((r) => r.course).map(toEnrolledCourse));
        setStatus('ready');
      } catch (err) {
        if (!alive) return;
        setError(err?.message ?? 'Could not load your courses');
        setStatus('error');
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { courses, status, error };
}
