import { useState } from 'react';
import OAuthButtons from '../../components/auth/OAuthButtons.jsx';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { useStudentAuth, homeFor } from '../../context/StudentAuthContext.jsx';
import authImage from '../../../assets/images/EnhanceExpImage.png';

const ROLES = [
  {
    value: 'student',
    icon: 'book',
    title: 'I want to learn',
    blurb: 'Enrol in courses, track your progress and earn certificates.',
  },
  {
    value: 'instructor',
    icon: 'users',
    title: 'I want to teach',
    blurb: 'Build courses, upload lessons and see how your students are doing.',
  },
];

// Signup (L6). One page, two account types. The role choice comes first
// because it changes what the rest of the form asks for and what the person
// gets afterwards.
export default function SignUpPage() {
  const [params] = useSearchParams();
  const { signup } = useStudentAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState(params.get('as') === 'instructor' ? 'instructor' : 'student');
  const [form, setForm] = useState({ name: '', email: '', password: '', organisation: '', headline: '' });
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
      const user = await signup({ ...form, role });
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      setError(err?.message ?? 'We couldn’t create your account. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="lms-auth lms-auth--tight">
      <div className="lms-auth__panel">
        <Link className="lms-auth__brand" to="/">
          <span className="lms-auth__brand-mark">GP</span>
          <span>
            <strong>Government Procurement</strong>
            <span>Learning</span>
          </span>
        </Link>

        <h1 className="lms-auth__title">Create your account</h1>
        <p className="lms-auth__sub">
          Already have one? <Link to="/learn/login">Sign in</Link>
        </p>

        <form onSubmit={submit} noValidate>
          {/* Role first. It changes the fields below it. */}
          <fieldset className="lms-rolepick">
            <legend className="lms-field__label">I’m signing up to…</legend>
            <div className="lms-rolepick__grid">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`lms-rolecard${role === r.value ? ' is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="lms-sr-only"
                  />
                  <span className="lms-rolecard__icon">
                    <LmsIcon name={r.icon} />
                  </span>
                  <span className="lms-rolecard__body">
                    <span className="lms-rolecard__title">{r.title}</span>
                    <span className="lms-rolecard__blurb">{r.blurb}</span>
                  </span>
                  <span className="lms-rolecard__tick" aria-hidden="true">
                    <LmsIcon name="check" />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

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

          {role === 'instructor' ? (
            <label className="lms-field">
              <span className="lms-field__label">
                Your title <span className="lms-field__optional">optional</span>
              </span>
              <input
                className="lms-input"
                value={form.headline}
                onChange={set('headline')}
                placeholder="e.g. Principal Advisor"
              />
              <span className="lms-field__hint">Shown in the byline on your courses.</span>
            </label>
          ) : null}

          {error ? <p className="lms-alert lms-alert--error">{error}</p> : null}

          <button type="submit" className="lms-btn lms-btn--primary lms-btn--block lms-auth__submit" disabled={busy}>
            {busy ? 'Creating your account…' : `Create ${role === 'instructor' ? 'instructor' : 'student'} account`}
          </button>

          <p className="lms-auth__fine">
            By continuing you agree to the <a href="/terms">terms of service</a> and{' '}
            <a href="/privacy">privacy policy</a>.
          </p>
        </form>

        <OAuthButtons label="Or sign up with" />
      </div>

      <aside className="lms-auth__aside lms-auth__aside--image" aria-hidden="true">
        <img className="lms-auth__image" src={authImage} alt="" />
      </aside>
    </div>
  );
}
