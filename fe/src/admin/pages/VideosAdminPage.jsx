import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { videosApi } from '../../api';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

// Resolve a poster image for a video card. YouTube videos get their thumbnail
// straight from Google; uploads use their own thumbnail if one was set.
function posterFor(video) {
  if (video.source === 'youtube' && video.youtube?.videoId) {
    return `https://img.youtube.com/vi/${video.youtube.videoId}/hqdefault.jpg`;
  }
  return video.thumbnail?.url || null;
}

// A single video card: poster thumbnail with play glyph, source/status badges,
// title, category, duration, and edit/delete actions.
function VideoCard({ video, onDelete }) {
  const poster = posterFor(video);
  const category = video.category?.name || video.category?.title || '';
  return (
    <article className="admin-libcard">
      <div className="admin-libcard__thumb">
        {poster ? (
          <img src={poster} alt="" loading="lazy" className="admin-libcard__img" />
        ) : (
          <div className="admin-libcard__ph" aria-hidden="true" />
        )}
        <span className="admin-libcard__play" aria-hidden="true">▶</span>
        <div className="admin-libcard__badges">
          <StatusBadge status={video.status} />
        </div>
        <span
          className={`admin-libcard__source admin-libcard__source--${
            video.source === 'youtube' ? 'youtube' : 'upload'
          }`}
        >
          {video.source === 'youtube' ? 'YouTube' : 'Upload'}
        </span>
        {video.duration && <span className="admin-libcard__duration">{video.duration}</span>}
      </div>

      <div className="admin-libcard__body">
        <h3 className="admin-libcard__title" title={video.title}>
          {video.title || 'Untitled'}
        </h3>
        {category && (
          <div className="admin-libcard__meta">
            <span className="admin-libcard__chip">{category}</span>
          </div>
        )}
      </div>

      <div className="admin-libcard__actions">
        <Link className="admin-btn admin-btn--sm" to={`${video._id}`}>
          Edit
        </Link>
        <button
          type="button"
          className="admin-btn admin-btn--sm admin-btn--danger"
          onClick={() => onDelete(video._id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

// LIST screen for videos. Videos can be a pasted YouTube link or an uploaded
// S3 file — shown as a visual card library with source-aware thumbnails.
export default function VideosAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(''); // status filter ('' = all)
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setStatus('loading');
    videosApi
      .list({ q, status: filter || undefined, limit: 100 })
      .then((items) => {
        setRows(items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [q, filter]);

  const onDelete = async () => {
    setBusy(true);
    try {
      await videosApi.remove(confirmId);
      setConfirmId(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="admin-page__head">
        <h2 className="admin-page__title">Videos</h2>
        <div className="admin-page__actions">
          <Link className="admin-btn admin-btn--primary" to="new">
            New video
          </Link>
        </div>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-input"
          placeholder="Search videos…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select
          className="admin-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 200 }}
        >
          <option value="">All statuses</option>
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
            <span className="admin-tablestate__title">Failed to load videos</span>
            <span className="admin-tablestate__hint">Please try again in a moment.</span>
          </div>
        )}

        {status === 'ready' && rows.length === 0 && (
          <div className="admin-tablestate">
            <span className="admin-tablestate__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
                <path d="M10 9l5 3-5 3V9Z" />
              </svg>
            </span>
            <span className="admin-tablestate__title">No videos yet.</span>
            <span className="admin-tablestate__hint">Add a YouTube link or upload a file to get started.</span>
          </div>
        )}

        {status === 'ready' && rows.length > 0 && (
          <div className="admin-lib__grid">
            {rows.map((video) => (
              <VideoCard key={video._id} video={video} onDelete={setConfirmId} />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmId)}
        message="Delete this video? This cannot be undone."
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
        busy={busy}
      />
    </div>
  );
}
