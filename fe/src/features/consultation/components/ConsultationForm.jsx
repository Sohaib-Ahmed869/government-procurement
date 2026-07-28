import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { consultationsApi } from '../../../api';
import './ConsultationForm.css';

// What a booking gets you — mirrors the contact details column, but as a short
// "what to expect" list rather than phone/email pills.
const EXPECTATIONS = [
  'A 30-minute call with one of our procurement specialists.',
  'A tailored view of where we can add value to your bids.',
  'Clear next steps, no obligation, no hard sell.',
];

const REASON_OPTIONS = [
  { value: 'business', label: "Business — I'm exploring hiring Government Procurement" },
  {
    value: 'press',
    label: "Press — I'm a media representative seeking an expert perspective",
  },
  {
    value: 'events',
    label:
      "Events — I'm looking to invite Government Procurement to participate in an upcoming event",
  },
  { value: 'other', label: 'Other' },
];

// Fields the user must fill before we let the booking through. Role is the only
// optional one, so it's absent here.
const REQUIRED_FIELDS = {
  name: 'Please enter your full name.',
  email: 'Please enter your work email.',
  organisation: 'Please enter your organisation.',
  reason: 'Please choose a reason for contacting us.',
  message: 'Please tell us a little about what you need.',
};

const EMPTY_FORM = {
  name: '',
  email: '',
  organisation: '',
  role: '',
  reason: '',
  message: '',
};

// Custom listbox rather than a native <select>: the popup on a native select is
// drawn by the OS, so it can't take the rounded, glass treatment the rest of the
// form uses. Mirrors the contact form's topic picker.
function ThemedSelect({ id, options, value, placeholder, invalid, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className="consult__select-wrap" ref={ref}>
      <button
        type="button"
        id={id}
        className={`consult__input consult__select${current ? '' : ' is-placeholder'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={() => setOpen((o) => !o)}
      >
        {current ? current.label : placeholder}
      </button>

      <span className={`consult__chevron${open ? ' is-open' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>

      {open && (
        <ul className="consult__menu" role="listbox" aria-labelledby={id}>
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                className={`consult__option${o.value === value ? ' is-active' : ''}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ConsultationForm() {
  // Reveal on scroll into view, matching the contact form's on-enter animation.
  const { ref, inView } = useInView();
  const navigate = useNavigate();
  const { audience } = useAudience();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear a field's error as soon as the user starts fixing it.
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setField(name, value);
  }

  function validate() {
    const next = {};
    for (const [field, message] of Object.entries(REQUIRED_FIELDS)) {
      if (!form[field].trim()) next[field] = message;
    }
    // A lightweight email sanity check on top of the required rule.
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Please enter a valid email address.';
    }
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setSubmitting(true);
    try {
      await consultationsApi.submit({
        name: form.name.trim(),
        email: form.email.trim(),
        organisation: form.organisation.trim(),
        role: form.role.trim(),
        reason: form.reason,
        message: form.message.trim(),
      });
      navigate('/contact-sent');
    } catch (err) {
      setErrors({ form: err.message || 'Something went wrong. Please try again.' });
      setSubmitting(false);
    }
  }

  return (
    <section
      ref={ref}
      className={`consult${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="consult__inner">
        <div className="consult__grid">
          {/* --- intro / what to expect --- */}
          <aside className="consult__intro">
            <p className="consult__eyebrow">Talk to us</p>
            <h1 className="consult__title">Book a Consultation</h1>
            <p className="consult__lead">
              Tell us where you are in your procurement journey and we&rsquo;ll
              match you with the right specialist. Pick a time that suits and
              we&rsquo;ll take it from there.
            </p>

            <ul className="consult__expect">
              {EXPECTATIONS.map((item) => (
                <li key={item} className="consult__expect-item">
                  <span className="consult__expect-dot" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </aside>

          {/* --- form --- */}
          <form className="consult__form" onSubmit={handleSubmit} noValidate>
            <div className="consult__field">
              <label className="consult__label" htmlFor="consult-name">
                Full name
              </label>
              <input
                id="consult-name"
                name="name"
                type="text"
                className="consult__input"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && (
                <p className="consult__error" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="consult__field">
              <label className="consult__label" htmlFor="consult-email">
                Work email
              </label>
              <input
                id="consult-email"
                name="email"
                type="email"
                className="consult__input"
                placeholder="Enter your work email"
                value={form.email}
                onChange={handleChange}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && (
                <p className="consult__error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="consult__field">
              <label className="consult__label" htmlFor="consult-org">
                Organisation
              </label>
              <input
                id="consult-org"
                name="organisation"
                type="text"
                className="consult__input"
                placeholder="Enter your organisation"
                value={form.organisation}
                onChange={handleChange}
                aria-invalid={Boolean(errors.organisation)}
              />
              {errors.organisation && (
                <p className="consult__error" role="alert">
                  {errors.organisation}
                </p>
              )}
            </div>

            <div className="consult__field">
              <label className="consult__label" htmlFor="consult-role">
                Role <span className="consult__optional">(optional)</span>
              </label>
              <input
                id="consult-role"
                name="role"
                type="text"
                className="consult__input"
                placeholder="Enter your role"
                value={form.role}
                onChange={handleChange}
              />
            </div>

            <div className="consult__field">
              <label className="consult__label" htmlFor="consult-reason">
                Reason for contacting
              </label>
              <ThemedSelect
                id="consult-reason"
                options={REASON_OPTIONS}
                value={form.reason}
                placeholder="Select a reason"
                invalid={Boolean(errors.reason)}
                onChange={(value) => setField('reason', value)}
              />
              {errors.reason && (
                <p className="consult__error" role="alert">
                  {errors.reason}
                </p>
              )}
            </div>

            <div className="consult__field">
              <label className="consult__label" htmlFor="consult-message">
                Message
              </label>
              <textarea
                id="consult-message"
                name="message"
                className="consult__input consult__textarea"
                placeholder="Tell us what you'd like to cover"
                rows={5}
                value={form.message}
                onChange={handleChange}
                aria-invalid={Boolean(errors.message)}
              />
              {errors.message && (
                <p className="consult__error" role="alert">
                  {errors.message}
                </p>
              )}
            </div>

            {errors.form && (
              <p className="consult__error" role="alert">
                {errors.form}
              </p>
            )}

            <button type="submit" className="consult__submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Book consultation'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
