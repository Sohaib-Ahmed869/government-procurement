import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { coursesApi, categoriesApi } from '../../api';
import FormField from '../components/FormField.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';
import EditorShell from '../components/EditorShell.jsx';

const BLANK = {
  title: '', summary: '', body: '',
  category: '', resourceType: 'courses', segment: 'general', level: 'beginner',
  durationLabel: '',
  availability: 'coming_soon', startDate: '',
  featured: 'false', status: 'draft',
};

// Options mirror the /courses public side filters.
const RESOURCE_TYPE_OPTS = [
  { value: 'courses', label: 'Courses' },
  { value: 'artefacts', label: 'Artefacts' },
  { value: 'bundles', label: 'Bundles' },
];
const SEGMENT_OPTS = [
  { value: 'general', label: 'General' },
  { value: 'award', label: 'Award Contracts' },
  { value: 'win', label: 'Win Contracts' },
];
const LEVEL_OPTS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

// Normalise an ISO date to the yyyy-mm-dd a <input type="date"> expects.
const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

// Authoring view for a single course (create /new and edit /:id) — document
// column on the left, settings rail on the right, sticky save/publish bar. On
// create we save the record first, then push the image to the returned id (an
// image needs an existing course to attach to).
export default function CourseEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isNew, setIsNew] = useState(!id);
  const [currentId, setCurrentId] = useState(id || null);

  // A new record can be pre-typed via ?type=artefacts|bundles from the list.
  const initialType = ['artefacts', 'bundles', 'courses'].includes(searchParams.get('type'))
    ? searchParams.get('type')
    : 'courses';
  const [form, setForm] = useState(id ? BLANK : { ...BLANK, resourceType: initialType });
  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  // Course materials (videos / pdfs / images / youtube links) attached to the
  // saved course. These persist immediately (they need an existing course id).
  const [media, setMedia] = useState([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const mediaInputRef = useRef(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState(null);
  const snapshot = useRef(JSON.stringify(BLANK));

  useEffect(() => {
    categoriesApi.list({ kind: 'course' }).then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!currentId) return;
    setLoading(true);
    coursesApi
      .get(currentId)
      .then((c) => {
        const next = {
          title: c.title ?? '', summary: c.summary ?? '', body: c.body ?? '',
          category: c.category?._id ?? c.category?.id ?? c.category ?? '',
          resourceType: c.resourceType ?? 'courses',
          segment: c.segment ?? 'general',
          level: c.level ?? 'beginner',
          durationLabel: c.durationLabel ?? '',
          availability: c.availability ?? 'coming_soon', startDate: toDateInput(c.startDate),
          featured: c.featured ? 'true' : 'false', status: c.status ?? 'draft',
        };
        setForm(next);
        snapshot.current = JSON.stringify(next);
        setImageUrl(c.image?.url ?? c.imageUrl ?? '');
        setMedia(c.media || []);
        setLoading(false);
      })
      .catch((err) => { setError(err.message || 'Failed to load'); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== snapshot.current || Boolean(imageFile),
    [form, imageFile],
  );

  const set = (name, value) => { setForm((f) => ({ ...f, [name]: value })); setJustSaved(false); };
  const onChange = (e) => set(e.target.name, e.target.value);

  const acceptImage = (file) => {
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setJustSaved(false);
  };

  const payload = (statusOverride) => ({
    title: form.title, summary: form.summary, body: form.body,
    category: form.category || undefined,
    resourceType: form.resourceType, segment: form.segment, level: form.level,
    durationLabel: form.durationLabel,
    availability: form.availability,
    startDate: form.startDate || undefined,
    featured: form.featured === 'true',
    status: statusOverride || form.status,
  });

  const save = async (statusOverride) => {
    if (!form.title.trim()) { setError('Please add a title before saving.'); return; }
    setSaving(true);
    setError(null);
    try {
      const body = payload(statusOverride);
      let savedId = currentId;
      if (isNew) {
        const created = await coursesApi.create(body);
        savedId = created._id || created.id;
      } else {
        await coursesApi.update(currentId, body);
      }
      if (imageFile && savedId) await coursesApi.uploadImage(savedId, imageFile);

      const nextForm = statusOverride ? { ...form, status: statusOverride } : form;
      if (statusOverride) setForm(nextForm);
      snapshot.current = JSON.stringify(nextForm);
      setImageFile(null);
      setJustSaved(true);
      setSaving(false);

      if (isNew && savedId) {
        setIsNew(false);
        setCurrentId(savedId);
        navigate(`/admin/courses/${savedId}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to save');
      setSaving(false);
    }
  };

  // --- Course materials (persist immediately against the saved course) ------
  const addMediaFile = async (file) => {
    if (!file || !currentId) return;
    setMediaBusy(true);
    setError(null);
    try {
      const updated = await coursesApi.addMedia(currentId, file, {});
      setMedia(updated.media || []);
    } catch (err) {
      setError(err.message || 'Failed to upload material');
    } finally {
      setMediaBusy(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  };

  const addYoutube = async () => {
    if (!ytUrl.trim() || !currentId) return;
    setMediaBusy(true);
    setError(null);
    try {
      const updated = await coursesApi.addMediaLink(currentId, {
        url: ytUrl.trim(),
        title: ytTitle.trim(),
      });
      setMedia(updated.media || []);
      setYtUrl('');
      setYtTitle('');
    } catch (err) {
      setError(err.message || 'Failed to add YouTube link');
    } finally {
      setMediaBusy(false);
    }
  };

  const removeMedia = async (mediaId) => {
    if (!currentId) return;
    setMediaBusy(true);
    setError(null);
    try {
      const updated = await coursesApi.removeMedia(currentId, mediaId);
      setMedia(updated.media || []);
    } catch (err) {
      setError(err.message || 'Failed to remove material');
    } finally {
      setMediaBusy(false);
    }
  };

  if (loading) return <p className="admin-tablestate">Loading course…</p>;

  const isPublished = form.status === 'published';

  return (
    <EditorShell
      eyebrow={`${isNew ? 'New ' : ''}${
        { artefacts: 'Artefact', bundles: 'Bundle' }[form.resourceType] || 'Course'
      }`}
      title={form.title}
      status={form.status}
      dirty={dirty}
      saving={saving}
      justSaved={justSaved}
      error={error}
      onBack={() => navigate('/admin/courses')}
      onSave={() => save()}
      onPublish={() => save(isPublished ? 'draft' : 'published')}
      publishLabel={isPublished ? 'Unpublish' : 'Publish'}
      sidebar={
        <>
          <div className="editor-panel">
            <h3 className="editor-panel__title">Status</h3>
            <div className="editor-publish">
              <span className={`editor-publish__dot${isPublished ? ' is-live' : ''}`} />
              <span>{isPublished ? 'Published — live on the site' : 'Draft — not visible yet'}</span>
            </div>
            <FormField
              label="Featured" name="featured" as="select" value={form.featured} onChange={onChange}
              options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Featured on homepage' }]}
            />
          </div>

          <div className="editor-panel">
            <h3 className="editor-panel__title">Details</h3>
            <FormField
              label="Category" name="category" as="select" value={form.category} onChange={onChange}
              options={[{ value: '', label: '— None —' }, ...categories.map((c) => ({ value: c._id || c.id, label: c.name || c.title }))]}
            />
            <FormField
              label="Resource type" name="resourceType" as="select" value={form.resourceType} onChange={onChange}
              options={RESOURCE_TYPE_OPTS}
            />
            <FormField
              label="Segment" name="segment" as="select" value={form.segment} onChange={onChange}
              options={SEGMENT_OPTS}
            />
            <FormField
              label="Level" name="level" as="select" value={form.level} onChange={onChange}
              options={LEVEL_OPTS}
            />
            <FormField label="Summary" name="summary" as="textarea" rows={3} value={form.summary} onChange={onChange} />
            <FormField label="Duration label" name="durationLabel" value={form.durationLabel} onChange={onChange} />
            <FormField
              label="Availability" name="availability" as="select" value={form.availability} onChange={onChange}
              options={[
                { value: 'coming_soon', label: 'Coming soon' },
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
            <FormField label="Start date" name="startDate" type="date" value={form.startDate} onChange={onChange} />
          </div>

          <div className="editor-panel">
            <h3 className="editor-panel__title">Course image</h3>
            <label
              className={`editor-hero${dragging ? ' is-dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); acceptImage(e.dataTransfer.files?.[0]); }}
            >
              {imageUrl ? (
                <>
                  <img className="editor-hero__img" src={imageUrl} alt="Course preview" />
                  <span className="editor-hero__replace">Replace</span>
                </>
              ) : (
                <span className="editor-hero__empty">
                  <strong>Drop an image here</strong>
                  or click to upload
                </span>
              )}
              <input type="file" accept="image/*" onChange={(e) => acceptImage(e.target.files?.[0])} />
            </label>
          </div>
        </>
      }
    >
      <input
        className="editor-title"
        name="title"
        value={form.title}
        onChange={onChange}
        placeholder="Course title"
        aria-label="Course title"
      />
      <span className="editor-body-label">Body</span>
      <RichTextEditor
        value={form.body}
        onChange={(html) => set('body', html)}
        placeholder="Describe this course…"
      />

      <div className="editor-media">
        <span className="editor-body-label">Course materials</span>
        {isNew ? (
          <p className="editor-media__hint">
            Save the course first to attach videos, PDFs, images or YouTube links.
          </p>
        ) : (
          <>
            <div className="editor-media__add">
              <span className="admin-btn admin-btn--sm editor-media__upload">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 16V4m0 0L7 9m5-5 5 5" />
                  <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
                {mediaBusy ? 'Working…' : 'Upload video / PDF / image'}
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="video/*,application/pdf,image/*"
                  disabled={mediaBusy}
                  onChange={(e) => addMediaFile(e.target.files?.[0])}
                />
              </span>
              <span className="editor-media__yt">
                <input
                  className="admin-input"
                  placeholder="Paste a YouTube URL…"
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-btn admin-btn--sm admin-btn--primary"
                  disabled={mediaBusy || !ytUrl.trim()}
                  onClick={addYoutube}
                >
                  Add link
                </button>
              </span>
            </div>

            {media.length === 0 ? (
              <p className="editor-media__empty">No materials attached yet.</p>
            ) : (
              <ul className="editor-media__list">
                {media.map((m) => {
                  const mid = m._id || m.id;
                  return (
                    <li key={mid} className="editor-media__item">
                      <span className={`editor-media__thumb editor-media__thumb--${m.kind}`}>
                        {m.kind === 'image' && m.url ? (
                          <img src={m.url} alt="" />
                        ) : (
                          <MediaGlyph kind={m.kind} />
                        )}
                      </span>
                      <span className="editor-media__body">
                        <span className="editor-media__name" title={m.title || m.youtubeUrl}>
                          {m.title || (m.kind === 'youtube' ? m.youtubeUrl : 'Untitled')}
                        </span>
                        <span className="editor-media__kind">
                          {m.kind === 'youtube' ? 'YouTube link' : m.kind}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="editor-media__remove"
                        onClick={() => removeMedia(mid)}
                        disabled={mediaBusy}
                        aria-label="Remove material"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </EditorShell>
  );
}

// Icon for a non-image course-material tile.
function MediaGlyph({ kind }) {
  if (kind === 'pdf') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </svg>
    );
  }
  // video / youtube
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
