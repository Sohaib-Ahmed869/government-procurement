import { useSyncExternalStore } from 'react';
import { createStore } from '../utils/localStore.js';
import { getLessonContext } from './placeholderLessons.js';

/* ---------------------------------------------------------------------------
   Bookmarks (L3).

   A bookmark is a lesson, optionally pinned to a moment in it (`at`, seconds)
   so a learner can mark a point in a video rather than the whole thing.

   Same shape rules as notes: slug + lessonId only, titles resolved on read.

   TODO: swap for `bookmarksApi` (fe/src/api/lms.js).
   ------------------------------------------------------------------------ */
const store = createStore('gp.lms.bookmarks');

store.seedOnce([
  {
    id: 'b-seed-1',
    slug: 'commonwealth-procurement-rules',
    lessonId: 'l-3-4',
    at: 85,
    createdAt: '2026-08-12T09:25:00+10:00',
  },
  {
    id: 'b-seed-2',
    slug: 'tender-writing-essentials',
    lessonId: 'l-1-1',
    at: null,
    createdAt: '2026-08-08T11:12:00+10:00',
  },
]);

function hydrate(bookmark) {
  const ctx = getLessonContext(bookmark.slug, bookmark.lessonId);
  if (!ctx) return null;
  return {
    ...bookmark,
    courseTitle: ctx.course.title,
    lessonTitle: ctx.lesson.title,
    lessonKind: ctx.lesson.kind,
    moduleTitle: ctx.module.title,
    minutes: ctx.lesson.minutes,
  };
}

// Toggling ignores `at` when matching: a lesson is bookmarked or it isn't, so
// clicking the button again clears it rather than stacking a second entry at a
// slightly different timestamp.
export function toggleBookmark({ slug, lessonId, at = null }) {
  const all = store.read();
  const existing = all.find((b) => b.slug === slug && b.lessonId === lessonId);
  if (existing) {
    store.write(all.filter((b) => b.id !== existing.id));
    return false;
  }
  store.write([
    {
      id: `b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      slug,
      lessonId,
      at,
      createdAt: new Date().toISOString(),
    },
    ...all,
  ]);
  return true;
}

export function removeBookmark(id) {
  store.write(store.read().filter((b) => b.id !== id));
}

export function useBookmarks() {
  const raw = useSyncExternalStore(store.subscribe, store.read, store.read);
  return raw
    .map(hydrate)
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

// Whether one lesson is bookmarked. Drives the button's pressed state.
export function useIsBookmarked(slug, lessonId) {
  const raw = useSyncExternalStore(store.subscribe, store.read, store.read);
  return raw.some((b) => b.slug === slug && b.lessonId === lessonId);
}
