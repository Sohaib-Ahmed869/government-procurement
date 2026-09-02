import { Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';
import NotificationsMenu from '../components/NotificationsMenu.jsx';

/* Top bar: mobile drawer toggle, course search and notifications.

   No breadcrumb and no page title. The sidebar already marks the section the
   reader is in, and every screen opens on its own .lms-page__head — a trail
   saying "Home / Dashboard" above a heading was the third place one screen
   named itself. The bar is now only the things it alone can carry.

   Who is signed in is NOT here either. It used to be, as an inert chip beside
   the bell, at the same time as the sidebar's foot carried a Log out button and
   the nav carried Profile and Settings — the same account, stated in three
   places, actionable in none of them. It is the sidebar's identity card now,
   which is where an app with a sidebar puts it. The desktop collapse control
   lives there too, so neither is repeated here. */
export default function LmsHeader({ onOpenMobile }) {
  const { isAuthenticated } = useStudentAuth();

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

        {/* Signed out, there is nothing to notify anyone about: every source
            behind the bell is scoped to an account. */}
        {isAuthenticated ? <NotificationsMenu /> : null}

        {/* Signed out only happens on the public screens now. The catalogue and
            a course's page. "Guest / Signed out" states a fact and offers
            nothing; the way back in is the useful thing to show. */}
        {isAuthenticated ? null : (
          <Link className="lms-btn lms-btn--sm lms-btn--primary" to="/learn/login">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
