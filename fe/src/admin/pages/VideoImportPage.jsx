import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { videosApi, categoriesApi } from '../../api';
import FormField from '../components/FormField.jsx';

// EDITOR for videos. A video is EITHER a pasted YouTube link OR an uploaded S3
// file — pick with the "Source" toggle. On create we make the record first,
// then (for uploads) push the file/thumbnail to the returned id.
const EMPTY = {
  title: '',
  description: '',
  category: '',
  durationSeconds: '',
  featured: 'false',
  status: 'draft',
  youtubeUrl: '',
};

export default function VideoImportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [source, setSource] = useState('youtube'); // youtube | upload
  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbUrl, setThumbUrl] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Load categories for the picker.
  useEffect(() => {
    categoriesApi
      .list({ kind: 'video' })
      .then((items) => setCategories(items || []))
      .catch(() => setCategories([]));
  }, []);

  // Load the existing video when editing.
  useEffect(() => {
    if (!editing) return;
    let alive = true;
    videosApi
      .get(id)
      .then((v) => {
        if (!alive) return;
        setForm({
          title: v.title || '',
          description: v.description || '',
          category: v.category?._id || v.category?.id || v.category || '',
          durationSeconds: v.durationSeconds ?? '',
          featured: v.featured ? 'true' : 'false',
          status: v.status || 'draft',
          youtubeUrl: v.youtubeUrl || '',
        });
        setSource(v.source === 'youtube' ? 'youtube' : 'upload');
        setThumbUrl(v.thumbnailUrl || v.thumbnail || '');
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setError('Failed to load this video.');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [id, editing]);

  const buildBody = () => {
    const body = {
      title: form.title,
      description: form.description,
      category: form.category || undefined,
      durationSeconds: form.durationSeconds === '' ? undefined : Number(form.durationSeconds),
      featured: form.featured === 'true',
      status: form.status,
    };
    if (source === 'youtube') body.youtubeUrl = form.youtubeUrl;
    return body;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = buildBody();
      // Persist the record first so uploads have an id to attach to.
      const saved = editing ? await videosApi.update(id, body) : await videosApi.create(body);
      const savedId = saved?._id || saved?.id || id;

      if (source === 'upload' && videoFile) {
        await videosApi.uploadFile(savedId, videoFile);
      }
      if (thumbFile) {
        await videosApi.uploadThumbnail(savedId, thumbFile);
      }

      navigate('..');
    } catch (err) {
      setError(err?.message || 'Something went wrong while saving.');
      setSaving(false);
    }
  };

  if (loading) return <p className="admin-tablestate">Loading…</p>;

  const categoryOptions = [
    { value: '', label: '— Select category —' },
    ...categories.map((c) => ({ value: c._id || c.id, label: c.name || c.title })),
  ];

  return (
    <div>
      <div className="admin-page__head">
        <h2 className="admin-page__title">{editing ? 'Edit video' : 'New video'}</h2>
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      <form className="admin-card" onSubmit={onSubmit}>
        <div className="admin-form-grid">
          <FormField label="Title" name="title" value={form.title} onChange={onChange} required />
          <FormField
            label="Category"
            name="category"
            as="select"
            value={form.category}
            onChange={onChange}
            options={categoryOptions}
          />
        </div>

        <FormField
          label="Description"
          name="description"
          as="textarea"
          rows={4}
          value={form.description}
          onChange={onChange}
        />

        <div className="admin-form-grid">
          <FormField
            label="Duration (seconds)"
            name="durationSeconds"
            type="number"
            value={form.durationSeconds}
            onChange={onChange}
          />
          <FormField
            label="Featured"
            name="featured"
            as="select"
            value={form.featured}
            onChange={onChange}
            options={[
              { value: 'false', label: 'No' },
              { value: 'true', label: 'Yes' },
            ]}
          />
          <FormField
            label="Status"
            name="status"
            as="select"
            value={form.status}
            onChange={onChange}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>

        <div className="admin-field">
          <span className="admin-field__label">Source</span>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="radio"
                name="source"
                value="youtube"
                checked={source === 'youtube'}
                onChange={() => setSource('youtube')}
              />
              YouTube link
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="radio"
                name="source"
                value="upload"
                checked={source === 'upload'}
                onChange={() => setSource('upload')}
              />
              Upload file
            </label>
          </div>
        </div>

        {source === 'youtube' ? (
          <FormField
            label="YouTube URL"
            name="youtubeUrl"
            value={form.youtubeUrl}
            onChange={onChange}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        ) : (
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="f-videoFile">
              Video file
            </label>
            <input
              id="f-videoFile"
              className="admin-input"
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            />
          </div>
        )}

        <div className="admin-field">
          <label className="admin-field__label" htmlFor="f-thumbFile">
            Thumbnail (optional)
          </label>
          {thumbUrl && (
            <div style={{ marginBottom: 8 }}>
              <img
                src={thumbUrl}
                alt="Current thumbnail"
                style={{ maxWidth: 240, borderRadius: 6, display: 'block' }}
              />
            </div>
          )}
          <input
            id="f-thumbFile"
            className="admin-input"
            type="file"
            accept="image/*"
            onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-btn"
            onClick={() => navigate('..')}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save video'}
          </button>
        </div>
      </form>
    </div>
  );
}
