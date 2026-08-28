import { useCallback, useEffect, useRef, useState } from 'react';

/* Loading / error / data for one request, plus a `reload`.
   Every LMS screen needs the same four things, and hand-rolling them per hook
   is how one of them ends up without an error state. */
export function useApi(fetcher, deps = [], { skip = false } = {}) {
  const [state, setState] = useState({
    data: null,
    status: skip ? 'idle' : 'loading',
    error: null,
    // True while re-fetching data we ALREADY have. Distinct from `loading`,
    // which means "there is nothing to show yet".
    refreshing: false,
  });
  // Guards against a slow first response landing after a fast second one and
  // overwriting it. The classic out-of-order fetch bug.
  const seq = useRef(0);

  const run = useCallback(async () => {
    if (skip) return;
    const mine = ++seq.current;
    /* A RELOAD MUST NOT LOOK LIKE A FIRST LOAD.

       This used to set status:'loading' unconditionally, and screens render a
       skeleton for that — so every reload() replaced a working page with a
       placeholder and rebuilt it. In the course builder, where adding a lesson
       or reordering one calls reload(), that read as the whole page reloading
       after every click, and cost the reader their scroll position each time.

       So: keep showing what we have, and flag `refreshing` for anything that
       wants to show a quiet spinner. `loading` now means only "nothing to show
       yet", which is when a skeleton is the honest answer. */
    setState((s) =>
      s.data == null
        ? { ...s, status: 'loading', error: null }
        : { ...s, refreshing: true, error: null },
    );
    try {
      const data = await fetcher();
      if (mine === seq.current) setState({ data, status: 'ready', error: null, refreshing: false });
    } catch (err) {
      if (mine === seq.current) {
        setState((s) => ({
          // A failed REFRESH keeps the data it already had. Throwing away a
          // working page because one refetch failed is the worse outcome.
          data: s.data,
          status: s.data == null ? 'error' : 'ready',
          error: err?.message ?? 'Something went wrong',
          refreshing: false,
        }));
      }
    }
    // fetcher is intentionally not a dep: callers pass an inline arrow, which
    // would be a new function every render and loop forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, ...deps]);

  useEffect(() => {
    run();
  }, [run]);

  // Accepts a value or an updater, like useState. An updater matters when the
  // caller derives the next data from the current data, which it cannot read
  // safely from a stale closure.
  const setData = useCallback((next) => {
    setState((s) => ({ ...s, data: typeof next === 'function' ? next(s.data) : next }));
  }, []);

  return { ...state, reload: run, setData };
}

/* A mutation: call it, get back pending/error, and the caller decides what to
   reload afterwards. */
export function useMutation(fn) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(
    async (...args) => {
      setPending(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (err) {
        setError(err?.message ?? 'Something went wrong');
        throw err;
      } finally {
        setPending(false);
      }
    },
    [fn],
  );

  return { mutate, pending, error };
}

/* Debounced autosave.

   The course builder writes on every keystroke. Against localStorage that was
   free; against an API it would be a request per character. This batches them
   into one PATCH after the typing stops, and reports the state so the header
   can say "Saving…" honestly instead of always claiming "Saved".
*/
export function useAutosave(save, delay = 800) {
  const [status, setStatus] = useState('saved'); // saved | saving | error
  // The reason it failed, not just that it did. "Not saved" on its own leaves
  // an author guessing whether it's their connection, a validation error, or
  // something they can't fix by retrying.
  const [error, setError] = useState('');
  const timer = useRef(null);
  const pendingPatch = useRef({});
  /* Whether anything is waiting to be written.

     A ref alone cannot drive the UI — nothing re-renders when it changes — so
     the same fact is mirrored into state. "Save now" needs it: with an empty
     queue flush() returns immediately and the click looks broken. */
  const [dirty, setDirty] = useState(false);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(async () => {
    const patch = pendingPatch.current;
    pendingPatch.current = {};
    if (!Object.keys(patch).length) return;

    setStatus('saving');
    try {
      await saveRef.current(patch);
      setError('');
      // Only clear to "saved" if nothing new arrived while we were in flight.
      const stillPending = Object.keys(pendingPatch.current).length > 0;
      setDirty(stillPending);
      setStatus(stillPending ? 'saving' : 'saved');
      return true;
    } catch (err) {
      // The patch goes BACK on the queue. Dropping it is how a failed save
      // silently loses work: the field still shows the new value, so the author
      // has no way to know the server never took it.
      pendingPatch.current = { ...patch, ...pendingPatch.current };
      setDirty(true);
      setError(err?.message ?? 'Could not save');
      setStatus('error');
      return false;
    }
  }, []);

  const queue = useCallback(
    (patch) => {
      pendingPatch.current = { ...pendingPatch.current, ...patch };
      setDirty(true);
      setStatus('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  // Leaving mid-edit shouldn't drop the last keystrokes.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      flush();
    },
    [flush],
  );

  // `flush` runs whatever is queued right now. Exposed so a "Save now" control
  // can bypass the debounce, and so a failed save can be retried by hand.
  const retry = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    return flush();
  }, [flush]);

  return { queue, flush, retry, status, error, dirty };
}
