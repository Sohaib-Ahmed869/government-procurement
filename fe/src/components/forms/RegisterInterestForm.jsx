import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerInterestApi } from '../../api';
import './RegisterInterestForm.css';

// Basic RFC-ish email check — good enough to catch typos client-side; the
// server does the authoritative validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Register-interest form for Coming-soon courses. Public submission; on success
// the visitor is taken to the /interest-registered confirmation page.
export default function RegisterInterestForm({ courseId, courseTitle }) {
  const navigate = useNavigate();

  const [values, setValues] = useState({
    name: '',
    email: '',
    organisation: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function update(field) {
    return (event) => {
      const { value } = event.target;
      setValues((prev) => ({ ...prev, [field]: value }));
      // Clear the field-level error as the visitor corrects it.
      setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
    };
  }

  function validate() {
    const next = {};
    if (!values.name.trim()) {
      next.name = 'Please enter your full name.';
    }
    const email = values.email.trim();
    if (!email) {
      next.email = 'Please enter your work email.';
    } else if (!EMAIL_RE.test(email)) {
      next.email = 'Please enter a valid email address.';
    }
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await registerInterestApi.submit({
        name: values.name.trim(),
        email: values.email.trim(),
        organisation: values.organisation.trim() || undefined,
        message: values.message.trim() || undefined,
        course: courseId,
      });
      navigate('/interest-registered');
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form className="rif" onSubmit={handleSubmit} noValidate>
      <h2 className="rif__title">Register your interest</h2>
      <p className="rif__blurb">
        {courseTitle
          ? `Be the first to hear when “${courseTitle}” opens for enrolment.`
          : 'Be the first to hear when this course opens for enrolment.'}
      </p>

      <div className="rif__field">
        <label className="rif__label" htmlFor="rif-name">
          Full name
        </label>
        <input
          id="rif-name"
          name="name"
          type="text"
          className={`rif__input${errors.name ? ' is-invalid' : ''}`}
          placeholder="Enter your full name"
          value={values.name}
          onChange={update('name')}
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'rif-name-error' : undefined}
        />
        {errors.name && (
          <span className="rif__error" id="rif-name-error" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      <div className="rif__field">
        <label className="rif__label" htmlFor="rif-email">
          Work email
        </label>
        <input
          id="rif-email"
          name="email"
          type="email"
          className={`rif__input${errors.email ? ' is-invalid' : ''}`}
          placeholder="Enter your work email"
          value={values.email}
          onChange={update('email')}
          aria-invalid={errors.email ? 'true' : undefined}
          aria-describedby={errors.email ? 'rif-email-error' : undefined}
        />
        {errors.email && (
          <span className="rif__error" id="rif-email-error" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      <div className="rif__field">
        <label className="rif__label" htmlFor="rif-organisation">
          Organisation <span className="rif__optional">(optional)</span>
        </label>
        <input
          id="rif-organisation"
          name="organisation"
          type="text"
          className="rif__input"
          placeholder="Enter your organisation"
          value={values.organisation}
          onChange={update('organisation')}
        />
      </div>

      <div className="rif__field">
        <label className="rif__label" htmlFor="rif-message">
          Message <span className="rif__optional">(optional)</span>
        </label>
        <textarea
          id="rif-message"
          name="message"
          className="rif__input rif__textarea"
          placeholder="Anything you'd like us to know?"
          rows={4}
          value={values.message}
          onChange={update('message')}
        />
      </div>

      {submitError && (
        <p className="rif__submit-error" role="alert">
          {submitError}
        </p>
      )}

      <button type="submit" className="rif__submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Register interest'}
      </button>
    </form>
  );
}
