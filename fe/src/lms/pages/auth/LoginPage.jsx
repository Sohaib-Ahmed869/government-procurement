import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import OAuthButtons from '../../components/auth/OAuthButtons.jsx';
import authImage from '../../../assets/images/EnhanceExpImage.png';
import { useStudentAuth, homeFor } from '../../context/StudentAuthContext.jsx';

// Sign in (L6).
//
// This is the single sign-in page: staff, instructors and students all use it,
// and the ROLE decides where they land. That keeps one URL to remember and one
// place to change when a role is added. The alternative, a login page per
// audience, means three forms drifting apart.
export default function LoginPage() {
  const { login } = useStudentAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  // The OAuth callback bounces failures back here as ?error=<reason>. Each one
  // is a different thing for the reader to do about it, so they are not
  // collapsed into "sign-in failed".
  const OAUTH_ERRORS = {
    cancelled: 'Sign-in was cancelled.',
    expired: 'That sign-in link expired. Please try again.',
    unavailable: 'That sign-in method is currently unavailable.',
    inactive: 'That account has been deactivated. Contact an administrator.',
    'unverified-email':
      'Your provider did not confirm your email address, so we cannot match it to an account. Sign in with your email and password instead.',
    failed: 'We could not complete that sign-in. Please try again.',
  };
  const [error, setError] = useState(
    () => OAUTH_ERRORS[new URLSearchParams(window.location.search).get('error')] ?? '',
  );

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const user = await login(form.email.trim(), form.password);
      // Honour where they were headed, unless that was a different app's
      // territory. A student bounced off /admin shouldn't be sent back there.
      const from = location.state?.from?.pathname;
      const home = homeFor(user.role);
      const target = from && from.startsWith(home) ? from : home;
      navigate(target, { replace: true });
    } catch (err) {
      setError(err?.status === 401 ? 'Wrong email or password.' : err?.message ?? 'Sign in failed.');
      setBusy(false);
    }
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

        <h1 className="lms-auth__title">Sign in</h1>
        <p className="lms-auth__sub">
          New here? <Link to="/learn/signup">Create an account</Link>
        </p>

        <form onSubmit={submit} noValidate>
          <label className="lms-field">
            <span className="lms-field__label">Email</span>
            <input
              className="lms-input"
              type="email"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              autoFocus
            />
          </label>

          <label className="lms-field">
            <span className="lms-field__label">
              Password
              <Link className="lms-field__aside" to="/learn/forgot-password">
                Forgot it?
              </Link>
            </span>
            <span className="lms-inputwrap">
              <input
                className="lms-input"
                type={show ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                autoComplete="current-password"
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
          </label>

          {error ? <p className="lms-alert lms-alert--error">{error}</p> : null}

          <button type="submit" className="lms-btn lms-btn--primary lms-btn--block lms-auth__submit" disabled={busy}>
            {busy ? 'Signing you in…' : 'Sign in'}
          </button>

          <p className="lms-auth__fine">
            Staff accounts sign in here too. You’ll be taken to the CMS.
          </p>
        </form>

        <OAuthButtons next={location.state?.from?.pathname ?? ''} />
      </div>

      <aside className="lms-auth__aside lms-auth__aside--image" aria-hidden="true">
        <img className="lms-auth__image" src={authImage} alt="" />
      </aside>
    </div>
  );
}
