import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import LmsSidebar from './LmsSidebar.jsx';
import LmsHeader from './LmsHeader.jsx';
import '../lms.css';

const STORAGE_KEY = 'gp.lms.sidebar.collapsed';

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
          <LmsHeader onOpenMobile={openMobile} />
          <div className="lms-content">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
