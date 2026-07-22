import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import logo from '../../assets/images/GovProcurementLogo.png';
import '../admin.css';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        <div className="admin-login__card">
          <div className="admin-login__brand">
            <img src={logo} alt="Government Procurement" className="admin-login__logo" />
            <span className="admin-login__brand-text">
              <strong>Government Procurement</strong>
              <span>Content Management</span>
            </span>
          </div>
          <h1 className="admin-login__title">Welcome back</h1>
          <p className="admin-login__sub">Sign in to the content management system.</p>

          {error && <div className="admin-alert admin-alert--error">{error}</div>}

          <form onSubmit={onSubmit}>
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="admin-input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="admin-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
