import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { consultationsApi } from '../../../api';
import consultPhoto from '../../../assets/images/EnhanceExpImage.png';
import './ConsultationForm.css';

// Fields the user must fill before we let the request through. Role and contact
// number are the optional ones, so they're absent here. The organisation
// message is a function because the label changes with the audience.
const REQUIRED_FIELDS = {
  name: () => 'Please enter your full name.',
  email: () => 'Please enter your work email.',
  organisation: (orgLabel) => `Please enter your ${orgLabel.toLowerCase()}.`,
  message: () => 'Please tell us a little about what you need.',
};

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  organisation: '',
  role: '',
  message: '',
};

export default function ConsultationForm() {
  // Reveal on scroll into view, matching the contact form's on-enter animation.
  const { audience } = useAudience();
  const { ref, inView } = useInView();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Award is the buyer-side segment, where the visitor works for an agency
  // rather than a supplier organisation.
  const orgLabel = audience === 'award' ? 'Agency' : 'Organisation';

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
      if (!form[field].trim()) next[field] = message(orgLabel);
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
        phone: form.phone.trim(),
        organisation: form.organisation.trim(),
        role: form.role.trim(),
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
            <h1 className="consult__title">Request a Consultation</h1>
            <p className="consult__lead">
              Connect with a member of our team for a complimentary,
              no-obligation consultation, in person or online, to discuss where
              you are in your journey. We&rsquo;ll share insights on how we can
              assist and help you plan your next steps. Please note: We do not
              advise bidders on open tenders.
            </p>

            {/* Fills the space the intro column leaves beside the taller form. */}
            <figure className="consult__figure">
              <img
                className="consult__photo"
                src={consultPhoto}
                alt="Five colleagues in discussion around a table of documents."
                loading="lazy"
              />
            </figure>
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
              <label className="consult__label" htmlFor="consult-phone">
                Contact number <span className="consult__optional">(optional)</span>
              </label>
              <input
                id="consult-phone"
                name="phone"
                type="tel"
                className="consult__input"
                placeholder="Enter your contact number"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div className="consult__field">
              <label className="consult__label" htmlFor="consult-org">
                {orgLabel}
              </label>
              <input
                id="consult-org"
                name="organisation"
                type="text"
                className="consult__input"
                placeholder={`Enter your ${orgLabel.toLowerCase()}`}
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
              <label className="consult__label" htmlFor="consult-message">
                Message
              </label>
              <textarea
                id="consult-message"
                name="message"
                className="consult__input consult__textarea"
                placeholder="Tell us what you'd like to cover"
                rows={7}
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
              {submitting ? 'Sending…' : 'Request consultation'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
