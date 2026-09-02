import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import Select from '../Select.jsx';

// Ask a question, or reply to one (L5). `withTitle` and the course picker are
// only shown when starting a thread. A reply needs neither.
export default function DiscussionComposer({
  withTitle = false,
  courses = [],
  courseSlug,
  onCourseChange,
  onSubmit,
  submitLabel = 'Post',
  placeholder = 'Write your reply…',
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const valid = body.trim() && (!withTitle || title.trim());

  // Cleared only once the post has landed. Wiping the box on submit loses what
  // someone wrote whenever the request fails, and a long question is not
  // something anyone types twice.
  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onSubmit({ title: title.trim(), body: body.trim() });
      setTitle('');
      setBody('');
    } catch {
      // The caller shows the message; this keeps the text where it is.
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="lms-composer" onSubmit={submit}>
      {withTitle ? (
        <>
          <input
            className="lms-input lms-composer__title"
            value={title}
            placeholder="What's your question?"
            aria-label="Question title"
            onChange={(e) => setTitle(e.target.value)}
          />
          {courses.length ? (
            <Select
              className="lms-composer__course"
              aria-label="Course"
              value={courseSlug}
              onChange={onCourseChange}
              options={courses.map((c) => ({ value: c.slug, label: c.title }))}
            />
          ) : null}
        </>
      ) : null}

      <textarea
        className="lms-textarea"
        rows={withTitle ? 4 : 3}
        value={body}
        placeholder={placeholder}
        aria-label={withTitle ? 'Question detail' : 'Your reply'}
        onChange={(e) => setBody(e.target.value)}
      />

      <div className="lms-composer__actions">
        <span className="lms-composer__hint">
          Answers come from instructors and other learners on the same course.
        </span>
        <button
          type="submit"
          className="lms-btn lms-btn--primary lms-btn--sm"
          disabled={!valid || busy}
        >
          <LmsIcon name="chat" />
          {busy ? 'Posting…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
