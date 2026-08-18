import { useCallback, useEffect, useRef, useState } from 'react';

/* Loading / error / data for one request, plus a `reload`.
   Every LMS screen needs the same four things, and hand-rolling them per hook
   is how one of them ends up without an error state. */
export function useApi(fetcher, deps = [], { skip = false } = {}) {
  const [state, setState] = useState({ data: null, status: skip ? 'idle' : 'loading', error: null });
  // Guards against a slow first response landing after a fast second one and
  // overwriting it. The classic out-of-order fetch bug.
  const seq = useRef(0);

  const run = useCallback(async () => {
    if (skip) return;
    const mine = ++seq.current;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const data = await fetcher();
      if (mine === seq.current) setState({ data, status: 'ready', error: null });
    } catch (err) {
      if (mine === seq.current) {
        setState({ data: null, status: 'error', error: err?.message ?? 'Something went wrong' });
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
      setStatus(Object.keys(pendingPatch.current).length ? 'saving' : 'saved');
    } catch (err) {
      // The patch goes BACK on the queue. Dropping it is how a failed save
      // silently loses work: the field still shows the new value, so the author
      // has no way to know the server never took it.
      pendingPatch.current = { ...patch, ...pendingPatch.current };
      setError(err?.message ?? 'Could not save');
      setStatus('error');
    }
  }, []);

  const queue = useCallback(
    (patch) => {
      pendingPatch.current = { ...pendingPatch.current, ...patch };
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

  return { queue, flush, retry, status, error };
}
