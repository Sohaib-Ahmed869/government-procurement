import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Roles that belong in the CMS. Students and instructors share the same user
// collection and the same token, so "is authenticated" stopped being a staff
// check the moment LMS signup existed — without this list, a student who signs
// up at /learn could walk straight into /admin.
const STAFF_ROLES = ['superadmin', 'editor', 'moderator'];

// Where a non-staff role belongs instead, so a wrong turn lands somewhere
// useful rather than bouncing between two redirects.
const HOME_FOR = { instructor: '/learn/instructor', student: '/learn' };

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

  // Signed in, but not staff — send them to their own app.
  if (!STAFF_ROLES.includes(user.role)) {
    return <Navigate to={HOME_FOR[user.role] ?? '/learn'} replace />;
  }

  // Staff, but not the specific role this route wants (e.g. super-admin only).
  if (roles && !roles.flat().includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
