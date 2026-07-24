import { useState } from 'react';
import { useAudience } from '../../context/AudienceContext.jsx';
import { subscribersApi } from '../../api';
import './SubscribeForm.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SubscribeForm() {
  const { audience } = useAudience();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');

  const submitting = status === 'submitting';

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus('error');
      setError('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    setError('');
    try {
      await subscribersApi.subscribe({ email: trimmed });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Something went wrong. Please try again.');
    }
  }

  return (
    <section className="subscribe-form" data-audience={audience} aria-labelledby="subscribe-form-heading">
      <h2 className="subscribe-form__heading" id="subscribe-form-heading">
        Stay in the loop
      </h2>
      <p className="subscribe-form__copy">
        Procurement insights, new courses, and tender tips, straight to your inbox.
      </p>

      {status === 'success' ? (
        <p className="subscribe-form__success" role="status">
          Check your inbox to confirm your subscription.
        </p>
      ) : (
        <form className="subscribe-form__form" onSubmit={handleSubmit} noValidate>
          <div className="subscribe-form__field">
            <label className="subscribe-form__label" htmlFor="subscribe-email">
              Email address
            </label>
            <input
              className="subscribe-form__input"
              id="subscribe-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (status === 'error') {
                  setStatus('idle');
                  setError('');
                }
              }}
              disabled={submitting}
              aria-invalid={status === 'error'}
              aria-describedby={status === 'error' ? 'subscribe-form-error' : undefined}
            />
            <button className="subscribe-form__button" type="submit" disabled={submitting}>
              {submitting ? 'Subscribing…' : 'Subscribe'}
            </button>
          </div>
          {status === 'error' && (
            <p className="subscribe-form__error" id="subscribe-form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
