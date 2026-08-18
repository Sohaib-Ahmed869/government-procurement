import { useSyncExternalStore } from 'react';
import { createStore } from '../utils/localStore.js';
import { getLessonContext } from './placeholderLessons.js';

/* ---------------------------------------------------------------------------
   Notes (L3).

   Records store `slug` + `lessonId` only. Never the course or lesson title.
   Titles are resolved at read time from the same source the rest of the app
   uses, so renaming a lesson doesn't leave stale copies embedded in old notes.

   TODO: swap for `notesApi` (fe/src/api/lms.js). Per-browser until then, so
   notes don't follow the learner to another device.
   ------------------------------------------------------------------------ */
const store = createStore('gp.lms.notes');

// A few sample notes so the page has something to show on a first visit.
// Written once and never re-applied. See seedOnce.
store.seedOnce([
  {
    id: 'n-seed-1',
    slug: 'commonwealth-procurement-rules',
    lessonId: 'l-3-4',
    text: 'Weightings must be dated BEFORE release. Auditors check the timestamp on the evaluation plan. Ask Sarah how our team records this.',
    at: 75,
    createdAt: '2026-08-12T09:22:00+10:00',
    updatedAt: '2026-08-12T09:22:00+10:00',
  },
  {
    id: 'n-seed-2',
    slug: 'commonwealth-procurement-rules',
    lessonId: 'l-1-1',
    text: 'Four things locked before release: requirement, criteria + weightings, conditions for participation, timetable.',
    at: null,
    createdAt: '2026-08-11T14:05:00+10:00',
    updatedAt: '2026-08-11T14:05:00+10:00',
  },
  {
    id: 'n-seed-3',
    slug: 'ethics-and-probity',
    lessonId: 'l-2-1',
    text: 'Conflict declarations need refreshing at each stage, not just at the start of the process.',
    at: null,
    createdAt: '2026-08-10T11:40:00+10:00',
    updatedAt: '2026-08-10T11:40:00+10:00',
  },
]);

// Attaches course and lesson titles, dropping any note whose lesson no longer
// exists rather than rendering a row that links nowhere.
function hydrate(note) {
  const ctx = getLessonContext(note.slug, note.lessonId);
  if (!ctx) return null;
  return {
    ...note,
    courseTitle: ctx.course.title,
    lessonTitle: ctx.lesson.title,
    lessonKind: ctx.lesson.kind,
    moduleTitle: ctx.module.title,
  };
}

export function addNote({ slug, lessonId, text, at = null }) {
  const now = new Date().toISOString();
  const note = {
    id: `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    slug,
    lessonId,
    text,
    at,
    createdAt: now,
    updatedAt: now,
  };
  store.write([note, ...store.read()]);
  return note;
}

export function updateNote(id, text) {
  store.write(
    store.read().map((n) =>
      n.id === id ? { ...n, text, updatedAt: new Date().toISOString() } : n,
    ),
  );
}

export function removeNote(id) {
  store.write(store.read().filter((n) => n.id !== id));
}

// All notes, newest first, with titles resolved.
export function useNotes() {
  const raw = useSyncExternalStore(store.subscribe, store.read, store.read);
  return raw
    .map(hydrate)
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

// Just one lesson's notes. What the in-lesson editor shows.
export function useLessonNotes(slug, lessonId) {
  const raw = useSyncExternalStore(store.subscribe, store.read, store.read);
  return raw
    .filter((n) => n.slug === slug && n.lessonId === lessonId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
