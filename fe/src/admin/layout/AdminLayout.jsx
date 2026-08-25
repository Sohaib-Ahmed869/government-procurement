import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar.jsx';
import AdminHeader from './AdminHeader.jsx';
import '../admin.css';

const STORAGE_KEY = 'gp.admin.sidebar.collapsed';

// Page title shown in the header, keyed by the first path segment under /admin.
const SECTION_TITLES = {
  '': 'Dashboard',
  articles: 'Insights',
  courses: 'Courses',
  pages: 'Pages',
  categories: 'Dropdown List',
  team: 'Meeting the Team',
  tenders: 'Tenders',
  careers: 'Careers',
  rules: 'Jurisdictional Links',
  'home-hero': 'Homepage',
  'service-offering': 'Service Offering',
  'advisory-rules': 'Advisory Rules',
  moderation: 'Q&A',
  subscribers: 'Subscribers',
  consultations: 'Consultations',
  announcements: 'Announcements',
  links: 'Links',
  media: 'Media library',
  users: 'Users & roles',
  settings: 'Settings',
  'audit-log': 'Audit log',
};

// Sections with New/Edit sub-routes get a refined title.
const SINGULAR = { articles: 'insight', courses: 'course' };

function deriveTitle(pathname) {
  const [section, sub] = pathname.replace(/^\/admin\/?/, '').split('/');
  if (sub && SINGULAR[section]) {
    return `${sub === 'new' ? 'New' : 'Edit'} ${SINGULAR[section]}`;
  }
  return SECTION_TITLES[section ?? ''] ?? 'Admin';
}

// The persistent admin chrome: sidebar + header + routed content area. Nested
// admin routes render into <Outlet />. AdminLayout owns the sidebar's
// collapsed (desktop icon-rail) and open (mobile drawer) state.
export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const title = deriveTitle(pathname);

  // Persist the desktop rail preference.
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
    <div className="admin">
      <div
        className={`admin-shell${collapsed ? ' is-collapsed' : ''}${
          mobileOpen ? ' is-mobile-open' : ''
        }`}
      >
        <AdminSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={toggleCollapsed}
          onCloseMobile={closeMobile}
        />
        <div
          className="admin-sidebar__backdrop"
          hidden={!mobileOpen}
          onClick={closeMobile}
          aria-hidden="true"
        />
        <div className="admin-main">
          <AdminHeader title={title} onOpenMobile={openMobile} />
          <div className="admin-content">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
