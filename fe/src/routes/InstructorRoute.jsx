import { Navigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '../lms/context/StudentAuthContext.jsx';

// Guards the teaching side of the LMS (R1). Super admins are allowed through so
// staff can look at an instructor's course without a second account.
//
// This is the client half only. Every instructor endpoint must re-check the
// role AND ownership on the server. A guard the browser applies is a guard the
// browser can remove.
const TEACHING_ROLES = ['instructor', 'superadmin'];

export default function InstructorRoute({ children }) {
  const { isAuthenticated, loading, user } = useStudentAuth();
  const location = useLocation();

  if (loading) {
    return <div className="lms-loading">Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/learn/login" state={{ from: location }} replace />;
  }

  // A student who lands here isn't doing anything wrong. They followed a link
  // or kept a bookmark. Send them to their own dashboard rather than an error.
  if (!TEACHING_ROLES.includes(user.role)) {
    return <Navigate to="/learn" replace />;
  }

  return children;
}
