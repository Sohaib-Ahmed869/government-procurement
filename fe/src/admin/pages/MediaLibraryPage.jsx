import { useEffect, useMemo, useRef, useState } from 'react';
import { mediaApi } from '../../api';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const KIND_TABS = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'document', label: 'Documents' },
];

// Human-readable file size.
function formatBytes(bytes) {
  if (!bytes || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u += 1;
  }
  return `${n < 10 && u > 0 ? n.toFixed(1) : Math.round(n)} ${units[u]}`;
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Icon for a non-image asset tile.
function KindGlyph({ kind }) {
  if (kind === 'video') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

function MediaCard({ item, onCopy, copied, onDelete }) {
  const dims = item.width && item.height ? `${item.width}×${item.height}` : null;
  return (
    <div className="admin-mediacard">
      <div className="admin-mediacard__thumb">
        <span className="admin-mediacard__kind">{item.kind}</span>
        {item.kind === 'image' ? (
          <img src={item.url} alt={item.alt || item.filename || 'media'} loading="lazy" className="admin-mediacard__img" />
        ) : (
          <div className={`admin-mediacard__ph admin-mediacard__ph--${item.kind}`} aria-hidden="true">
            <KindGlyph kind={item.kind} />
          </div>
        )}
        {dims && <span className="admin-mediacard__dims">{dims}</span>}

        <div className="admin-mediacard__overlay">
          <button
            type="button"
            className={`admin-mediacard__ovbtn${copied ? ' is-copied' : ''}`}
            onClick={() => onCopy(item)}
          >
            {copied ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
                Copied
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                </svg>
                Copy URL
              </>
            )}
          </button>
          <a
            className="admin-mediacard__ovbtn"
            href={item.url}
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
            Open
          </a>
          <button
            type="button"
            className="admin-mediacard__ovbtn admin-mediacard__ovbtn--danger"
            onClick={() => onDelete(item._id || item.id)}
            aria-label="Delete"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
            </svg>
          </button>
        </div>
      </div>

      <div className="admin-mediacard__body">
        <span className="admin-mediacard__name" title={item.filename}>{item.filename || 'Untitled'}</span>
        <div className="admin-mediacard__meta">
          <span className="admin-mediacard__folder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
            </svg>
            {item.folder || 'general'}
          </span>
          <span className="admin-mediacard__dot">·</span>
          <span>{formatBytes(item.sizeBytes)}</span>
          {formatDate(item.createdAt) && (
            <>
              <span className="admin-mediacard__dot">·</span>
              <span>{formatDate(item.createdAt)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Media library: upload assets (drag-and-drop or picker) into a folder and
// browse them as a rich grid, filterable by kind and searchable by name.
export default function MediaLibraryPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [kind, setKind] = useState('all'); // all | image | video | document
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const fileInputRef = useRef(null);
  const copyTimer = useRef(null);

  const load = () => {
    setStatus('loading');
    mediaApi
      .list({ kind: kind === 'all' ? undefined : kind, limit: 100 })
      .then((list) => {
        setItems(list);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (m) =>
        (m.filename || '').toLowerCase().includes(q) ||
        (m.folder || '').toLowerCase().includes(q),
    );
  }, [items, search]);

  const doUpload = async (theFile) => {
    if (!theFile) return;
    setUploading(true);
    setError(null);
    try {
      await mediaApi.upload(theFile, { folder: folder.trim() });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) {
      setFile(dropped);
      doUpload(dropped);
    }
  };

  const onDelete = async () => {
    await mediaApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const copyUrl = (item) => {
    const id = item._id || item.id;
    navigator.clipboard?.writeText(item.url);
    setCopiedId(id);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <div>
      <div className="admin-page__head">
        <div className="admin-page__heading">
          <h2 className="admin-page__title">Media library</h2>
          <p className="admin-page__subtitle">Upload and reuse images, videos and documents across the site.</p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      {/* Drag-and-drop upload zone */}
      <div
        className={`admin-media__drop${dragging ? ' is-drag' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className="admin-media__drop-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4m0 0L7 9m5-5 5 5" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </span>
        <span className="admin-media__drop-text">
          {file ? (
            <>
              <span className="admin-media__drop-title">
                {uploading ? 'Uploading…' : 'Ready to upload'}
              </span>
              <span className="admin-media__drop-hint admin-media__drop-hint--file">{file.name}</span>
            </>
          ) : (
            <>
              <span className="admin-media__drop-title">
                <strong>Click to upload</strong> or drag &amp; drop
              </span>
              <span className="admin-media__drop-hint">Images, videos or documents</span>
            </>
          )}
        </span>

        <div className="admin-media__drop-actions" onClick={(e) => e.stopPropagation()}>
          <input
            className="admin-input admin-media__folder"
            placeholder="Folder (optional)"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            aria-label="Folder"
          />
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={uploading || !file}
            onClick={() => doUpload(file)}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(e) => {
            const picked = e.target.files?.[0] || null;
            setFile(picked);
            if (picked) doUpload(picked);
          }}
        />
      </div>

      {/* Filter + search toolbar */}
      <div className="admin-toolbar" style={{ marginTop: 18 }}>
        <div className="admin-tabs" role="tablist" aria-label="Filter by kind">
          {KIND_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={kind === t.value}
              className={`admin-tab${kind === t.value ? ' is-active' : ''}`}
              onClick={() => setKind(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          className="admin-input"
          placeholder="Search by name or folder…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 260 }}
        />
      </div>

      {/* Grid states */}
      {status === 'loading' && (
        <div className="admin-media__grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={`sk-${i}`} className="admin-mediacard admin-mediacard--skeleton" aria-hidden="true">
              <div className="admin-mediacard__thumb admin-skeleton-block" />
              <div className="admin-mediacard__body">
                <span className="admin-skeleton" style={{ width: '75%', height: 12 }} />
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
          <span className="admin-tablestate__title">Failed to load media</span>
          <span className="admin-tablestate__hint">Please try again in a moment.</span>
        </div>
      )}

      {status === 'ready' && visible.length === 0 && (
        <div className="admin-tablestate">
          <span className="admin-tablestate__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 15l5-5 4 4 3-3 6 6" />
              <circle cx="8.5" cy="9" r="1.4" />
            </svg>
          </span>
          <span className="admin-tablestate__title">
            {search || kind !== 'all' ? 'No matching media' : 'No media yet'}
          </span>
          <span className="admin-tablestate__hint">
            {search || kind !== 'all' ? 'Try a different filter or search term.' : 'Upload your first asset to get started.'}
          </span>
        </div>
      )}

      {status === 'ready' && visible.length > 0 && (
        <>
          <p className="admin-media__count">
            {visible.length} item{visible.length === 1 ? '' : 's'}
            {kind !== 'all' ? ` · ${kind}s` : ''}
          </p>
          <div className="admin-media__grid">
            {visible.map((m) => (
              <MediaCard
                key={m._id || m.id}
                item={m}
                copied={copiedId === (m._id || m.id)}
                onCopy={copyUrl}
                onDelete={setConfirmId}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirmId)}
        message="Delete this media item? This cannot be undone."
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
