import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';

const FIELDS = [
  { key: 'displayName', label: 'Display name', hint: 'Shown on your questions and reviews. Leave blank to use your account name.' },
  { key: 'title', label: 'Role or title', hint: 'e.g. Procurement Officer' },
  { key: 'organisation', label: 'Organisation' },
  { key: 'location', label: 'Location' },
  { key: 'website', label: 'Website', type: 'url', hint: 'Optional' },
];

// Edit the public profile (L6).
export default function ProfileForm({ profile, onSave, onCancel }) {
  const [form, setForm] = useState(profile);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      className="lms-profileform"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="lms-formgrid">
        {FIELDS.map((f) => (
          <label className="lms-field" key={f.key}>
            <span className="lms-field__label">{f.label}</span>
            <input
              className="lms-input"
              type={f.type ?? 'text'}
              value={form[f.key] ?? ''}
              onChange={set(f.key)}
            />
            {f.hint ? <span className="lms-field__hint">{f.hint}</span> : null}
          </label>
        ))}
      </div>

      <label className="lms-field">
        <span className="lms-field__label">About you</span>
        <textarea
          className="lms-textarea"
          rows={4}
          value={form.bio ?? ''}
          onChange={set('bio')}
        />
        <span className="lms-field__hint">
          A line or two of context helps when you ask a question. People answer better when
          they know what you work on.
        </span>
      </label>

      <div className="lms-composer__actions">
        <span className="lms-composer__hint">
          Your profile is visible to other learners on your courses.
        </span>
        <div className="lms-reviewform__buttons">
          <button type="button" className="lms-btn lms-btn--sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="lms-btn lms-btn--sm lms-btn--primary">
            <LmsIcon name="check" />
            Save profile
          </button>
        </div>
      </div>
    </form>
  );
}
