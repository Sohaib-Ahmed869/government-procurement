import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Wraps admin routes. Redirects unauthenticated users to the login page, and
// optionally enforces a role. While the initial /auth/me check runs, it shows
// a lightweight loading state so we don't flash the login screen.
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="admin-loading">Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.flat().includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
