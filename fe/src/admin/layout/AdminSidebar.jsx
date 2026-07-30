import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import logo from '../../assets/icons/GPLogo.svg';

// Small inline-SVG icon set (no external icon dependency). Each is a 24x24
// stroke icon that inherits currentColor.
const ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>,
  video: <><rect x="2" y="5" width="14" height="14" rx="2.5" /><path d="m16 10 6-3v10l-6-3z" /></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></>,
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.7-2.5 2-2.5 3.5" /><path d="M12 17.5h.01" /></>,
  page: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  quote: <><path d="M7 8h4v4c0 2-1.5 3.5-4 4M13 8h4v4c0 2-1.5 3.5-4 4" /></>,
  tag: <><path d="M20.5 12.5 12 21l-8-8V4h9z" /><circle cx="8.5" cy="8.5" r="1.5" /></>,
  chat: <><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5a3.5 3.5 0 0 1 0 6.5M17 20a5.5 5.5 0 0 0-2.5-4.6" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  hand: <><path d="M12 21a7 7 0 0 0 7-7v-3a1.5 1.5 0 0 0-3 0V8a1.5 1.5 0 0 0-3 0V6.5a1.5 1.5 0 0 0-3 0V11l-1.6-1.6a1.5 1.5 0 0 0-2.1 2.1L8 15" /></>,
  rails: <><rect x="3" y="4" width="18" height="6" rx="1.5" /><rect x="3" y="14" width="11" height="6" rx="1.5" /></>,
  megaphone: <><path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1z" /><path d="M18 8a4 4 0 0 1 0 8" /></>,
  link: <><path d="M10 13a4 4 0 0 0 5.7.3l3-3a4 4 0 0 0-5.7-5.7L11 6" /><path d="M14 11a4 4 0 0 0-5.7-.3l-3 3a4 4 0 0 0 5.7 5.7L13 18" /></>,
  media: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m5 19 5-4 3.5 3L17 14l3 3" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13.6a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 6.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.7a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 .3 1.9" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 8v4l3 2" /></>,
};

function Icon({ name }) {
  return (
    <svg
      className="admin-sidebar__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name] || ICONS.doc}
    </svg>
  );
}

// Admin navigation, grouped by area. `roles` on an item hides it from users who
// lack the role (e.g. Users & Settings are super-admin only). `icon` selects an
// entry from the inline ICONS set above.
const NAV = [
  {
    group: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', end: true, icon: 'dashboard' }],
  },
  {
    // Reusable content: listed, filtered and searched across the site.
    group: 'Content library',
    items: [
      // Stored as "articles" throughout the API and routes; the public site calls
      // them Insights, so that's the label the CMS shows.
      { to: '/admin/articles', label: 'Insights', icon: 'doc' },
      { to: '/admin/courses', label: 'Courses', icon: 'book' },
      { to: '/admin/faqs', label: 'FAQ', icon: 'question' },
      { to: '/admin/categories', label: 'Categories', icon: 'tag' },
    ],
  },
  {
    // Copy that belongs to one specific page, in the order those pages appear
    // in the site nav.
    group: 'Page content',
    items: [
      { to: '/admin/home-hero', label: 'Homepage hero', icon: 'page' },
      { to: '/admin/team', label: 'Team', icon: 'users' },
      { to: '/admin/careers', label: 'Careers', icon: 'hand' },
      { to: '/admin/rules', label: 'Rules', icon: 'rails' },
    ],
  },
  {
    group: 'Community',
    items: [{ to: '/admin/moderation', label: 'Q&A Moderation', icon: 'chat' }],
  },
  {
    // Everything else the public sends in.
    group: 'Submissions',
    items: [
      { to: '/admin/contact', label: 'Contact inbox', icon: 'mail' },
      { to: '/admin/consultations', label: 'Consultations', icon: 'calendar' },
      { to: '/admin/register-interest', label: 'Register interest', icon: 'hand' },
      { to: '/admin/subscribers', label: 'Subscribers', icon: 'users' },
    ],
  },
  {
    // Site-wide furniture rather than page copy.
    group: 'Site',
    items: [
      { to: '/admin/announcements', label: 'Announcements', icon: 'megaphone' },
      { to: '/admin/links', label: 'Links', icon: 'link' },
      { to: '/admin/media', label: 'Media library', icon: 'media' },
    ],
  },
  {
    group: 'Admin',
    items: [
      { to: '/admin/users', label: 'Users & roles', roles: ['superadmin'], icon: 'users' },
      { to: '/admin/settings', label: 'Settings', roles: ['superadmin'], icon: 'gear' },
      { to: '/admin/audit-log', label: 'Audit log', roles: ['superadmin'], icon: 'history' },
    ],
  },
];

export default function AdminSidebar({
  collapsed = false,
  mobileOpen = false,
  onToggleCollapsed,
  onCloseMobile,
}) {
  const { user } = useAuth();

  return (
    <aside
      className={`admin-sidebar${collapsed ? ' is-collapsed' : ''}${
        mobileOpen ? ' is-open' : ''
      }`}
    >
      <div className="admin-sidebar__head">
        <NavLink
          to="/admin"
          end
          className="admin-sidebar__brand"
          onClick={onCloseMobile}
          title="Government Procurement CMS"
        >
          <img src={logo} alt="Government Procurement" className="admin-sidebar__logo" />
          <span className="admin-sidebar__wordmark">
            <strong>Government Procurement</strong>
            <span>CMS</span>
          </span>
        </NavLink>
        <button
          type="button"
          className="admin-sidebar__toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={collapsed ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'} />
          </svg>
        </button>
      </div>

      <nav className="admin-sidebar__nav">
        {NAV.map((section) => {
          const items = section.items.filter((i) => !i.roles || i.roles.includes(user?.role));
          if (items.length === 0) return null;
          return (
            <div className="admin-sidebar__section" key={section.group}>
              <div className="admin-sidebar__group">{section.group}</div>
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    `admin-sidebar__link${isActive ? ' is-active' : ''}`
                  }
                >
                  <span className="admin-sidebar__link-label">
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
