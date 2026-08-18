import { Navigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '../lms/context/StudentAuthContext.jsx';

// Guards the signed-in areas of /learn (L6). Unlike the CMS's ProtectedRoute,
// this is applied per route rather than around the whole sub-app: the catalogue,
// a course's page and its free preview lessons are meant to be readable by
// anyone, so /learn/* can't be gated wholesale.
//
// `from` is carried so the login page can return them to what they asked for.
export default function StudentRoute({ children, requireEnrollment = false }) {
  const { isAuthenticated, loading, isEnrolled } = useStudentAuth();
  const location = useLocation();

  if (loading) {
    return <div className="lms-loading">Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/learn/login" state={{ from: location }} replace />;
  }

  if (requireEnrollment && !isEnrolled()) {
    return <Navigate to="/learn/courses" replace />;
  }

  return children;
}
