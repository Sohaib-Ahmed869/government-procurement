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
    /* The destination goes in the URL as well as in router state.

       State alone is lost the moment the sign-in page is reloaded — a refresh,
       a password manager round trip, following a link to sign up and coming
       back — and the learner then lands on the dashboard having asked for a
       specific course. The query string survives all of that. State is kept as
       well because it carries the search and hash the path alone would drop. */
    const next = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`/learn/login?next=${encodeURIComponent(next)}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (requireEnrollment && !isEnrolled()) {
    return <Navigate to="/learn/courses" replace />;
  }

  return children;
}
