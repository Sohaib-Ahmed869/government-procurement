/* ---------------------------------------------------------------------------
   A tiny observable store backed by localStorage.

   Three LMS features need the same thing while the backend is missing,
   attempts, notes and bookmarks, and each was about to grow its own copy of
   read/write/parse/guard. This is that code, once.

   It is observable so two components showing the same data stay in step: the
   bookmark button in a lesson and the count on the Bookmarks page update
   together, without either knowing about the other.

   Every consumer of this is temporary. When the API lands, the hooks swap their
   store calls for requests and this file goes with them.
   ------------------------------------------------------------------------ */
export function createStore(key, initial = []) {
  const listeners = new Set();
  let cache;
  let loaded = false;

  function read() {
    if (loaded) return cache;
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      cache = Array.isArray(parsed) ? parsed : initial;
    } catch {
      // Corrupt or unavailable storage shouldn't take the feature down.
      cache = initial;
    }
    loaded = true;
    return cache;
  }

  function write(next) {
    // Cached by reference so getSnapshot is stable between renders,
    // useSyncExternalStore loops forever if it returns a new array each call.
    cache = next;
    loaded = true;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* private mode / quota. State is still live for this session */
    }
    listeners.forEach((l) => l());
  }

  // Writes the seed only if this store has never been written before, so it
  // never overwrites something the learner has changed, including back to
  // empty after they delete everything.
  function seedOnce(rows) {
    try {
      if (localStorage.getItem(key) !== null) return;
    } catch {
      return;
    }
    write(rows);
  }

  return {
    read,
    write,
    seedOnce,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
