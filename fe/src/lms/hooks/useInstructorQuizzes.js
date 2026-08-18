import { useMemo } from 'react';
import { authoringApi } from '../../api/lms.js';
import { useApi } from './useApi.js';
import { useAuthoredCourses } from './useAuthoring.js';

/* Every quiz the instructor owns, across every course (R1/L3).

   This is a cross-course QA view, not a second editor. Clicking a quiz opens
   it in the course builder where it is authored. Two places to write questions
   would drift.

   What it can answer today comes from the quiz definitions themselves: is this
   assessment finished, and is it well formed? Performance. Pass rates, which
   question everyone fails. Needs QuizAttempt records from the server, and is
   deliberately absent rather than faked from the local attempts store, which
   holds only this browser's own attempts.
*/

// Problems a reviewer or a learner would hit. Ordered worst-first: a quiz with
// no questions is broken, a missing explanation is merely a shame.
function auditQuiz(quiz) {
  const issues = [];
  if (!quiz) return ['No quiz attached'];

  if (!quiz.questions?.length) {
    issues.push('No questions yet');
    return issues;
  }

  quiz.questions.forEach((q, i) => {
    const n = i + 1;
    if (!q.prompt?.trim()) issues.push(`Q${n} has no question text`);

    if (q.type === 'text') {
      if (!q.accept?.filter((a) => a.trim()).length) {
        issues.push(`Q${n} has no accepted answers, so nothing can mark it`);
      }
    } else if (!q.correct?.length) {
      // The one that matters most: an unmarked answer key means the question
      // is unanswerable correctly, and every learner loses the mark.
      issues.push(`Q${n} has no correct answer marked`);
    }

    if ((q.type === 'single' || q.type === 'multi')) {
      const filled = q.options?.filter((o) => o.text.trim()).length ?? 0;
      if (filled < 2) issues.push(`Q${n} needs at least two options with text`);
    }

    if (!q.explanation?.trim()) issues.push(`Q${n} has no explanation`);
  });

  if (quiz.passMark < 1 || quiz.passMark > 100) issues.push('Pass mark should be 1–100');

  return issues;
}

// An issue that makes the quiz unusable, versus one that only makes it worse.
// Matched case-insensitively: the messages are written for a human, so "No
// questions yet" starts with a capital and a literal lowercase match silently
// classified the worst problem as cosmetic.
const BLOCKING_PHRASES = [
  'no questions',
  'no correct answer',
  'no accepted answers',
  'no question text',
  'two options',
];

function isBlocking(issue) {
  const text = issue.toLowerCase();
  return BLOCKING_PHRASES.some((phrase) => text.includes(phrase));
}

export function useInstructorQuizzes() {
  const { courses: list } = useAuthoredCourses();

  // The list endpoint returns counts, not curricula, so each course is fetched
  // for its lessons. Fine at an instructor's scale; if a catalogue ever grows
  // past that, the server should expose a quizzes endpoint instead.
  const { data, status } = useApi(
    () => Promise.all(list.map((c) => authoringApi.get(c._id))),
    [list.map((c) => c._id).join(',')],
    { skip: !list.length },
  );

  const detailed = data ?? [];

  const rows = useMemo(() => {
    const out = [];

    detailed.forEach(({ course, modules }) => {
      modules.forEach((mod) => {
        mod.lessons
          .filter((l) => l.kind === 'quiz')
          .forEach((lesson) => {
            const quiz = lesson.quiz;
            const issues = auditQuiz(quiz);
            const types = {};
            (quiz?.questions ?? []).forEach((q) => {
              types[q.type] = (types[q.type] ?? 0) + 1;
            });

            out.push({
              id: `${course._id}:${lesson._id}`,
              courseId: course._id,
              courseSlug: course.slug,
              courseTitle: course.title,
              courseStatus: course.status,
              moduleTitle: mod.title,
              lessonId: lesson._id,
              title: lesson.title,
              questionCount: quiz?.questions?.length ?? 0,
              passMark: quiz?.passMark ?? 0,
              timeLimitMins: quiz?.timeLimitMins ?? 0,
              minutes: lesson.minutes,
              types,
              issues,
              blocking: issues.filter(isBlocking),
              ready: issues.length === 0,
            });
          });
      });
    });

    return out;
  }, [detailed]);

  return { quizzes: rows, status };
}

export function useQuizSummary() {
  const { quizzes } = useInstructorQuizzes();

  return useMemo(
    () => ({
      total: quizzes.length,
      ready: quizzes.filter((q) => q.ready).length,
      blocking: quizzes.filter((q) => q.blocking.length).length,
      questions: quizzes.reduce((s, q) => s + q.questionCount, 0),
      empty: quizzes.filter((q) => q.questionCount === 0).length,
    }),
    [quizzes],
  );
}
