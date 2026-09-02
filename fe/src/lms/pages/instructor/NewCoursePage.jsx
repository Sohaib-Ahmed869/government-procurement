import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { formatMoney, gstInside } from '../../utils/money.js';
import { authoringApi } from '../../../api/lms.js';
import { LEVELS, SEGMENTS } from '../../constants/courseTaxonomy.js';
import Select from '../../components/Select.jsx';

// Create a course (R1).
//
// Deliberately short. Asking for everything up front is how course builders end
// up abandoned halfway. A title is enough to start, and the rest is edited in
// the builder where the author can see it in context.
export default function NewCoursePage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', summary: '', level: 'beginner', segment: 'general', price: 0 });
  const [touched, setTouched] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  // Select passes the value, not an event — the inputs above still pass events.
  const pick = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));
  const valid = form.title.trim().length >= 3;

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      // The server assigns the slug. It reserves the words that would collide
      // with a route, so the client must not guess at one.
      const course = await authoringApi.create(form);
      navigate(`/learn/instructor/courses/${course._id}`, { replace: true });
    } catch (err) {
      setError(err?.message ?? 'Could not create the course.');
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <Link className="lms-backlink" to="/learn/instructor/courses">
            <LmsIcon name="chevron" className="lms-backlink__icon" />
            My courses
          </Link>
          <h1 className="lms-page__title">New course</h1>
          <p className="lms-page__subtitle">
            Just the basics to get started. Everything else is editable in the builder.
          </p>
        </div>
      </div>

      <form className="lms-card lms-newcourse" onSubmit={submit} noValidate>
        <label className="lms-field">
          <span className="lms-field__label">Course title</span>
          <input
            className="lms-input"
            value={form.title}
            placeholder="e.g. Commonwealth Procurement Rules in Practice"
            onChange={set('title')}
            autoFocus
          />
          {touched && !valid ? (
            <span className="lms-field__error">Give it a title of at least 3 characters.</span>
          ) : null}
        </label>

        <label className="lms-field">
          <span className="lms-field__label">
            Summary <span className="lms-field__optional">optional</span>
          </span>
          <textarea
            className="lms-textarea"
            rows={3}
            value={form.summary}
            placeholder="What will someone be able to do after this course?"
            onChange={set('summary')}
          />
        </label>

        {/* Two per row, not three. Three fields of unequal label length wrapped
            to 2 + 1 at this card's width, which is what made the row look
            ragged. Price sits on its own line because it is a different kind of
            decision from the two taxonomy pickers. */}
        <div className="lms-formgrid lms-formgrid--2">
          <label className="lms-field">
            <span className="lms-field__label">Category</span>
            <Select value={form.segment} onChange={pick('segment')} options={SEGMENTS} />
            <span className="lms-field__hint">Which audience filter it appears under.</span>
          </label>

          <label className="lms-field">
            <span className="lms-field__label">Level</span>
            <Select value={form.level} onChange={pick('level')} options={LEVELS} />
            <span className="lms-field__hint">How much prior knowledge it assumes.</span>
          </label>
        </div>

        <label className="lms-field lms-field--price">
          {/* INCLUSIVE, not ex GST. A price here is what the learner pays; the
              GST is the component inside it. The old label said the opposite
              and would have had instructors pricing 10% low. */}
          <span className="lms-field__label">Price (AUD, incl. GST)</span>
          <input className="lms-input" type="number" min="0" step="1" value={form.price} onChange={set('price')} />
          <span className="lms-field__hint">
            {Number(form.price) > 0
              ? `Learners pay ${formatMoney(Number(form.price))} — includes ${formatMoney(gstInside(Number(form.price)))} GST.`
              : 'Leave at 0 to make it free.'}
          </span>
        </label>

        {error ? <p className="lms-alert lms-alert--error">{error}</p> : null}

        <div className="lms-formfoot">
          <p className="lms-formfoot__hint">
            It starts as a draft. Nothing is visible to learners until you publish.
          </p>
          <button type="submit" className="lms-btn lms-btn--primary" disabled={!valid || busy}>
            <LmsIcon name="plus" />
            {busy ? 'Creating…' : 'Create and start building'}
          </button>
        </div>
      </form>
    </div>
  );
}
