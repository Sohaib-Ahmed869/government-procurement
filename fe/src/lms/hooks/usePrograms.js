import { useCallback } from 'react';
import { authoringApi, pathsApi } from '../../api/lms.js';
import { useApi } from './useApi.js';

/* ---------------------------------------------------------------------------
   Learning paths (LMS 8.0), from the API.

   A path is a curation of courses that already exist, so there is no content
   here to author, only references to arrange. Everything about whether a step
   is done, open or locked is decided by the SERVER and read here, for the same
   reason lesson gating is: a client that resolves its own prerequisites is a
   client that can award itself the certificate at the end of them.

   This replaces the placeholder in usePaths.js, which resolved steps in the
   browser against hardcoded courses.
   ------------------------------------------------------------------------ */

// Same collapse of (status, reviewStatus) that courses use, so an author sees
// one word for a path and a course rather than two vocabularies.
export { STATUS_LABEL, displayStatus } from './useAuthoring.js';

// ---- Instructor -------------------------------------------------------------

export function useAuthoredPrograms() {
  const { data, status, error, reload } = useApi(() => authoringApi.programs(), []);
  return { programs: data ?? [], status, error, reload };
}

// One path plus the courses its steps point at, resolved server-side so the
// builder can show titles without a lookup per step.
export function useAuthoredProgram(programId) {
  const { data, status, error, reload, setData } = useApi(
    () => authoringApi.getProgram(programId),
    [programId],
    { skip: !programId },
  );

  // Steps are replaced wholesale rather than patched, because their meaning is
  // positional: reordering, removing one and repointing a prerequisite are a
  // single edit as far as the author is concerned.
  const applyLocal = useCallback(
    (patch) => setData((d) => (d ? { ...d, program: { ...d.program, ...patch } } : d)),
    [setData],
  );

  return {
    program: data?.program ?? null,
    courses: data?.courses ?? [],
    status,
    error,
    reload,
    applyLocal,
  };
}

// ---- Learner ----------------------------------------------------------------

export function usePaths() {
  const { data, status, error, reload } = useApi(() => pathsApi.list(), []);
  return { paths: data ?? [], status, error, reload };
}

export function usePath(slug) {
  const { data, status, error, reload } = useApi(() => pathsApi.get(slug), [slug], {
    skip: !slug,
  });
  return { path: data ?? null, status, error, reload };
}
