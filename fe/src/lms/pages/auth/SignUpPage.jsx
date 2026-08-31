import { useState } from 'react';
import OAuthButtons from '../../components/auth/OAuthButtons.jsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import gpLogo from '../../../assets/icons/gp-02-dark.svg';
import AuthAside from '../../components/auth/AuthAside.jsx';
import { useStudentAuth, homeFor } from '../../context/StudentAuthContext.jsx';
import { returnToFrom } from '../../utils/returnTo.js';

// Signup (L6). Learner accounts, and only learner accounts.
//
// This page used to open with two cards — "I want to learn" and "I want to
// teach" — and the choice changed the fields below it. Teaching accounts are
// not self-serve any more: a super admin creates them in the CMS under Users &
// roles and hands over the credentials, and an instructor signs in rather than
// signing up. The server enforces it (SELF_SIGNUP_ROLES, be/src/constants/
// roles.js); this page simply no longer offers something that would be refused.
//
// With one account type left there is nothing to choose, so the picker is gone
// rather than reduced to a single card, and the form opens on the first thing
// it actually needs. AuthAside carries the way out for anyone who arrived here
// and should have gone to the sign-in page.
export default function SignUpPage() {
  const { signup } = useStudentAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ name: '', email: '', password: '', organisation: '' });
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const emailOk = /\S+@\S+\.\S+/.test(form.email);
  const passwordOk = form.password.length >= 8;
  const valid = form.name.trim() && emailOk && passwordOk;

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;

    setBusy(true);
    setError('');
    try {
      // `role` is not sent. The endpoint defaults to student and refuses
      // anything else, so passing it would be a value the client cannot
      // influence dressed up as one it can.
      const user = await signup(form);
      /* Same rule as sign-in: go where they were headed, unless that belongs to
         a different app. Signing up used to always land on the dashboard, so
         somebody who clicked a course on the website and chose "create an
         account" lost the course they came for. */
      const from = returnToFrom({ search: location.search, state: location.state });
      const home = homeFor(user.role);
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setError(err?.message ?? 'We couldn’t create your account. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="lms-auth">
      <div className="lms-auth__panel">
        <Link className="lms-auth__brand" to="/">
                    {/* The DARK artwork. gp-02.svg is white — drawn for the dark header
              and sidebar — so on this pale page it needed either a tile behind
              it or its own colour. Its own colour is the better answer: the
              mark stands on its own and no green square competes with it. */}
          <img className="lms-auth__brand-mark" src={gpLogo} alt="" width="1153" height="1000" />
          <span>
            <strong>Government Procurement</strong>
            <span>Learning</span>
          </span>
        </Link>

        <h1 className="lms-auth__title">Create your account</h1>
        <p className="lms-auth__sub">
          Already have one?{' '}
          <Link to={`/learn/login${location.search}`} state={location.state}>Sign in</Link>
        </p>

        <form onSubmit={submit} noValidate>
          <label className="lms-field">
            <span className="lms-field__label">Full name</span>
            <input className="lms-input" value={form.name} onChange={set('name')} autoComplete="name" />
            {touched && !form.name.trim() ? (
              <span className="lms-field__error">Enter your name.</span>
            ) : null}
          </label>

          <label className="lms-field">
            <span className="lms-field__label">Work email</span>
            <input className="lms-input" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
            {touched && !emailOk ? (
              <span className="lms-field__error">Enter a valid email address.</span>
            ) : null}
          </label>

          <label className="lms-field">
            <span className="lms-field__label">Password</span>
            <span className="lms-inputwrap">
              <input
                className="lms-input"
                type={show ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
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
            <span className={`lms-field__hint${touched && !passwordOk ? ' is-error' : ''}`}>
              At least 8 characters.
            </span>
          </label>

          <label className="lms-field">
            <span className="lms-field__label">
              Organisation <span className="lms-field__optional">optional</span>
            </span>
            <input className="lms-input" value={form.organisation} onChange={set('organisation')} autoComplete="organization" />
          </label>

          {error ? <p className="lms-alert lms-alert--error">{error}</p> : null}

          <button type="submit" className="lms-btn lms-btn--primary lms-btn--block lms-auth__submit" disabled={busy}>
            {busy ? 'Creating your account…' : 'Create your account'}
          </button>

          <p className="lms-auth__fine">
            By continuing you agree to the <a href="/terms">terms of service</a> and{' '}
            <a href="/privacy">privacy policy</a>.
          </p>
        </form>

        <OAuthButtons
          label="Or sign up with"
          next={returnToFrom({ search: location.search, state: location.state })}
        />
      </div>
      {/* An instructor does not appear on this page's form, so the panel
          beside it is where they are told where they DO go. See AuthAside. */}
      <AuthAside showInternalSignIn />
    </div>
  );
}
