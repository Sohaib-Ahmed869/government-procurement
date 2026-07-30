import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { articlesApi } from '../../api';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

// Format an ISO date/timestamp into a readable label. Deliberately the same
// locale and options the public site uses (InsightsGrid / LatestInsights /
// ArticleDetail all call toLocaleDateString('en-US', …) with these fields), so a
// date reads identically in the CMS and on the website.
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// A single insight card: cover thumbnail, status/featured markers, meta, actions.
function ArticleCard({ article, onDelete }) {
  const cover = article.heroImage?.url;
  // The publish date — the same field the public Insights page and homepage rail
  // print, so the CMS and the site never disagree. Before an insight is
  // published there is no publish date yet, so the card falls back to when it
  // was created rather than showing a dash.
  const published = Boolean(article.publishedAt);
  const date = formatDate(published ? article.publishedAt : article.createdAt);
  return (
    <article className="admin-libcard">
      <div className="admin-libcard__thumb">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="admin-libcard__img" />
        ) : (
          <div className="admin-libcard__ph" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 15l5-5 4 4 3-3 6 6" />
              <circle cx="8.5" cy="9" r="1.4" />
            </svg>
          </div>
        )}
        <div className="admin-libcard__badges">
          <StatusBadge status={article.status} />
          {article.featured && <span className="admin-libcard__star">★ Featured</span>}
        </div>
      </div>

      <div className="admin-libcard__body">
        <h3 className="admin-libcard__title" title={article.title}>
          {article.title || 'Untitled'}
        </h3>
        <div className="admin-libcard__meta">
          {/* The category doubles as the topic label the public site shows. */}
          {article.category?.name && (
            <span className="admin-libcard__chip">{article.category.name}</span>
          )}
          <span
            className="admin-libcard__date"
            title={published ? 'Publish date — this is the date the website shows' : 'Created (not published yet)'}
          >
            {date}
          </span>
        </div>
      </div>

      <div className="admin-libcard__actions">
        <Link className="admin-btn admin-btn--sm" to={article._id}>
          Edit
        </Link>
        <button
          type="button"
          className="admin-btn admin-btn--sm admin-btn--danger"
          onClick={() => onDelete(article._id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

// List screen for insights: search + status filter, shown as a visual card library.
export default function ArticlesAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | draft | published | archived
  const [confirmId, setConfirmId] = useState(null);

  const load = () => {
    setStatus('loading');
    articlesApi
      .list({ q, status: statusFilter === 'all' ? undefined : statusFilter, limit: 100 })
      .then((items) => {
        setRows(items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, [q, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDelete = async () => {
    await articlesApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  return (
    <div>
      <div className="admin-page__head">
        <h2 className="admin-page__title">Insights</h2>
        <div className="admin-page__actions">
          <Link className="admin-btn admin-btn--primary" to="new">
            New insight
          </Link>
        </div>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-input"
          placeholder="Search insights…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ maxWidth: 200 }}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="admin-lib">
        {status === 'loading' && (
          <div className="admin-lib__grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`sk-${i}`} className="admin-libcard admin-libcard--skeleton" aria-hidden="true">
                <div className="admin-libcard__thumb admin-skeleton-block" />
                <div className="admin-libcard__body">
                  <span className="admin-skeleton" style={{ width: '80%', height: 14 }} />
                  <span className="admin-skeleton" style={{ width: '45%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="admin-tablestate admin-tablestate--error">
            <span className="admin-tablestate__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
            </span>
            <span className="admin-tablestate__title">Failed to load insights</span>
            <span className="admin-tablestate__hint">Please try again in a moment.</span>
          </div>
        )}

        {status === 'ready' && rows.length === 0 && (
          <div className="admin-tablestate">
            <span className="admin-tablestate__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 14h8" />
              </svg>
            </span>
            <span className="admin-tablestate__title">No insights yet.</span>
            <span className="admin-tablestate__hint">Create your first insight to get started.</span>
          </div>
        )}

        {status === 'ready' && rows.length > 0 && (
          <div className="admin-lib__grid">
            {rows.map((article) => (
              <ArticleCard key={article._id} article={article} onDelete={setConfirmId} />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmId)}
        message="Delete this insight? This cannot be undone."
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
