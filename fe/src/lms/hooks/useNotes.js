import { useEffect, useSyncExternalStore } from 'react';
import { notesApi } from '../../api/lms.js';
import { createRemoteStore } from '../utils/remoteStore.js';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';

/* ---------------------------------------------------------------------------
   Notes (L3), from the API.

   This was localStorage seeded with three written-out sample notes. Two things
   were wrong with that beyond the samples: a learner's notes lived on one
   browser, so they were gone on their phone and gone again when the profile was
   cleared; and the lesson each one pointed at was resolved against the
   hardcoded course list, so a note on a REAL lesson could not be rendered at
   all — `hydrate` dropped anything it could not find there.

   Records still store the lesson and nothing else about it. Titles are resolved
   server-side at read time, so renaming a lesson updates every note that points
   at it rather than leaving a stale copy in each.
   ------------------------------------------------------------------------ */

const store = createRemoteStore(() => notesApi.list());

// The API's shape, in the names the note components already use. Mapping here
// rather than renaming six call sites keeps this swap to one file — and `text`
// vs `body` is the sort of rename that silently blanks a textarea.
function normalise(row) {
  return {
    id: row._id,
    slug: row.courseSlug,
    lessonId: row.lesson,
    text: row.body,
    at: row.at ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    courseTitle: row.courseTitle,
    lessonTitle: row.lessonTitle,
    lessonKind: row.lessonKind,
    moduleTitle: row.moduleTitle,
    minutes: row.minutes,
  };
}

/* ---- Mutations -------------------------------------------------------------

   Each one writes through the API and then refreshes, rather than patching the
   local array and trusting it. A note's rendered title comes from the server,
   so a locally-invented row would be a note with no course name on it until the
   next page load. */

export async function addNote({ lessonId, text, at = null }) {
  const created = await notesApi.create({ lessonId, body: text, at });
  await store.refresh();
  return created;
}

export async function updateNote(id, text) {
  await notesApi.update(id, { body: text });
  await store.refresh();
}

export async function removeNote(id) {
  // Dropped locally first so the row goes on the click. The refresh behind it
  // is what makes the server the authority: if the delete failed, the note
  // comes back rather than staying gone until reload.
  store.set(store.snapshot().filter((n) => n._id !== id));
  await notesApi.remove(id);
  await store.refresh();
}

/* ---- Reads ---------------------------------------------------------------- */

// Loads on first use and empties on sign-out, so the next account does not open
// on the last one's notes.
function useNotesStore() {
  const { user } = useStudentAuth();
  const rows = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);

  useEffect(() => {
    if (user) store.ensure();
    else store.reset();
  }, [user]);

  return rows;
}

// All notes, newest first. The server sorts; nothing is re-sorted here, so the
// order cannot differ between this and any other view of the same list.
export function useNotes() {
  return useNotesStore().map(normalise);
}

// Just one lesson's notes. What the in-lesson editor shows.
export function useLessonNotes(slug, lessonId) {
  return useNotesStore()
    .filter((n) => String(n.lesson) === String(lessonId))
    .map(normalise);
}
