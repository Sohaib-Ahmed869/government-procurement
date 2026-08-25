/* ---------------------------------------------------------------------------
   A tiny observable store backed by an endpoint.

   The shape localStore.js had — read / write / subscribe, driving
   useSyncExternalStore — but the rows come from the server and mutations go
   back to it. It exists for the same reason localStore did: notes and bookmarks
   both need one, and the second copy is where two implementations start
   disagreeing about when a list refreshes.

   Why a module-level store rather than a hook with its own state: the same rows
   are read in three places at once — the bookmark button inside a lesson, the
   count on My Progress, the list on the Bookmarks page — and they have to move
   together. A hook per component would give each one its own fetch and its own
   stale copy.

   One list per signed-in learner. `reset()` empties it on sign-out so the next
   account does not open on the last one's notes.
   ------------------------------------------------------------------------ */
export function createRemoteStore(load) {
  const listeners = new Set();

  // Cached by reference: useSyncExternalStore compares snapshots with Object.is
  // and loops forever if a new array comes back on every call.
  let rows = [];
  let status = 'idle'; // idle | loading | ready | error
  let error = null;
  let inFlight = null;

  const emit = () => listeners.forEach((l) => l());

  function refresh() {
    // One request in flight at a time. Three components mounting together used
    // to be three identical GETs, and whichever landed last won.
    if (inFlight) return inFlight;
    status = status === 'ready' ? 'ready' : 'loading';
    emit();

    inFlight = Promise.resolve()
      .then(load)
      .then((next) => {
        rows = Array.isArray(next) ? next : [];
        status = 'ready';
        error = null;
      })
      .catch((err) => {
        status = 'error';
        error = err?.message || 'Could not load';
      })
      .finally(() => {
        inFlight = null;
        emit();
      });

    return inFlight;
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => rows,
    getStatus: () => status,
    getError: () => error,

    // Fetches once per signed-in session; later callers get what is already
    // there. Anything that changes the rows calls refresh() itself.
    ensure() {
      if (status === 'idle') refresh();
    },
    refresh,

    // Applied locally so a delete or an edit shows immediately rather than
    // after a round trip. The server is still the source: every mutation that
    // uses this follows it with a refresh.
    set(next) {
      rows = next;
      emit();
    },

    reset() {
      rows = [];
      status = 'idle';
      error = null;
      emit();
    },
  };
}
