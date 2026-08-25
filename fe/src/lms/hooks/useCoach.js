import { useCallback, useEffect, useState } from 'react';
import { coachApi } from '../../api/lms.js';

/* ---------------------------------------------------------------------------
   The Course Coach conversation (LMS 18.0).

   Held in memory for the length of the visit and deliberately NOT persisted.

   A learner's questions are a record of what they did not understand, which is
   personal information of an unusually revealing kind, and the likeliest thing
   anyone will ever paste into this box is detail from a live tender their
   agency is running. Not storing it is the cheapest correct answer to all of
   that: nothing to export under APP 12, nothing to delete under APP 13, no
   retention period to decide, and no breach surface. If conversations are ever
   wanted across sessions, that is a Phase 11 conversation first and a feature
   second.

   Switching courses clears the thread, because the coach's whole premise is
   that it is answering from ONE course's material.
   ------------------------------------------------------------------------ */
export function useCoach(courseId) {
  // [{ id, role: 'user' | 'assistant', text, sources?, note? }]
  const [turns, setTurns] = useState([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const row = await coachApi.status();
        if (alive) setAvailability({ status: 'ready', ...row });
      } catch {
        // The composer stays hidden rather than offering a box that fails on
        // submit.
        if (alive) setAvailability({ status: 'ready', ready: false, reason: 'unreachable' });
      }
    })();
    return () => { alive = false; };
  }, []);

  // A different course is a different conversation, not a continuation.
  useEffect(() => {
    setTurns([]);
    setError('');
  }, [courseId]);

  const ask = useCallback(
    async (question) => {
      const text = String(question ?? '').trim();
      if (!text || asking || !courseId) return;

      setError('');
      setAsking(true);

      // The learner's turn lands immediately; the answer follows. Waiting for
      // the round trip to show what they just typed reads as the box having
      // eaten it.
      const mine = { id: `q${Date.now()}`, role: 'user', text };
      setTurns((prev) => [...prev, mine]);

      try {
        const row = await coachApi.ask({
          courseId,
          question: text,
          // Sent from the turns BEFORE this question — `turns` has not
          // re-rendered yet, and the server would only trim it anyway.
          history: turns.map((t) => ({ role: t.role, text: t.text })),
        });

        setTurns((prev) => [
          ...prev,
          {
            id: `a${Date.now()}`,
            role: 'assistant',
            text: row.answer ?? '',
            sources: row.sources ?? [],
            // The server's own words for "I can't answer that" — a refusal, or
            // a course with nothing written in it yet. Shown as the coach's
            // reply rather than as an error, because it is one.
            note: row.message ?? '',
          },
        ]);
      } catch (err) {
        // The question stays on screen so it can be retried or edited rather
        // than retyped.
        setError(err?.message ?? 'The coach couldn’t answer just now.');
      } finally {
        setAsking(false);
      }
    },
    [asking, courseId, turns],
  );

  const clear = useCallback(() => {
    setTurns([]);
    setError('');
  }, []);

  return {
    turns,
    ask,
    clear,
    asking,
    error,
    available: availability.ready !== false,
    loadingAvailability: availability.status === 'loading',
    disclaimer: availability.disclaimer ?? '',
    // Only ever populated for staff; the server decides that, not the client.
    operatorMessage: availability.message ?? '',
  };
}
