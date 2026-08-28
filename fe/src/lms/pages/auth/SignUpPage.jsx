import { useState } from 'react';
import OAuthButtons from '../../components/auth/OAuthButtons.jsx';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import gpLogo from '../../../assets/icons/gp-02-dark.svg';
import AuthAside from '../../components/auth/AuthAside.jsx';
import { useStudentAuth, homeFor } from '../../context/StudentAuthContext.jsx';
import { returnToFrom } from '../../utils/returnTo.js';

const ROLES = [
  {
    value: 'student',
    icon: 'book',
    title: 'I want to learn',
    blurb: 'Enrol in courses, track your progress and earn certificates.',
    points: ['Access to the full catalogue', 'Progress, notes and bookmarks', 'Certificates on completion'],
  },
  {
    value: 'instructor',
    icon: 'users',
    title: 'I want to teach',
    blurb: 'Build courses, upload lessons and see how your students are doing.',
    points: ['Course, module and lesson builder', 'Video, transcripts and quizzes', 'Enrolment and progress reporting'],
  },
];

// Signup (L6). One page, two account types. The role choice comes first
// because it changes what the rest of the form asks for and what the person
// gets afterwards.
export default function SignUpPage() {
  const [params] = useSearchParams();
  const { signup } = useStudentAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
                    <ul className="lms-rolecard__points">
                      {r.points.map((p) => (
                        <li key={p}>
                          <LmsIcon name="check" />
                          {p}
                        </li>
                      ))}
                    </ul>
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
            <>
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

              <p className="lms-auth__note">
                <LmsIcon name="clock" />
                <span>
                  You can start building courses straight away. Publishing to the catalogue
                  needs a quick review first. We’ll email you when that’s done.
                </span>
              </p>
            </>
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

        <OAuthButtons
          label="Or sign up with"
          next={returnToFrom({ search: location.search, state: location.state })}
        />
      </div>
      <AuthAside />
    </div>
  );
}
