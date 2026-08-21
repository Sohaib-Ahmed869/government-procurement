import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';

// Edit the instructor's public byline (R1).
//
// Unlike the learner's ProfileForm this saves to the SERVER, because these
// fields are printed next to their courses on the public site. A byline held in
// one browser's localStorage would show the author's name to nobody but the
// author.
//
// `status` is not here on purpose. An instructor lifting their own suspension
// would defeat the point of it, and the endpoint refuses it anyway.
export default function InstructorProfileForm({ profile, onSave, onCancel }) {
  const [form, setForm] = useState({
    headline: profile?.headline ?? '',
    organisation: profile?.organisation ?? '',
    bio: profile?.bio ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      // Kept on screen with the typed values intact. A failed save that clears
      // the form loses work the author has to retype from memory.
      setError(err?.message ?? 'Could not save your profile');
      setSaving(false);
    }
  };

  return (
    <form className="lms-profileform" onSubmit={submit}>
      <div className="lms-formgrid">
        <label className="lms-field">
          <span className="lms-field__label">Headline</span>
          <input
            className="lms-input"
            type="text"
            value={form.headline}
            onChange={set('headline')}
            maxLength={120}
          />
          <span className="lms-field__hint">
            Your credential, in a few words. e.g. Principal Advisor, Procurement Policy.
          </span>
        </label>

        <label className="lms-field">
          <span className="lms-field__label">Organisation</span>
          <input
            className="lms-input"
            type="text"
            value={form.organisation}
            onChange={set('organisation')}
            maxLength={120}
          />
        </label>
      </div>

      <label className="lms-field">
        <span className="lms-field__label">Bio</span>
        <textarea
          className="lms-textarea"
          rows={5}
          value={form.bio}
          onChange={set('bio')}
        />
        <span className="lms-field__hint">
          What you have done that makes this course worth taking from you. Learners read
          this before they enrol.
        </span>
      </label>

      {error ? <p className="lms-alert lms-alert--error">{error}</p> : null}

      <div className="lms-composer__actions">
        <span className="lms-composer__hint">
          Shown on your course pages and anywhere your name appears on the site.
        </span>
        <div className="lms-reviewform__buttons">
          <button type="button" className="lms-btn lms-btn--sm" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="lms-btn lms-btn--sm lms-btn--primary" disabled={saving}>
            <LmsIcon name="check" />
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>
    </form>
  );
}
