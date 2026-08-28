import { useCallback, useEffect, useState } from 'react';
import { quizzesApi } from '../../api/lms.js';

/* ---------------------------------------------------------------------------
   Quizzes, from the API (L3).

   A quiz IS a lesson: `kind: 'quiz'`, with its questions on `lesson.quiz`. The
   route calls it `:quizId`, but the id in it is a lesson id, which is what
   GET /lms/quizzes/:lessonId takes.

   What comes back has NO answer key. `correct`, `accept` and `explanation` are
   stripped by Lesson.forLearner() on the server, so a learner cannot read the
   answers out of the network tab, and marking happens on submit — where the
   key lives. See be/src/utils/grading.js.
   ------------------------------------------------------------------------ */

// Mongo ids are `_id`; the question components were written against `id`.
// Settled here so nothing below has to know which shape it was handed.
function toQuestions(questions = []) {
  return questions.map((q) => ({ ...q, id: String(q._id ?? q.id) }));
}

export function useQuiz(lessonId) {
  const [state, setState] = useState({
    status: 'loading', // loading | ready | notfound | forbidden | error
    lesson: null,
    quiz: null,
    attemptsUsed: 0,
    maxAttempts: 0,
    error: '',
  });
  const [attempts, setAttempts] = useState([]);

  const load = useCallback(async () => {
    if (!lessonId) return;
    setState((s) => ({ ...s, status: 'loading', error: '' }));
    try {
      const { lesson, attemptsUsed, maxAttempts, ticket } = await quizzesApi.get(lessonId);
      setState({
        status: 'ready',
        lesson,
        // Held, never inspected. It goes back with the submission unchanged.
        ticket,
        quiz: { ...(lesson.quiz ?? {}), questions: toQuestions(lesson.quiz?.questions) },
        attemptsUsed: attemptsUsed ?? 0,
        maxAttempts: maxAttempts ?? 0,
        error: '',
      });
    } catch (err) {
      // The three refusals mean different things to the learner and are worth
      // telling apart: no such quiz, not entitled to it, or the request failed.
      const status =
        err?.status === 404 ? 'notfound' : err?.status === 403 ? 'forbidden' : 'error';
      setState((s) => ({ ...s, status, error: err?.message ?? 'Could not load this quiz' }));
    }
  }, [lessonId]);

  // History is fetched separately and is allowed to fail quietly: not knowing
  // the previous scores is no reason to withhold the quiz itself.
  const loadAttempts = useCallback(async () => {
    if (!lessonId) return;
    try {
      setAttempts(await quizzesApi.attempts(lessonId));
    } catch {
      setAttempts([]);
    }
  }, [lessonId]);

  useEffect(() => {
    load();
    loadAttempts();
  }, [load, loadAttempts]);

  return { ...state, attempts, reload: load, reloadAttempts: loadAttempts };
}
