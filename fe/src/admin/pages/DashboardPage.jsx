import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api';
import StatusBadge from '../components/StatusBadge.jsx';

// Inline stat-tile icons (no external icon dependency).
const STAT_ICONS = {
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.7-2.5 2-2.5 3.5" /><path d="M12 17.5h.01" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5a3.5 3.5 0 0 1 0 6.5M17 20a5.5 5.5 0 0 0-2.5-4.6" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>,
  video: <><rect x="2" y="5" width="14" height="14" rx="2.5" /><path d="m16 10 6-3v10l-6-3z" /></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></>,
};

function StatIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {STAT_ICONS[name] || STAT_ICONS.doc}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// Two-letter initials for a subscriber avatar.
function initials(name, email) {
  const base = (name || email || '?').trim();
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

// Short relative-ish label for a timestamp.
function timeAgo(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// A single metric card. `alert` cards emphasise an outstanding count.
function MetricCard({ to, icon, label, value, alert, foot, cta }) {
  const isAlert = alert && value > 0;
  return (
    <Link to={to} className={`dash-card${isAlert ? ' dash-card--alert' : ''}`}>
      <div className="dash-card__head">
        <span className="dash-card__icon"><StatIcon name={icon} /></span>
        {isAlert && <span className="dash-card__pill">Needs review</span>}
      </div>
      <span className="dash-card__value">{value}</span>
      <span className="dash-card__label">{label}</span>
      <span className="dash-card__foot">
        <span className="dash-card__foot-note">{foot}</span>
        <span className="dash-card__foot-cta">
          {cta}
          <ArrowIcon />
        </span>
      </span>
    </Link>
  );
}

// Admin home: actionable queues, content/audience metrics, and recent activity.
export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    dashboardApi
      .get()
      .then((d) => alive && (setData(d), setStatus('ready')))
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, []);

  if (status === 'loading') return <p className="admin-tablestate">Loading dashboard…</p>;
  if (status === 'error')
    return <p className="admin-tablestate">Couldn&apos;t load the dashboard. Is the API running?</p>;

  const c = data.content || {};
  const draftFoot = (t) => (t?.draft ? plural(t.draft, 'draft') : 'All published');

  const attention = [
    {
      label: 'Pending questions',
      value: data.pendingQuestions ?? 0,
      to: '/admin/moderation',
      icon: 'question',
      cta: 'Moderate',
    },
    {
      label: 'New contact messages',
      value: data.newContact ?? 0,
      to: '/admin/contact',
      icon: 'mail',
      cta: 'Open inbox',
    },
    {
      label: 'New consultations',
      value: data.newConsultations ?? 0,
      to: '/admin/consultations',
      icon: 'calendar',
      cta: 'Review',
    },
  ];

  const library = [
    {
      label: 'Subscribers',
      value: data.subscriberCount ?? 0,
      to: '/admin/subscribers',
      icon: 'users',
      foot: 'Confirmed',
      cta: 'Manage',
    },
    {
      label: 'Articles',
      value: c.articles?.published ?? 0,
      to: '/admin/articles',
      icon: 'doc',
      foot: draftFoot(c.articles),
      cta: 'Open',
    },
    {
      label: 'Courses',
      value: c.courses?.published ?? 0,
      to: '/admin/courses',
      icon: 'book',
      foot: draftFoot(c.courses),
      cta: 'Open',
    },
  ];

  const openItems = attention.reduce((n, s) => n + (s.value > 0 ? 1 : 0), 0);
  const recentQuestions = data.recentQuestions || [];
  const recentSubscribers = data.recentSubscribers || [];

  return (
    <div>
      <div className="admin-page__head">
        <div className="admin-page__heading">
          <h2 className="admin-page__title">Dashboard</h2>
          <p className="admin-page__subtitle">An overview of activity across the site.</p>
        </div>
      </div>

      {/* Actionable queues */}
      <section className="dash-section">
        <h3 className="dash-section__label">
          Needs attention
          <span className={`dash-section__count${openItems ? ' is-active' : ''}`}>
            {openItems ? `${openItems} open` : 'All clear'}
          </span>
        </h3>
        <div className="dash-grid dash-grid--3">
          {attention.map((s) => (
            <MetricCard
              key={s.label}
              {...s}
              alert
              foot={s.value > 0 ? 'Awaiting action' : 'All caught up'}
            />
          ))}
        </div>
      </section>

      {/* Content & audience */}
      <section className="dash-section">
        <h3 className="dash-section__label">Content &amp; audience</h3>
        <div className="dash-grid dash-grid--4">
          {library.map((s) => (
            <MetricCard key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <div className="dash-cols">
        <div className="admin-card">
          <div className="admin-card__head">
            <div>
              <h3 className="admin-card__title">Recent questions</h3>
              <p className="admin-card__desc">Latest community submissions awaiting review.</p>
            </div>
            <Link to="/admin/moderation" className="admin-btn admin-btn--sm">View all</Link>
          </div>
          {recentQuestions.length === 0 ? (
            <p className="dash-empty">No recent submissions.</p>
          ) : (
            <ul className="dash-list">
              {recentQuestions.map((q) => (
                <li key={q._id || q.id} className="dash-list__item">
                  <span className="dash-list__avatar dash-list__avatar--q" aria-hidden="true">
                    <StatIcon name="question" />
                  </span>
                  <span className="dash-list__body">
                    <span className="dash-list__primary">{q.title}</span>
                    <span className="dash-list__secondary">
                      {q.submitter?.name || q.submitter?.email || 'Anonymous'}
                      {q.category ? ` · ${q.category}` : ''}
                    </span>
                  </span>
                  <span className="dash-list__trail">
                    <StatusBadge status={q.status} />
                    <span className="dash-list__meta">{timeAgo(q.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-card">
          <div className="admin-card__head">
            <div>
              <h3 className="admin-card__title">Recent subscribers</h3>
              <p className="admin-card__desc">People who recently confirmed their subscription.</p>
            </div>
            <Link to="/admin/subscribers" className="admin-btn admin-btn--sm">View all</Link>
          </div>
          {recentSubscribers.length === 0 ? (
            <p className="dash-empty">No subscribers yet.</p>
          ) : (
            <ul className="dash-list">
              {recentSubscribers.map((s) => (
                <li key={s._id || s.email} className="dash-list__item">
                  <span className="dash-list__avatar" aria-hidden="true">
                    {initials(s.name, s.email)}
                  </span>
                  <span className="dash-list__body">
                    <span className="dash-list__primary">{s.name || s.email}</span>
                    {s.name && <span className="dash-list__secondary">{s.email}</span>}
                  </span>
                  <span className="dash-list__meta">{timeAgo(s.confirmedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
