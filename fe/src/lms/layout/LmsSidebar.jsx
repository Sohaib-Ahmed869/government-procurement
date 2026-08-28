import { NavLink } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';
import logo from '../../assets/icons/gp-02.svg';
import LmsIcon from '../components/LmsIcon.jsx';

// Instructor navigation. The same shell as the student's. Same layout, same
// header, same styling, with the tabs swapped for the teaching side. An
// instructor is also a learner (they can take other people's courses), so the
// bottom group keeps their own learning within reach.
const INSTRUCTOR_NAV = [
  {
    group: 'Teaching',
    items: [
      { to: '/learn/instructor', label: 'Dashboard', end: true, icon: 'dashboard' },
      { to: '/learn/instructor/courses', label: 'My Courses', icon: 'book' },
      { to: '/learn/instructor/quizzes', label: 'Quizzes', icon: 'quiz' },
      { to: '/learn/instructor/paths', label: 'Learning Paths', icon: 'path' },
      { to: '/learn/instructor/live', label: 'Live Sessions', icon: 'video' },
    ],
  },
  {
    group: 'Students',
    items: [
      { to: '/learn/instructor/students', label: 'Enrolments', icon: 'users' },
      { to: '/learn/instructor/progress', label: 'Progress', icon: 'chart' },
      { to: '/learn/instructor/discussions', label: 'Questions', icon: 'chat' },
      { to: '/learn/instructor/reviews', label: 'Reviews', icon: 'star' },
    ],
  },
  {
    group: 'Account',
    items: [
      { to: '/learn/profile', label: 'Profile', icon: 'user' },
      { to: '/learn/settings', label: 'Settings', icon: 'gear' },
    ],
  },
];

// Student navigation, grouped by what the learner is doing rather than by which
// requirement it came from. `badge` renders a count pill on the right; it is
// wired to live data once the LMS endpoints exist.
const NAV = [
  {
    group: 'Learning',
    items: [
      { to: '/learn', label: 'Dashboard', end: true, icon: 'dashboard' },
      { to: '/learn/my-courses', label: 'My Courses', icon: 'book' },
      { to: '/learn/courses', label: 'Browse Catalogue', icon: 'grid' },
      { to: '/learn/paths', label: 'Learning Paths', icon: 'path' },
      /* Course Coach (LMS 18.0) is deliberately NOT in the nav. The screen and
         its route still exist at /learn/coach — nothing was deleted — but it
         has no credentials and reports itself unavailable, and a nav item that
         only ever leads to "this isn't switched on" is worse than no item.
         Restore this line when ANTHROPIC_API_KEY is set. */
      // Sessions taught by a person, at a time — next to the courses they
      // belong to rather than in Community, which is asynchronous by nature.
      { to: '/learn/live', label: 'Live Sessions', icon: 'video' },
    ],
  },
  {
    group: 'Progress',
    items: [
      { to: '/learn/progress', label: 'My Progress', icon: 'chart' },
      { to: '/learn/notes', label: 'Notes', icon: 'note' },
      { to: '/learn/bookmarks', label: 'Bookmarks', icon: 'bookmark' },
      { to: '/learn/certificates', label: 'Certificates', icon: 'award' },
    ],
  },
  {
    group: 'Community',
    items: [
      { to: '/learn/discussions', label: 'Discussions', icon: 'chat' },
      { to: '/learn/reviews', label: 'Reviews', icon: 'star' },
      { to: '/learn/badges', label: 'Badges', icon: 'badge' },
    ],
  },
  {
    group: 'Account',
    items: [
      { to: '/learn/orders', label: 'Orders', icon: 'cart' },
      { to: '/learn/profile', label: 'Profile', icon: 'user' },
      { to: '/learn/settings', label: 'Settings', icon: 'gear' },
    ],
  },
];

// What a visitor can actually open. Every other link now bounces to the login
// page, and a sidebar of twelve items that all do that is a menu of dead ends.
const PUBLIC_NAV = [
  {
    group: 'Learning',
    items: [
      { to: '/learn/courses', label: 'Browse Catalogue', icon: 'grid' },
      { to: '/learn/paths', label: 'Learning Paths', icon: 'path' },
    ],
  },
];

export default function LmsSidebar({
  collapsed = false,
  mobileOpen = false,
  onToggleCollapsed,
  onCloseMobile,
}) {
  const { logout, isAuthenticated, isInstructor } = useStudentAuth();
  const nav = !isAuthenticated ? PUBLIC_NAV : isInstructor ? INSTRUCTOR_NAV : NAV;

  return (
    <aside className={`lms-sidebar${mobileOpen ? ' is-open' : ''}`}>
      <div className="lms-sidebar__head">
        {/* Points at the signed-in role's own home. An instructor clicking the
            logo and landing on the student dashboard would have no link back,
            the learner tabs are no longer in this nav. */}
        <NavLink
          to={isInstructor ? '/learn/instructor' : '/learn'}
          end
          className="lms-sidebar__brand"
          onClick={onCloseMobile}
          title={`Government Procurement ${isInstructor ? 'Instructor' : 'Learning'}`}
        >
          {/* The attributes carry the artwork's own ratio so the mark reserves
              the right box before the SVG loads. */}
          <img
            src={logo}
            alt="Government Procurement"
            className="lms-sidebar__logo"
            width="1153"
            height="1000"
          />
          <span className="lms-sidebar__wordmark">
            <strong>Government Procurement</strong>
            <span>{isInstructor ? 'Instructor' : 'Learning'}</span>
          </span>
        </NavLink>
        <button
          type="button"
          className="lms-sidebar__toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={collapsed ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'} />
          </svg>
        </button>
      </div>


      <nav className="lms-sidebar__nav">
        {nav.map((section) => (
          <div className="lms-sidebar__section" key={section.group}>
            <div className="lms-sidebar__group">{section.group}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => `lms-sidebar__link${isActive ? ' is-active' : ''}`}
              >
                <span className="lms-sidebar__link-label">
                  <LmsIcon name={item.icon} className="lms-sidebar__icon" />
                  <span>{item.label}</span>
                </span>
                {item.badge ? <span className="lms-sidebar__badge">{item.badge}</span> : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Pinned below the nav, as in the reference layout. Hidden when signed
          out. There is nothing to log out of. */}
      {isAuthenticated ? (
        <div className="lms-sidebar__foot">
          <button
            type="button"
            className="lms-sidebar__logout"
            onClick={logout}
            title="Log out"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2" />
              <path d="M10 12h11M18 9l3 3-3 3" />
            </svg>
            <span>Log out</span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}
