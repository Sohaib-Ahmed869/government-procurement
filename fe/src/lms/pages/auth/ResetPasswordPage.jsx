import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { authApi } from '../../../api';
import gpLogo from '../../../assets/icons/gp-02-dark.svg';
import AuthAside from '../../components/auth/AuthAside.jsx';

// Set a new password from an emailed token (L6).
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const longEnough = password.length >= 8;
  const matches = password === confirm;
  const valid = longEnough && matches;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      await authApi.resetPassword(token, password);
      navigate('/learn/login', { replace: true });
    } catch (err) {
      setError(err?.message ?? 'That reset link is invalid or has expired.');
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="lms-auth">
        <div className="lms-auth__panel">
          {/* The brand belongs here too — this is a page somebody lands on from
              an email, so it is often the first thing they see of the site. */}
          <Link className="lms-auth__brand" to="/">
            <img className="lms-auth__brand-mark" src={gpLogo} alt="" width="1153" height="1000" />
            <span>
              <strong>Government Procurement</strong>
              <span>Learning</span>
            </span>
          </Link>
          <h1 className="lms-auth__title">Link not valid</h1>
          <p className="lms-auth__sub">
            This reset link is missing its token. Request a fresh one and try again.
          </p>
          <Link className="lms-btn lms-btn--primary lms-btn--block" to="/learn/forgot-password">
            Request a new link
          </Link>
        </div>
        <AuthAside />
      </div>
    );
  }

  return (
    <div className="lms-auth">
      <div className="lms-auth__panel">
        <Link className="lms-auth__brand" to="/">
          {/* The dark artwork, same as sign-in. This used to be the letters
              "GP" in a tile, which is not the logo. */}
          <img className="lms-auth__brand-mark" src={gpLogo} alt="" width="1153" height="1000" />
          <span>
            <strong>Government Procurement</strong>
            <span>Learning</span>
          </span>
        </Link>

        <h1 className="lms-auth__title">Choose a new password</h1>
        <p className="lms-auth__sub">You’ll be signed in with it next time.</p>

        <form onSubmit={submit} noValidate>
          <label className="lms-field">
            <span className="lms-field__label">New password</span>
            <span className="lms-inputwrap">
              <input
                className="lms-input"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                className="lms-inputwrap__btn"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                <LmsIcon name="eye" />
              </button>
            </span>
            <span className="lms-field__hint">At least 8 characters.</span>
          </label>

          <label className="lms-field">
            <span className="lms-field__label">Confirm password</span>
            <input
              className="lms-input"
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            {confirm && !matches ? (
              <span className="lms-field__error">Those don’t match.</span>
            ) : null}
          </label>

          {error ? <p className="lms-alert lms-alert--error">{error}</p> : null}

          <button
            type="submit"
            className="lms-btn lms-btn--primary lms-btn--block lms-auth__submit"
            disabled={!valid || busy}
          >
            <LmsIcon name="check" />
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>

      <AuthAside />
    </div>
  );
}
