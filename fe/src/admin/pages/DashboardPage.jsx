import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api';
import { CATEGORY_LABEL } from '../../features/forum/data.js';
import StatusBadge from '../components/StatusBadge.jsx';

// The one inline icon left on this page: the mark on a submission in the
// recent-questions list. The dashboard's figures no longer sit in icon tiles,
// so the topic glyphs that fed them (users, mail, doc, video, book) are gone.
function QuestionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.7-2.5 2-2.5 3.5" />
      <path d="M12 17.5h.01" />
    </svg>
  );
}

// The mark on a queue that has nothing in it.
function TickIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 12.5 5 5 11-11" />
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

/* One queue: how deep it is, what it is, and the way into it.

   A row rather than a tile because that is the shape of the information — a
   count, a name and an action read across, and a queue at zero should take a
   line, not a third of the band. The empty state drops the figure for a tick
   and drops the action entirely: there is nothing to go and do. */
function QueueRow({ to, label, value, describe, action }) {
  const open = value > 0;
  return (
    <Link to={to} className={`dash-queue__row${open ? ' is-open' : ''}`}>
      <span className="dash-queue__count">{open ? value : <TickIcon />}</span>
      <span className="dash-queue__body">
        <span className="dash-queue__label">{label}</span>
        <span className="dash-queue__note">{open ? describe(value) : 'All caught up'}</span>
      </span>
      {open && (
        <span className="dash-queue__action">
          <span className="dash-queue__action-label">{action}</span>
          <ArrowIcon />
        </span>
      )}
    </Link>
  );
}

// One standing figure in the strip. No icon and no arrow: three segments of a
// single bordered strip, each of them a link, need neither to be read as one
// set nor to advertise that they can be pressed.
function StatSegment({ to, label, value, note }) {
  return (
    <Link to={to} className="dash-stat">
      <span className="dash-stat__value">{value}</span>
      <span className="dash-stat__label">{label}</span>
      <span className="dash-stat__note">{note}</span>
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
  const draftNote = (t) => (t?.draft ? plural(t.draft, 'draft') : 'All published');

  const attention = [
    {
      label: 'Pending questions',
      value: data.pendingQuestions ?? 0,
      to: '/admin/moderation',
      action: 'Moderate',
      describe: (n) => `${plural(n, 'question')} waiting on a decision`,
    },
    {
      label: 'New consultations',
      value: data.newConsultations ?? 0,
      to: '/admin/consultations',
      action: 'Review',
      describe: (n) => `${n} ${n === 1 ? 'enquiry' : 'enquiries'} not yet actioned`,
    },
  ];

  const library = [
    {
      label: 'Subscribers',
      value: data.subscriberCount ?? 0,
      to: '/admin/subscribers',
      note: 'Confirmed',
    },
    {
      label: 'Insights',
      value: c.articles?.published ?? 0,
      to: '/admin/articles',
      note: draftNote(c.articles),
    },
    {
      label: 'Courses',
      value: c.courses?.published ?? 0,
      to: '/admin/courses',
      note: draftNote(c.courses),
    },
  ];

  const openItems = attention.reduce((n, s) => n + (s.value > 0 ? 1 : 0), 0);
  const recentQuestions = data.recentQuestions || [];
  const recentSubscribers = data.recentSubscribers || [];

  return (
    <div>
      {/* Actionable queues */}
      <section className="dash-section">
        <h3 className="dash-section__label">
          Needs attention
          <span className={`dash-section__count${openItems ? ' is-active' : ''}`}>
            {openItems ? `${openItems} open` : 'All clear'}
          </span>
        </h3>
        <div className="dash-queue">
          {attention.map((s) => (
            <QueueRow key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* Content & audience */}
      <section className="dash-section">
        <h3 className="dash-section__label">Content &amp; audience</h3>
        <div className="dash-stats">
          {library.map((s) => (
            <StatSegment key={s.label} {...s} />
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
                    <QuestionIcon />
                  </span>
                  <span className="dash-list__body">
                    <span className="dash-list__primary">{q.title}</span>
                    <span className="dash-list__secondary">
                      {q.submitter?.name || q.submitter?.email || 'Anonymous'}
                      {q.category ? ` · ${CATEGORY_LABEL[q.category] || q.category}` : ''}
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
