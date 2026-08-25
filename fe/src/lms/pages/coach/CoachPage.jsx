import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { useMyCourses } from '../../hooks/useMyCourses.js';
import { useCoach } from '../../hooks/useCoach.js';

/* ---------------------------------------------------------------------------
   Course Coach (LMS 18.0) — AI study help inside the student LMS.

   ---- Read this before moving it --------------------------------------------

   This screen lives at /learn/coach and must never appear on /advisory. The
   Procurement Advisor there is contractually NOT AI and says so on its own
   face; an AI assistant sharing its surface, or its name, undoes that claim.
   The word "Advisor" belongs to that tool. This one is a coach.

   The separation is enforced in three places and this is the third: the server
   only ever hands the model one enrolled course's lessons (coach/context.js),
   the prompt refuses real procurement questions and hands them to /advisory
   (coach/prompt.js), and the feature is mounted only under /learn.

   ---- Why a course has to be picked first -----------------------------------

   Not a step to be optimised away later. The coach answers from ONE course's
   material, so which course is not a filter on the answer — it IS the answer's
   source. Picking it first is what makes "only answers questions about the
   courses" true rather than aspirational.
   ------------------------------------------------------------------------ */

// Openers, so an empty box is not the first thing a learner has to solve. They
// are phrased as course questions on purpose — they teach what this is for.
const SUGGESTIONS = [
  'Summarise what this course covers.',
  'Explain the last thing I studied in simpler terms.',
  'Give me three practice questions on this material.',
];

function Sources({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className="lms-coach__sources">
      <p className="lms-coach__sources-label">From these lessons</p>
      <ul>
        {sources.map((src) => (
          <li key={src.to}>
            <Link to={src.to}>{src.title}</Link>
            {/* The passage the answer actually leant on. Shown so the learner
                can see WHY a lesson was cited without opening it. */}
            {src.quote ? <span className="lms-coach__quote">“{src.quote}”</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CoachPage() {
  const { courses, status } = useMyCourses();
  const [courseId, setCourseId] = useState('');
  const [draft, setDraft] = useState('');
  const threadRef = useRef(null);

  const course = courses.find((c) => String(c.id) === String(courseId)) ?? null;
  const { turns, ask, clear, asking, error, available, disclaimer, operatorMessage } =
    useCoach(courseId);

  // Default to the first enrolment so a learner with one course never has to
  // make a choice that has one option.
  useEffect(() => {
    if (!courseId && courses.length) setCourseId(String(courses[0].id));
  }, [courses, courseId]);

  // Follow the conversation as it grows, rather than leaving the newest answer
  // below the fold.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, asking]);

  const submit = (e) => {
    e.preventDefault();
    if (!draft.trim() || asking) return;
    ask(draft);
    setDraft('');
  };

  const head = (
    <div className="lms-page__head">
      <div>
        <h1 className="lms-page__title">Course Coach</h1>
        <p className="lms-page__subtitle">
          Ask about anything in a course you’re enrolled in. It answers from that course’s
          lessons and shows you which ones.
        </p>
      </div>
      {turns.length ? (
        <div className="lms-page__actions">
          <button type="button" className="lms-btn" onClick={clear}>
            <LmsIcon name="plus" />
            New conversation
          </button>
        </div>
      ) : null}
    </div>
  );

  if (status === 'loading') {
    return (
      <div>
        {head}
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '40%', height: 20 }} />
        </div>
      </div>
    );
  }

  // Nothing to coach on. Said plainly rather than showing a composer wired to a
  // course that does not exist.
  if (!courses.length) {
    return (
      <div>
        {head}
        <div className="lms-card">
          <p className="lms-empty">
            The coach answers from courses you’re enrolled in, and you don’t have any yet.
          </p>
          <Link className="lms-btn lms-btn--primary" to="/learn/courses" style={{ marginTop: 12 }}>
            Browse the catalogue
          </Link>
        </div>
      </div>
    );
  }

  if (!available) {
    return (
      <div>
        {head}
        <div className="lms-card">
          <p className="lms-empty">
            The course coach isn’t available at the moment.
          </p>
          {/* Only staff are sent the reason; for everyone else this is absent. */}
          {operatorMessage ? (
            <p className="lms-detail__note" style={{ marginTop: 8 }}>{operatorMessage}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      {head}

      <div className="lms-card lms-coach">
        <div className="lms-coach__bar">
          <label className="lms-field lms-coach__picker">
            <span className="lms-field__label">Course</span>
            <select
              className="lms-input"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </label>
          {course ? (
            <Link className="lms-btn lms-btn--sm" to={`/learn/courses/${course.slug}`}>
              Open course
            </Link>
          ) : null}
        </div>

        <div className="lms-coach__thread" ref={threadRef}>
          {!turns.length ? (
            <div className="lms-coach__intro">
              <span className="lms-coach__mark" aria-hidden="true"><LmsIcon name="sparkle" /></span>
              <p className="lms-coach__introtitle">
                Ask about {course ? course.title : 'this course'}
              </p>
              <p className="lms-coach__introtext">
                It reads the lessons in this course and answers from them. It won’t give
                advice about a real procurement — the{' '}
                <a href="/advisory">Procurement Advisor</a> covers that, and it isn’t AI.
              </p>
              <ul className="lms-coach__suggestions">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => ask(s)} disabled={asking}>{s}</button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            turns.map((turn) => (
              <div
                key={turn.id}
                className={`lms-coach__turn is-${turn.role}`}
              >
                {turn.role === 'assistant' ? (
                  <span className="lms-coach__mark lms-coach__mark--sm" aria-hidden="true">
                    <LmsIcon name="sparkle" />
                  </span>
                ) : null}
                <div className="lms-coach__bubble">
                  {turn.text
                    ? turn.text.split('\n\n').map((para, i) => <p key={i}>{para}</p>)
                    : null}
                  {/* A refusal, or a course with nothing written yet. The
                      server's wording, shown as the coach's reply because that
                      is what it is — not an error. */}
                  {turn.note ? <p className="lms-coach__note">{turn.note}</p> : null}
                  <Sources sources={turn.sources} />
                </div>
              </div>
            ))
          )}

          {asking ? (
            <div className="lms-coach__turn is-assistant">
              <span className="lms-coach__mark lms-coach__mark--sm" aria-hidden="true">
                <LmsIcon name="sparkle" />
              </span>
              <div className="lms-coach__bubble lms-coach__bubble--wait">
                Reading the course…
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className="lms-alert lms-alert--error">{error}</p> : null}

        <form className="lms-coach__composer" onSubmit={submit}>
          <textarea
            className="lms-textarea"
            rows={2}
            value={draft}
            placeholder={`Ask about ${course ? course.title : 'this course'}…`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter breaks the line. A question is usually
              // one line, and reaching for a button each time is friction.
              if (e.key === 'Enter' && !e.shiftKey) submit(e);
            }}
            disabled={asking}
          />
          <button
            type="submit"
            className="lms-btn lms-btn--primary"
            disabled={asking || !draft.trim()}
          >
            {asking ? 'Asking…' : 'Ask'}
          </button>
        </form>

        {/* The inverse of the Procurement Advisor's disclaimer, and on screen
            for the same reason: whichever is true has to be said, not implied.
            A6 says "this tool is not AI-powered"; this one has to say it is. */}
        <p className="lms-coach__disclaimer">{disclaimer}</p>
      </div>
    </div>
  );
}
