import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LmsSidebar from './LmsSidebar.jsx';
import LmsHeader from './LmsHeader.jsx';
import '../lms.css';

const STORAGE_KEY = 'gp.lms.sidebar.collapsed';

// Breadcrumb label for the first path segment under /learn.
const SECTION_LABELS = {
  '': 'Dashboard',
  instructor: 'Instructor',
  'my-courses': 'My Courses',
  courses: 'Browse Catalogue',
  paths: 'Learning Paths',
  progress: 'My Progress',
  notes: 'Notes',
  bookmarks: 'Bookmarks',
  certificates: 'Certificates',
  discussions: 'Discussions',
  reviews: 'Reviews',
  badges: 'Badges',
  orders: 'Orders',
  checkout: 'Checkout',
  profile: 'Profile',
  settings: 'Settings',
};

// Turns a slug into something readable for the leaf crumb. "ethics-and-probity"
// reads as "Ethics and probity".
//
// Returns null for opaque identifiers. Detail routes are keyed by slug in some
// places and by id in others, and an id makes a nonsense crumb: a thread at
// /discussions/d1 was showing "D1", and a certificate at /certificates/c-118
// showed "C 118". The test is whether the segment carries at least two real
// words. Enough to be a slug rather than a key.
function humanise(slug) {
  const words = slug.split('-').filter((w) => /^[a-z]{3,}$/i.test(w));
  if (words.length < 2) return null;
  return slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

// Builds the "Home / Dashboard" trail from the URL. The last entry is the
// current page and is rendered as plain text, not a link. A detail page adds a
// third crumb so the section above it stays clickable.
function deriveCrumbs(pathname) {
  const [section, sub] = pathname.replace(/^\/learn\/?/, '').split('/');
  const home = { to: '/learn', label: 'Home', home: true };
  if (!section) return [home, { to: '/learn', label: 'Dashboard' }];

  const sectionCrumb = {
    to: `/learn/${section}`,
    label: SECTION_LABELS[section] ?? 'Learning',
  };
  const leaf = sub ? humanise(sub) : null;
  if (!leaf) return [home, sectionCrumb];
  return [home, sectionCrumb, { to: pathname, label: leaf }];
}

// The persistent student chrome: sidebar + header + routed content. Nested
// routes render into <Outlet />. This owns the sidebar's collapsed (desktop
// icon-rail) and open (mobile drawer) state, mirroring AdminLayout so the two
// shells behave identically.
export default function LmsLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const crumbs = deriveCrumbs(pathname);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
  }, [collapsed]);

  // Close the mobile drawer on Escape for keyboard users.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="lms">
      <div
        className={`lms-shell${collapsed ? ' is-collapsed' : ''}${
          mobileOpen ? ' is-mobile-open' : ''
        }`}
      >
        <LmsSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={toggleCollapsed}
          onCloseMobile={closeMobile}
        />
        <div
          className="lms-sidebar__backdrop"
          hidden={!mobileOpen}
          onClick={closeMobile}
          aria-hidden="true"
        />
        <div className="lms-main">
          <LmsHeader crumbs={crumbs} onOpenMobile={openMobile} />
          <div className="lms-content">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
