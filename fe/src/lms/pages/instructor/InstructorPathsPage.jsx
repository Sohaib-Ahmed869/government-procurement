import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { authoringApi } from '../../../api/lms.js';
import { useAuthoredPrograms, displayStatus, STATUS_LABEL } from '../../hooks/usePrograms.js';

// The instructor's learning paths (LMS 8.0).
//
// Creating one is a title and nothing else, the same as a course: the decision
// an author is making at that moment is "start a path", and a form asking for
// eight fields before it will let them is a form they close.
export default function InstructorPathsPage() {
  const { programs, status, reload } = useAuthoredPrograms();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const create = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError('');
    try {
      const program = await authoringApi.createProgram({ title: title.trim() });
      navigate(`/learn/instructor/paths/${program._id}`);
    } catch (err) {
      setError(err?.message ?? 'Could not create the path');
    }
  };

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Learning Paths</h1>
          <p className="lms-page__subtitle">
            A sequence of courses that already exist, with its own certificate at the end.
          </p>
        </div>
        {!creating ? (
          <div className="lms-page__actions">
            <button type="button" className="lms-btn lms-btn--primary" onClick={() => setCreating(true)}>
              <LmsIcon name="plus" />
              New path
            </button>
          </div>
        ) : null}
      </div>

      {creating ? (
        <section className="lms-card" style={{ marginBottom: 18 }}>
          <form className="lms-composer" onSubmit={create}>
            <label className="lms-field">
              <span className="lms-field__label">What is the path called?</span>
              <input
                className="lms-input"
                value={title}
                autoFocus
                placeholder="e.g. Procurement Practitioner"
                onChange={(e) => setTitle(e.target.value)}
              />
              <span className="lms-field__hint">
                You can rename it later. Nothing is visible to learners until an admin
                approves it.
              </span>
            </label>
            {error ? <p className="lms-alert lms-alert--error">{error}</p> : null}
            <div className="lms-composer__actions">
              <span className="lms-composer__hint">Courses are added on the next screen.</span>
              <div className="lms-reviewform__buttons">
                <button type="button" className="lms-btn lms-btn--sm" onClick={() => setCreating(false)}>
                  Cancel
                </button>
                <button type="submit" className="lms-btn lms-btn--sm lms-btn--primary" disabled={!title.trim()}>
                  <LmsIcon name="check" />
                  Create path
                </button>
              </div>
            </div>
          </form>
        </section>
      ) : null}

      {status === 'loading' ? (
        <div className="lms-card"><p className="lms-empty">Loading your paths…</p></div>
      ) : programs.length === 0 ? (
        <div className="lms-card">
          <div className="lms-blank">
            <LmsIcon name="path" className="lms-blank__icon" />
            <h2>No learning paths yet</h2>
            <p>
              A path strings existing courses into a program. A learner who has already
              finished one of them keeps that credit, so paths reuse your courses rather
              than repeating them.
            </p>
            <button type="button" className="lms-btn lms-btn--primary" onClick={() => setCreating(true)}>
              <LmsIcon name="plus" />
              Create a path
            </button>
          </div>
        </div>
      ) : (
        <div className="lms-instructor-courses">
          {programs.map((p) => {
            const state = displayStatus(p);
            return (
              <article className="lms-icourse" key={p._id}>
                <div className="lms-icourse__head">
                  <div className="lms-icourse__id">
                    <span className={`lms-icourse__thumb is-accent-${(p.accent ?? 0) % 6}`} aria-hidden="true">
                      <LmsIcon name="path" />
                    </span>
                    <div>
                      <h2 className="lms-icourse__title">
                        <Link to={`/learn/instructor/paths/${p._id}`}>{p.title}</Link>
                      </h2>
                      <p className="lms-icourse__meta">
                        {p.stepCount} {p.stepCount === 1 ? 'course' : 'courses'}
                        {p.courses?.length ? ` · ${p.courses.map((c) => c.title).join(' → ')}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`lms-pill lms-pill--${state}`}>{STATUS_LABEL[state]}</span>
                </div>

                {p.reviewNote && (state === 'rejected' || state === 'declined') ? (
                  <p className="lms-alert lms-alert--error">
                    <strong>{state === 'declined' ? 'Not accepted' : 'Changes requested'}:</strong>{' '}
                    {p.reviewNote}
                  </p>
                ) : null}

                <div className="lms-icourse__actions">
                  <Link className="lms-btn lms-btn--sm" to={`/learn/instructor/paths/${p._id}`}>
                    <LmsIcon name="note" />
                    Edit
                  </Link>
                  {p.status === 'published' ? (
                    <Link className="lms-btn lms-btn--sm lms-btn--ghost" to={`/learn/paths/${p.slug}`}>
                      <LmsIcon name="eye" />
                      View
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {status === 'error' ? (
        <p className="lms-empty">
          Couldn’t load your paths.{' '}
          <button type="button" className="lms-linkbtn" onClick={reload}>Try again</button>
        </p>
      ) : null}
    </div>
  );
}
