import { useEffect, useRef, useState } from 'react';
import { mediaApi } from '../../api';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

// Media library: upload assets into a folder and browse them as a grid. Images
// render a thumbnail; everything else shows filename + kind.
export default function MediaLibraryPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [kind, setKind] = useState('all'); // all | image | video | document
  const [folder, setFolder] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const fileInputRef = useRef(null);

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

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await mediaApi.upload(file, { folder });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async () => {
    await mediaApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div>
      <div className="admin-page__head">
        <h2 className="admin-page__title">Media library</h2>
      </div>

      <form className="admin-card" onSubmit={onUpload}>
        {error && <div className="admin-alert admin-alert--error">{error}</div>}
        <div className="admin-toolbar">
          <input
            className="admin-input"
            placeholder="Folder (optional)"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <input
            ref={fileInputRef}
            className="admin-input"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            disabled={uploading || !file}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>

      <div className="admin-toolbar">
        <select
          className="admin-select"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          style={{ maxWidth: 200 }}
        >
          <option value="all">All kinds</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
        </select>
      </div>

      {status === 'loading' && <p className="admin-tablestate">Loading…</p>}
      {status === 'error' && (
        <div className="admin-alert admin-alert--error">Failed to load media.</div>
      )}
      {status === 'ready' && items.length === 0 && (
        <p className="admin-tablestate">No media yet.</p>
      )}

      {status === 'ready' && items.length > 0 && (
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          }}
        >
          {items.map((m) => {
            const id = m._id || m.id;
            return (
              <div key={id} className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    height: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: 'rgba(0,0,0,0.04)',
                    borderRadius: 8,
                  }}
                >
                  {m.kind === 'image' ? (
                    <img
                      src={m.url}
                      alt={m.filename || 'media'}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ padding: 8, textAlign: 'center', wordBreak: 'break-word' }}>
                      {m.filename || 'file'}
                      <br />
                      <small>{m.kind}</small>
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{m.filename}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{m.folder || '—'}</div>
                <div className="admin-table__actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm"
                    onClick={() => copyUrl(m.url)}
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm admin-btn--danger"
                    onClick={() => setConfirmId(id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
