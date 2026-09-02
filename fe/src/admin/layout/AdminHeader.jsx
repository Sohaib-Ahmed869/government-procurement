import { useAuth } from '../../context/AuthContext.jsx';

// Derive up-to-two-letter initials for the avatar chip.
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// Top bar: a mobile drawer toggle, the current page title, and the signed-in
// user with a logout button. Desktop sidebar collapsing lives in the sidebar
// itself, so there is no collapse control here.
//
// A section with no title (the admin home) renders no heading at all rather
// than an empty one — the old `title || 'Dashboard'` fallback meant the home
// screen was the one place the header named a page the page also named.
export default function AdminHeader({ title, onOpenMobile }) {
  const { user, logout } = useAuth();
  return (
    <header className="admin-header">
      <div className="admin-header__left">
        {/* Mobile: opens the off-canvas drawer. */}
        <button
          type="button"
          className="admin-header__iconbtn admin-header__menu"
          onClick={onOpenMobile}
          aria-label="Open navigation"
          title="Menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {title ? <h1 className="admin-header__title">{title}</h1> : null}
      </div>
      <div className="admin-header__user">
        <span className="admin-header__chip">
          <span className="admin-header__avatar">{initials(user?.name)}</span>
          <span className="admin-header__chip-text">
            <span className="admin-header__chip-name">{user?.name}</span>
            <span className="admin-header__chip-role">{user?.role}</span>
          </span>
        </span>
        <button type="button" className="admin-btn admin-btn--sm" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
