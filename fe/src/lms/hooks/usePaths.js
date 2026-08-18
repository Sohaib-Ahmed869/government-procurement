import { useEffect, useState } from 'react';
import { CATALOGUE, ENROLMENTS, PATHS } from './placeholderData.js';

// Is a course finished? The single definition, so the stepper and the
// certificate rule can't disagree.
function isComplete(slug) {
  const course = CATALOGUE.find((c) => c.slug === slug);
  const enrolment = ENROLMENTS[slug];
  if (!course || !enrolment) return false;
  return enrolment.lessonsDone >= course.lessons;
}

// Resolves a path's steps against the learner's completions (L4).
//
// Each step comes back with one state:
//   done      the course is complete
//   current   open, and the next thing to do
//   open      available but not next in line
//   locked    a prerequisite isn't met yet
//
// TODO: this must be resolved server-side alongside the lesson gates. See
// utils/gating.js. It runs here only because the placeholder has no API.
export function resolvePath(path) {
  let currentAssigned = false;

  const steps = path.steps.map((step) => {
    const course = CATALOGUE.find((c) => c.slug === step.slug);
    const enrolment = ENROLMENTS[step.slug] ?? null;
    const done = isComplete(step.slug);
    const unmet = step.requires.filter((r) => !isComplete(r));

    let state;
    if (done) state = 'done';
    else if (unmet.length) state = 'locked';
    else if (!currentAssigned) {
      state = 'current';
      currentAssigned = true;
    } else state = 'open';

    return {
      ...step,
      course,
      enrolment,
      state,
      unmet: unmet.map((slug) => CATALOGUE.find((c) => c.slug === slug)?.title ?? slug),
      percent:
        course && enrolment ? Math.round((enrolment.lessonsDone / course.lessons) * 100) : 0,
    };
  });

  const doneCount = steps.filter((s) => s.state === 'done').length;
  return {
    ...path,
    steps,
    doneCount,
    percent: steps.length ? Math.round((doneCount / steps.length) * 100) : 0,
    complete: doneCount === steps.length,
  };
}

// TODO: replace with `pathsApi.list()` from fe/src/api/lms.js.
export function usePaths() {
  const [paths, setPaths] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      if (!alive) return;
      setPaths(PATHS.map(resolvePath));
      setStatus('ready');
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  return { paths, status };
}

export function usePath(slug) {
  const [path, setPath] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    const t = setTimeout(() => {
      if (!alive) return;
      const found = PATHS.find((p) => p.slug === slug);
      if (!found) {
        setStatus('notfound');
        return;
      }
      setPath(resolvePath(found));
      setStatus('ready');
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [slug]);

  return { path, status };
}
