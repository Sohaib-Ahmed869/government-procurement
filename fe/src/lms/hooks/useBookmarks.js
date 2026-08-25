import { useEffect, useSyncExternalStore } from 'react';
import { bookmarksApi } from '../../api/lms.js';
import { createRemoteStore } from '../utils/remoteStore.js';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';

/* ---------------------------------------------------------------------------
   Bookmarks (L3), from the API.

   Same swap as notes, and for the same reasons: this was localStorage seeded
   with sample rows, so a bookmark stayed on the browser that made it and a
   bookmark on a real lesson could not be rendered — the old `hydrate` resolved
   titles against the hardcoded course list and dropped anything missing from
   it.

   A bookmark is a lesson, optionally pinned to a moment in it (`at`, seconds),
   so a learner can mark a point in a video rather than the whole thing.
   ------------------------------------------------------------------------ */

const store = createRemoteStore(() => bookmarksApi.list());

function normalise(row) {
  return {
    id: row._id,
    slug: row.courseSlug,
    lessonId: row.lesson,
    at: row.at ?? null,
    label: row.label || '',
    createdAt: row.createdAt,
    courseTitle: row.courseTitle,
    lessonTitle: row.lessonTitle,
    lessonKind: row.lessonKind,
    moduleTitle: row.moduleTitle,
    minutes: row.minutes,
  };
}

// Toggling ignores `at` when matching: a lesson is bookmarked or it isn't, so
// pressing the button again clears it rather than stacking a second entry at a
// slightly different timestamp. (The server's own uniqueness is per moment,
// which is what lets a learner mark several points in one video deliberately —
// this button just isn't the way to do that.)
export async function toggleBookmark({ lessonId, at = null }) {
  const existing = store.snapshot().find((b) => String(b.lesson) === String(lessonId));

  if (existing) {
    store.set(store.snapshot().filter((b) => b._id !== existing._id));
    await bookmarksApi.remove(existing._id);
    await store.refresh();
    return false;
  }

  await bookmarksApi.create({ lessonId, at });
  await store.refresh();
  return true;
}

export async function removeBookmark(id) {
  store.set(store.snapshot().filter((b) => b._id !== id));
  await bookmarksApi.remove(id);
  await store.refresh();
}

function useBookmarksStore() {
  const { user } = useStudentAuth();
  const rows = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);

  useEffect(() => {
    if (user) store.ensure();
    else store.reset();
  }, [user]);

  return rows;
}

// Newest first, as the server returns them.
export function useBookmarks() {
  return useBookmarksStore().map(normalise);
}

// Whether one lesson is bookmarked. Drives the button's pressed state.
export function useIsBookmarked(slug, lessonId) {
  return useBookmarksStore().some((b) => String(b.lesson) === String(lessonId));
}
