import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import NoteList from './NoteList.jsx';
import { addNote, useLessonNotes } from '../../hooks/useNotes.js';
import { formatTime } from '../../utils/transcript.js';

// Per-lesson notes (L3). Notes are private to the learner and scoped to the
// lesson, so they travel with the content rather than living in one long list,
// and they also surface on the Notes page, grouped by course.
//
// In a video lesson `timestamp` is the current playhead, so the note records
// the moment it was taken and links back to it.
export default function NoteEditor({ slug, lessonId, timestamp }) {
  const notes = useLessonNotes(slug, lessonId);
  const [draft, setDraft] = useState('');

  const add = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    addNote({ slug, lessonId, text, at: timestamp != null ? Math.floor(timestamp) : null });
    setDraft('');
  };

  return (
    <div>
      <form className="lms-note-form" onSubmit={add}>
        <textarea
          className="lms-textarea"
          rows={3}
          value={draft}
          placeholder={
            timestamp != null
              ? 'Add a note at this point in the video…'
              : 'Add a note for this lesson…'
          }
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="lms-note-form__actions">
          {timestamp != null ? (
            <span className="lms-note__stamp">
              <LmsIcon name="clock" />
              {formatTime(timestamp)}
            </span>
          ) : (
            <span />
          )}
          <button type="submit" className="lms-btn lms-btn--sm lms-btn--primary" disabled={!draft.trim()}>
            Save note
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="lms-empty" style={{ padding: '14px 0 0' }}>
          No notes on this lesson yet.
        </p>
      ) : (
        <NoteList notes={notes} showContext={false} />
      )}
    </div>
  );
}
