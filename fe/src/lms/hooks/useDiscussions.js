import { useCallback, useEffect, useState } from 'react';
import { discussionsApi } from '../../api/lms.js';

/* ---------------------------------------------------------------------------
   Course discussions (L5), from the API.

   One dataset, two audiences: a question a learner asks here is the question
   their instructor sees in the Questions inbox on the teaching side, and an
   instructor's reply appears in this thread. There is no second copy.

   It used to be a localStorage store, which meant a question was only visible
   in the browser that asked it — so an instructor could never see one, and a
   learner lost theirs by switching device.

   Every write returns the whole updated thread, and that is what replaces the
   local copy. Patching a reply into an existing object in the browser is how
   the vote counts and the resolved flag drift from what the server thinks.
   ------------------------------------------------------------------------ */

export function useDiscussions({ course } = {}) {
  const [threads, setThreads] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setThreads(await discussionsApi.list(course ? { course } : undefined));
      setStatus('ready');
    } catch (err) {
      setError(err?.message ?? 'Could not load discussions');
      setStatus('error');
    }
  }, [course]);

  useEffect(() => {
    load();
  }, [load]);

  // The new thread is put straight at the top rather than waiting for a reload:
  // it is the one the asker is looking for, and the server already answered
  // with it in full.
  const ask = useCallback(async ({ slug, courseId, lessonId, title, body }) => {
    const thread = await discussionsApi.ask({ slug, courseId, lessonId, title, body });
    setThreads((rows) => [thread, ...rows]);
    return thread;
  }, []);

  return { threads, status, error, reload: load, ask };
}

export function useThread(id) {
  const [thread, setThread] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setStatus('loading');
    try {
      setThread(await discussionsApi.get(id));
      setStatus('ready');
    } catch (err) {
      // 404 is the answer for a thread that doesn't exist AND for one on a
      // course this reader isn't in. The server deliberately doesn't tell them
      // apart, and neither does this.
      setStatus(err?.status === 404 ? 'notfound' : 'error');
      setError(err?.message ?? 'Could not load this discussion');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Each of these answers with the whole thread, so the reply, the vote counts
  // and the accepted answer all land together.
  const reply = useCallback(async (body) => setThread(await discussionsApi.reply(id, body)), [id]);
  const vote = useCallback(async (replyId) => setThread(await discussionsApi.vote(id, replyId)), [id]);
  const accept = useCallback(
    async (replyId) => setThread(await discussionsApi.accept(id, replyId)),
    [id],
  );

  return { thread, status, error, reload: load, reply, vote, accept };
}

// The teaching side's inbox: every question on the courses this instructor
// wrote. Same records, filtered by authorship rather than enrolment.
export function useQuestionInbox() {
  const [data, setData] = useState({ threads: [], totals: {}, courses: [] });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await discussionsApi.inbox();
      setData({ threads: res.threads ?? [], totals: res.totals ?? {}, courses: res.courses ?? [] });
      setStatus('ready');
    } catch (err) {
      setError(err?.message ?? 'Could not load your questions');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, status, error, reload: load };
}
