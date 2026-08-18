import { useCallback } from 'react';
import { authoringApi } from '../../api/lms.js';
import { useApi } from './useApi.js';
import { courseMinutes, formatCourseLength } from '../utils/formatDuration.js';
import { levelLabel } from '../constants/courseTaxonomy.js';

/* ---------------------------------------------------------------------------
   Course authoring (R1). Now backed by the API.

   Everything here talks to /lms/authoring/*. There is no local copy of a
   course any more: the server owns it, ownership is enforced there, and the
   builder reloads after each structural change.

   Two rules the server enforces regardless of what this file sends:
     · an instructor may only touch their own courses
     · an instructor may not set status to 'published'. Only submit for review
   ------------------------------------------------------------------------ */

/* Course review states. `status` is what the WEBSITE shows; `reviewStatus` is
   where the course sits in the approval queue. The pair is collapsed into one
   label for display, because an author thinks in one axis, not two. */
export const STATUS_LABEL = {
  draft: 'Draft',
  pending: 'In review',
  published: 'Published',
  rejected: 'Changes requested',
  declined: 'Not accepted',
};

// Collapses (status, reviewStatus) into the single word the UI shows.
export function displayStatus(course) {
  if (!course) return 'draft';
  if (course.reviewStatus === 'pending') return 'pending';
  if (course.reviewStatus === 'rejected') return 'rejected';
  // Kept apart from 'rejected'. Both came back, but one is a list of fixes and
  // the other is a decision, and an author needs to know which they got.
  if (course.reviewStatus === 'declined') return 'declined';
  if (course.status === 'published') return 'published';
  return 'draft';
}

// ---- Reads ------------------------------------------------------------------
export function useAuthoredCourses() {
  const { data, status, error, reload } = useApi(() => authoringApi.myCourses(), []);
  return { courses: data ?? [], status, error, reload };
}

// The full editable document: course + modules + their lessons.
export function useAuthoredCourse(courseId) {
  const { data, status, error, reload, setData } = useApi(
    () => authoringApi.get(courseId),
    [courseId],
    { skip: !courseId },
  );

  // Replaces one lesson with the version the server just returned.
  //
  // A lesson PATCH already answers with the saved document, so the local copy
  // can be brought up to date for free. Without this the builder held stale
  // lessons until the next full reload, and anything the SERVER changed on
  // write (a YouTube URL becoming an id, a derived duration) never appeared.
  const applyLesson = useCallback(
    (lesson) => {
      if (!lesson?._id) return;
      setData((d) =>
        !d
          ? d
          : {
              ...d,
              modules: d.modules.map((m) =>
                String(m._id) !== String(lesson.module)
                  ? m
                  : {
                      ...m,
                      lessons: m.lessons.map((l) =>
                        String(l._id) === String(lesson._id) ? lesson : l,
                      ),
                    },
              ),
            },
      );
    },
    [setData],
  );

  return {
    course: data?.course ?? null,
    modules: data?.modules ?? [],
    status,
    error,
    reload,
    applyLesson,
  };
}

// ---- Derived display values -------------------------------------------------
// Computed, never stored on the client. The server derives durationLabel too,
// from the same lesson minutes. This is for the builder's live preview before
// the next reload.
export function courseDurationLabel(modules) {
  return formatCourseLength(courseMinutes({ modules }));
}

export function courseLevelLabel(course) {
  return levelLabel(course?.level);
}

// ---- Readiness --------------------------------------------------------------
// What a reviewer will send the course back for. Runs on the client because it
// is guidance, not enforcement. The server re-checks what it cares about.
export function courseReadiness(course, modules = []) {
  if (!course) return { issues: [], counts: {}, ready: false };

  const lessons = modules.flatMap((m) => m.lessons ?? []);
  const videos = lessons.filter((l) => l.kind === 'video');
  const quizzes = lessons.filter((l) => l.kind === 'quiz');

  const issues = [];
  if (!course.title?.trim()) issues.push('Give the course a title');
  if (!course.summary?.trim()) issues.push('Write a summary for the catalogue');
  if (!course.image?.url) issues.push('Add a course image. The catalogue card needs it');
  if (!course.learnPoints?.filter((p) => p.trim()).length) {
    issues.push('List what learners will be able to do');
  }
  if (!modules.length) issues.push('Add at least one module');
  if (!lessons.length) issues.push('Add at least one lesson');

  const emptyModules = modules.filter((m) => !(m.lessons ?? []).length);
  if (emptyModules.length) {
    issues.push(`${emptyModules.length} module${emptyModules.length === 1 ? ' has' : 's have'} no lessons`);
  }

  const noVideo = videos.filter((l) => !l.video?.key);
  if (noVideo.length) issues.push(`${noVideo.length} video lesson${noVideo.length === 1 ? '' : 's'} without a file`);

  const noTranscript = videos.filter((l) => l.video?.key && !l.transcript?.length);
  if (noTranscript.length) {
    issues.push(`${noTranscript.length} video${noTranscript.length === 1 ? '' : 's'} without a transcript`);
  }

  const emptyQuiz = quizzes.filter((l) => !l.quiz?.questions?.length);
  if (emptyQuiz.length) issues.push(`${emptyQuiz.length} quiz${emptyQuiz.length === 1 ? '' : 'zes'} with no questions`);

  const emptyText = lessons.filter((l) => l.kind === 'text' && !l.body?.trim());
  if (emptyText.length) issues.push(`${emptyText.length} text lesson${emptyText.length === 1 ? '' : 's'} with no content`);

  return {
    issues,
    ready: issues.length === 0,
    counts: {
      modules: modules.length,
      lessons: lessons.length,
      videos: videos.length,
      quizzes: quizzes.length,
      transcripts: videos.filter((l) => l.transcript?.length).length,
      minutes: lessons.reduce((s, l) => s + (Number(l.minutes) || 0), 0),
    },
  };
}
