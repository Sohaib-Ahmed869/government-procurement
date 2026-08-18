import { useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { authApi } from '../../../api';

// Request a reset link (L6).
//
// The response is the same whether or not the address exists. The backend is
// deliberately vague here so this page can't be used to find out who has an
// account. That's why the success state says "if an account exists".
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await authApi.forgotPassword(email.trim());
    } catch {
      /* the endpoint always succeeds; a network error shouldn't leak either */
    }
    setSent(true);
    setBusy(false);
  };

  return (
    <div className="lms-auth">
      <div className="lms-auth__panel">
        <Link className="lms-auth__brand" to="/">
          <span className="lms-auth__brand-mark">GP</span>
          <span>
            <strong>Government Procurement</strong>
            <span>Learning</span>
          </span>
        </Link>

        {sent ? (
          <>
            <h1 className="lms-auth__title">Check your email</h1>
            <p className="lms-auth__sub">
              If an account exists for <strong>{email}</strong>, a reset link is on its way.
              It expires in an hour.
            </p>
            <Link className="lms-btn lms-btn--block" to="/learn/login">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="lms-auth__title">Reset your password</h1>
            <p className="lms-auth__sub">
              We’ll email you a link to set a new one.
            </p>

            <form onSubmit={submit} noValidate>
              <label className="lms-field">
                <span className="lms-field__label">Email</span>
                <input
                  className="lms-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </label>

              <button
                type="submit"
                className="lms-btn lms-btn--primary lms-btn--block lms-auth__submit"
                disabled={busy || !email.trim()}
              >
                <LmsIcon name="mail" />
                {busy ? 'Sending…' : 'Send reset link'}
              </button>

              <p className="lms-auth__fine">
                <Link to="/learn/login">Back to sign in</Link>
              </p>
            </form>
          </>
        )}
      </div>

      <aside className="lms-auth__aside" aria-hidden="true" />
    </div>
  );
}
