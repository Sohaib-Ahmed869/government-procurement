import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { consultationsApi } from '../../../api';
import './ConsultationForm.css';

// What a booking gets you — mirrors the contact details column, but as a short
// "what to expect" list rather than phone/email pills.
const EXPECTATIONS = [
  'A 30-minute call with one of our procurement specialists.',
  'A tailored view of where we can add value to your bids.',
  'Clear next steps, no obligation, no hard sell.',
];

const SERVICE_OPTIONS = [
  { value: 'advisory', label: 'Advisory' },
  { value: 'training', label: 'Training & Courses' },
  { value: 'tender', label: 'Tender support' },
  { value: 'other', label: 'Other' },
];

const TIME_OPTIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
];

// Fields the user must fill before we let the booking through. Role is the only
// optional one, so it's absent here.
const REQUIRED_FIELDS = {
  name: 'Please enter your full name.',
  email: 'Please enter your work email.',
  organisation: 'Please enter your organisation.',
  service: 'Please choose a service of interest.',
  date: 'Please choose a preferred date.',
  time: 'Please choose a preferred time.',
  message: 'Please tell us a little about what you need.',
};

const EMPTY_FORM = {
  name: '',
  email: '',
  organisation: '',
  role: '',
  service: '',
  date: '',
  time: '',
  message: '',
};

export default function ConsultationForm() {
  // Reveal on scroll into view, matching the contact form's on-enter animation.
  const { ref, inView } = useInView();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear a field's error as soon as the user starts fixing it.
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
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
      // Map the form to the API shape (service 'tender' → 'tender-support',
      // date/time → preferredDate/preferredTime).
      await consultationsApi.submit({
        name: form.name.trim(),
        email: form.email.trim(),
        organisation: form.organisation.trim(),
        role: form.role.trim(),
        service: form.service === 'tender' ? 'tender-support' : form.service,
        preferredDate: form.date,
        preferredTime: form.time,
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
      data-audience="award"
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
              <label className="consult__label" htmlFor="consult-service">
                Service of interest
              </label>
              <div className="consult__select-wrap">
                <select
                  id="consult-service"
                  name="service"
                  className={`consult__input consult__select${
                    form.service ? '' : ' is-placeholder'
                  }`}
                  value={form.service}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.service)}
                >
                  <option value="" disabled>
                    Select a service
                  </option>
                  {SERVICE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="consult__chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
              {errors.service && (
                <p className="consult__error" role="alert">
                  {errors.service}
                </p>
              )}
            </div>

            <div className="consult__row">
              <div className="consult__field">
                <label className="consult__label" htmlFor="consult-date">
                  Preferred date
                </label>
                <input
                  id="consult-date"
                  name="date"
                  type="date"
                  className="consult__input"
                  value={form.date}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.date)}
                />
                {errors.date && (
                  <p className="consult__error" role="alert">
                    {errors.date}
                  </p>
                )}
              </div>

              <div className="consult__field">
                <label className="consult__label" htmlFor="consult-time">
                  Preferred time
                </label>
                <div className="consult__select-wrap">
                  <select
                    id="consult-time"
                    name="time"
                    className={`consult__input consult__select${
                      form.time ? '' : ' is-placeholder'
                    }`}
                    value={form.time}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.time)}
                  >
                    <option value="" disabled>
                      Select a time
                    </option>
                    {TIME_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="consult__chevron" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
                {errors.time && (
                  <p className="consult__error" role="alert">
                    {errors.time}
                  </p>
                )}
              </div>
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
