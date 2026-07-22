import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import fullLogo from '../../assets/full-logo.png';
import '../admin.css';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from?.pathname || '/admin';

  // Already signed in → skip the form.
  if (!loading && isAuthenticated) return <Navigate to={from} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin">
      <div className="admin-login">
        <div className="admin-login__art admin-login__art--right" aria-hidden="true" />
        <div className="admin-login__art admin-login__art--left" aria-hidden="true" />

        <main className="admin-login__stage">
          <div className="admin-login__card">
            <a href="/" className="admin-login__brand" aria-label="Government Procurement">
              <span
                className="admin-login__logo"
                role="img"
                aria-label="Government Procurement"
                style={{ WebkitMaskImage: `url(${fullLogo})`, maskImage: `url(${fullLogo})` }}
              />
            </a>
            <h1 className="admin-login__title">Sign in to your account</h1>

            {error && (
              <div className="admin-alert admin-alert--error admin-login__alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} noValidate>
              <div className="admin-field">
                <label className="admin-field__label" htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  className="admin-input admin-login__input"
                  type="email"
                  placeholder="you@agency.gov"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="admin-field">
                <label className="admin-field__label" htmlFor="login-password">Password</label>
                <div className="admin-login__input-wrap">
                  <input
                    id="login-password"
                    className="admin-input admin-login__input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="admin-login__reveal"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.4 5.2A9.5 9.5 0 0 1 12 5c5 0 9 4.5 9 7a12 12 0 0 1-2.2 3M6.3 6.3A12.4 12.4 0 0 0 3 12c0 2.5 4 7 9 7a9.8 9.8 0 0 0 3.3-.6" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="admin-btn admin-btn--primary admin-login__submit"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <span className="admin-login__spinner" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          <p className="admin-login__foot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Authorised access only · Your session is encrypted
          </p>
        </main>
      </div>
    </div>
  );
}
