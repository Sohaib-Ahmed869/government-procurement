import { Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';

// Up-to-two-letter initials for the avatar chip.
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// Top bar: mobile drawer toggle, breadcrumb trail, course search, notifications
// and the signed-in student. The desktop collapse control lives in the sidebar,
// so it is not repeated here.
export default function LmsHeader({ crumbs = [], onOpenMobile, notifications = 0 }) {
  const { user, isAuthenticated } = useStudentAuth();
  const current = crumbs[crumbs.length - 1];
  const trail = crumbs.slice(0, -1);

  return (
    <header className="lms-header">
      <div className="lms-header__left">
        <button
          type="button"
          className="lms-header__iconbtn lms-header__menu"
          onClick={onOpenMobile}
          aria-label="Open navigation"
          title="Menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <nav className="lms-crumbs" aria-label="Breadcrumb">
          {trail.map((crumb) => (
            <span key={crumb.to} style={{ display: 'contents' }}>
              <Link to={crumb.to}>
                {crumb.home ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                ) : null}
                <span>{crumb.label}</span>
              </Link>
              <span className="lms-crumbs__sep" aria-hidden="true">/</span>
            </span>
          ))}
          <span className="lms-crumbs__current" aria-current="page">
            {current?.label}
          </span>
        </nav>
      </div>

      <div className="lms-header__right">
        {/* Course search. Wired to /learn/courses once the catalogue endpoint
            lands; for now it is a presentational field. */}
        <div className="lms-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Search courses, lessons…" aria-label="Search courses" />
        </div>

        <button type="button" className="lms-header__iconbtn" title="Notifications"
          aria-label={`Notifications${notifications ? ` (${notifications} unread)` : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {notifications > 0 ? (
            <span className="lms-header__dot">{notifications > 99 ? '99+' : notifications}</span>
          ) : null}
        </button>

        {/* Signed out only happens on the public screens now. The catalogue and
            a course's page. "Guest / Signed out" states a fact and offers
            nothing; the way back in is the useful thing to show. */}
        {isAuthenticated ? (
          <span className="lms-header__chip">
            <span className="lms-header__avatar">{initials(user?.name)}</span>
            <span className="lms-header__chip-text">
              <span className="lms-header__chip-name">{user.name}</span>
              <span className="lms-header__chip-role">{user.role ?? 'student'}</span>
            </span>
          </span>
        ) : (
          <Link className="lms-btn lms-btn--sm lms-btn--primary" to="/learn/login">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
