import { useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { removeNote, updateNote } from '../../hooks/useNotes.js';
import { lessonHref } from '../../utils/lessonHref.js';
import { formatTime } from '../../utils/transcript.js';

function when(iso) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// A note, editable in place (L3). `showContext` adds the course/lesson line,
// on for the aggregate Notes page, off inside a lesson where it would just
// repeat the heading above it.
function NoteItem({ note, showContext }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const [confirming, setConfirming] = useState(false);

  const save = () => {
    const text = draft.trim();
    if (text) updateNote(note.id, text);
    setEditing(false);
  };

  return (
    <li className="lms-note">
      <div className="lms-note__head">
        {note.at != null ? (
          <Link
            className="lms-note__stamp"
            to={`${lessonHref(note.slug, { id: note.lessonId, kind: note.lessonKind })}#t=${Math.floor(note.at)}`}
            title="Open the video at this point"
          >
            <LmsIcon name="clock" />
            {formatTime(note.at)}
          </Link>
        ) : (
          <span />
        )}

        <div className="lms-note__actions">
          {editing ? (
            <>
              <button type="button" className="lms-btn lms-btn--sm" onClick={() => { setDraft(note.text); setEditing(false); }}>
                Cancel
              </button>
              <button type="button" className="lms-btn lms-btn--sm lms-btn--primary" onClick={save}>
                Save
              </button>
            </>
          ) : confirming ? (
            <>
              <span className="lms-note__confirm">Delete this note?</span>
              <button type="button" className="lms-btn lms-btn--sm" onClick={() => setConfirming(false)}>
                Keep
              </button>
              <button type="button" className="lms-btn lms-btn--sm lms-btn--danger" onClick={() => removeNote(note.id)}>
                Delete
              </button>
            </>
          ) : (
            <>
              <button type="button" className="lms-btn lms-btn--sm lms-btn--ghost" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className="lms-btn lms-btn--sm lms-btn--ghost" onClick={() => setConfirming(true)}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          className="lms-textarea"
          rows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      ) : (
        <p className="lms-note__text">{note.text}</p>
      )}

      <div className="lms-note__foot">
        {showContext ? (
          <Link
            className="lms-note__where"
            to={lessonHref(note.slug, { id: note.lessonId, kind: note.lessonKind })}
          >
            <LmsIcon name={note.lessonKind} />
            {note.lessonTitle}
          </Link>
        ) : (
          <span />
        )}
        <span className="lms-note__date">
          {note.updatedAt !== note.createdAt ? 'Edited ' : ''}
          {when(note.updatedAt)}
        </span>
      </div>
    </li>
  );
}

export default function NoteList({ notes, showContext = true }) {
  if (!notes.length) return null;
  return (
    <ul className="lms-notes">
      {notes.map((n) => (
        <NoteItem key={n.id} note={n} showContext={showContext} />
      ))}
    </ul>
  );
}
