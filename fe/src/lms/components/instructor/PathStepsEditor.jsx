import { useMemo, useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';

/* ---------------------------------------------------------------------------
   The steps of a learning path (LMS 8.0).

   Every row is a reference to a course that already exists. Nothing here
   creates content, which is the point: a learner who finished one of these
   courses last year keeps that credit when they start the path.

   Prerequisites are chosen from the OTHER STEPS IN THIS PATH, never from the
   whole catalogue. A step that requires a course the path does not contain is
   a step the learner has no route to, and the server rejects it — so the form
   never offers it in the first place.
   ------------------------------------------------------------------------ */
export default function PathStepsEditor({ steps, catalogue, onChange }) {
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');

  const byId = useMemo(
    () => new Map(catalogue.map((c) => [String(c._id), c])),
    [catalogue],
  );
  const chosen = useMemo(() => new Set(steps.map((s) => String(s.course))), [steps]);

  const available = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalogue
      .filter((c) => !chosen.has(String(c._id)))
      .filter((c) => !needle || c.title?.toLowerCase().includes(needle));
  }, [catalogue, chosen, q]);

  const commit = (next) => onChange(next.map((s, i) => ({ ...s, order: i })));

  const add = (courseId) => {
    commit([...steps, { course: String(courseId), required: true, requires: [] }]);
    setPicking(false);
    setQ('');
  };

  // Removing a step also drops it from every other step's prerequisites.
  // Leaving the reference behind would fail validation on save with an error
  // about a step the author can no longer see.
  const remove = (courseId) => {
    const id = String(courseId);
    commit(
      steps
        .filter((s) => String(s.course) !== id)
        .map((s) => ({ ...s, requires: (s.requires ?? []).filter((r) => String(r) !== id) })),
    );
  };

  const move = (index, delta) => {
    const next = [...steps];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const patch = (index, change) => {
    const next = [...steps];
    next[index] = { ...next[index], ...change };
    commit(next);
  };

  const toggleRequires = (index, courseId) => {
    const current = (steps[index].requires ?? []).map(String);
    const id = String(courseId);
    patch(index, {
      requires: current.includes(id) ? current.filter((r) => r !== id) : [...current, id],
    });
  };

  return (
    <div className="lms-pathsteps">
      {steps.length === 0 ? (
        <p className="lms-empty">
          No courses yet. A path needs at least one before it can be submitted.
        </p>
      ) : (
        <ol className="lms-pathsteps__list">
          {steps.map((step, i) => {
            const course = byId.get(String(step.course));
            const others = steps.filter((_, j) => j !== i);
            return (
              <li className="lms-pathstep" key={String(step.course)}>
                <div className="lms-pathstep__head">
                  <span className="lms-pathstep__n">{i + 1}</span>
                  <div className="lms-pathstep__id">
                    <strong>{course?.title ?? 'Course unavailable'}</strong>
                    <span className="lms-pathstep__meta">
                      {course?.status === 'published' ? 'Published' : 'Not published yet'}
                      {course?.level ? ` · ${course.level}` : ''}
                    </span>
                  </div>
                  <div className="lms-pathstep__tools">
                    <button
                      type="button"
                      className="lms-btn lms-btn--sm lms-btn--ghost"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="lms-btn lms-btn--sm lms-btn--ghost"
                      onClick={() => move(i, 1)}
                      disabled={i === steps.length - 1}
                      aria-label="Move down"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="lms-btn lms-btn--sm lms-btn--ghost"
                      onClick={() => remove(step.course)}
                      aria-label="Remove from path"
                      title="Remove from path"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="lms-pathstep__body">
                  {/* The same switch every other on/off setting uses. This row
                      used to put `lms-switch` on the input itself, which is the
                      class for the TRACK — so the styles landed on nothing and
                      the browser drew its own blue tick beside a green page. */}
                  <label className="lms-pref__label">
                    <span className="lms-pref__text">
                      <span className="lms-pref__name">Required</span>
                      <span className="lms-pref__hint">
                        An elective counts toward progress but is not needed for the
                        certificate.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      className="lms-switch__input lms-sr-only"
                      checked={step.required !== false}
                      onChange={(e) => patch(i, { required: e.target.checked })}
                    />
                    <span className="lms-switch" aria-hidden="true">
                      <span className="lms-switch__knob" />
                    </span>
                  </label>

                  {others.length ? (
                    <div className="lms-pathstep__reqs">
                      <span className="lms-field__label">Unlocks after</span>
                      <div className="lms-chipset">
                        {others.map((o) => {
                          const oc = byId.get(String(o.course));
                          const on = (step.requires ?? []).map(String).includes(String(o.course));
                          return (
                            <button
                              type="button"
                              key={String(o.course)}
                              className={`lms-chip${on ? ' is-on' : ''}`}
                              onClick={() => toggleRequires(i, o.course)}
                            >
                              {on ? <LmsIcon name="check" /> : null}
                              {oc?.title ?? 'Course'}
                            </button>
                          );
                        })}
                      </div>
                      <span className="lms-field__hint">
                        Leave all off to make this step open from the start.
                      </span>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {picking ? (
        <div className="lms-card" style={{ marginTop: 14 }}>
          <div className="lms-search lms-search--inline" style={{ width: '100%' }}>
            <LmsIcon name="search" />
            <input
              type="search"
              value={q}
              autoFocus
              placeholder="Search your courses and the catalogue…"
              aria-label="Search courses"
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {available.length === 0 ? (
            <p className="lms-empty">Nothing left to add.</p>
          ) : (
            <ul className="lms-pathpick">
              {available.map((c) => (
                <li key={c._id}>
                  <button type="button" className="lms-pathpick__row" onClick={() => add(c._id)}>
                    <LmsIcon name="book" />
                    <span>
                      <strong>{c.title}</strong>
                      <span className="lms-pathstep__meta">
                        {c.status === 'published' ? 'Published' : 'Your draft'}
                      </span>
                    </span>
                    <LmsIcon name="plus" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="lms-composer__actions" style={{ marginTop: 10 }}>
            <span className="lms-composer__hint">
              Your own courses and anything already published.
            </span>
            <button type="button" className="lms-btn lms-btn--sm" onClick={() => setPicking(false)}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="lms-btn lms-btn--sm lms-btn--primary"
          style={{ marginTop: 14 }}
          onClick={() => setPicking(true)}
        >
          <LmsIcon name="plus" />
          Add a course
        </button>
      )}
    </div>
  );
}
