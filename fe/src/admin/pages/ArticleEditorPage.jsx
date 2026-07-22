import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { articlesApi, categoriesApi } from '../../api';
import FormField from '../components/FormField.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';
import EditorShell from '../components/EditorShell.jsx';

const BLANK = {
  title: '', topic: '', author: '', excerpt: '', body: '',
  category: '', featured: 'false', status: 'draft',
  seoTitle: '', seoDescription: '',
};

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Authoring view for a single article (create /new and edit /:id) — document
// column on the left, settings rail on the right, sticky save/publish bar.
export default function ArticleEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isNew, setIsNew] = useState(!id);
  const [currentId, setCurrentId] = useState(id || null);

  const [form, setForm] = useState(BLANK);
  const [categories, setCategories] = useState([]);
  const [heroFile, setHeroFile] = useState(null);
  const [heroUrl, setHeroUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [readMinutes, setReadMinutes] = useState(0);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState(null);
  const snapshot = useRef(JSON.stringify(BLANK));

  useEffect(() => {
    categoriesApi.list({ kind: 'article' }).then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!currentId) return;
    setLoading(true);
    articlesApi
      .get(currentId)
      .then((a) => {
        const next = {
          title: a.title ?? '', topic: a.topic ?? '', author: a.author ?? '',
          excerpt: a.excerpt ?? '', body: a.body ?? '',
          category: a.category?._id ?? a.category ?? '',
          featured: a.featured ? 'true' : 'false', status: a.status ?? 'draft',
          seoTitle: a.seo?.title ?? '', seoDescription: a.seo?.description ?? '',
        };
        setForm(next);
        snapshot.current = JSON.stringify(next);
        setHeroUrl(a.heroImage?.url ?? '');
        setLoading(false);
      })
      .catch((err) => { setError(err.message || 'Failed to load'); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== snapshot.current || Boolean(heroFile),
    [form, heroFile],
  );

  const set = (name, value) => { setForm((f) => ({ ...f, [name]: value })); setJustSaved(false); };
  const onChange = (e) => set(e.target.name, e.target.value);

  const acceptHero = (file) => {
    if (!file) return;
    setHeroFile(file);
    setHeroUrl(URL.createObjectURL(file));
    setJustSaved(false);
  };

  const payload = (statusOverride) => ({
    title: form.title, topic: form.topic, author: form.author,
    excerpt: form.excerpt, body: form.body,
    category: form.category || undefined,
    featured: form.featured === 'true',
    status: statusOverride || form.status,
    readingMinutes: readMinutes || undefined,
    seo: { title: form.seoTitle, description: form.seoDescription },
  });

  const save = async (statusOverride) => {
    if (!form.title.trim()) { setError('Please add a title before saving.'); return; }
    setSaving(true);
    setError(null);
    try {
      const body = payload(statusOverride);
      let savedId = currentId;
      if (isNew) {
        const created = await articlesApi.create(body);
        savedId = created._id || created.id;
      } else {
        await articlesApi.update(currentId, body);
      }
      if (heroFile && savedId) await articlesApi.uploadHero(savedId, heroFile);

      const nextForm = statusOverride ? { ...form, status: statusOverride } : form;
      if (statusOverride) setForm(nextForm);
      snapshot.current = JSON.stringify(nextForm);
      setHeroFile(null);
      setJustSaved(true);
      setSaving(false);

      if (isNew && savedId) {
        setIsNew(false);
        setCurrentId(savedId);
        navigate(`/admin/articles/${savedId}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to save');
      setSaving(false);
    }
  };

  if (loading) return <p className="admin-tablestate">Loading article…</p>;

  const isPublished = form.status === 'published';
  const slug = slugify(form.title);

  return (
    <EditorShell
      eyebrow={isNew ? 'New article' : 'Article'}
      title={form.title}
      status={form.status}
      dirty={dirty}
      saving={saving}
      justSaved={justSaved}
      error={error}
      onBack={() => navigate('/admin/articles')}
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
              options={[{ value: '', label: '— None —' }, ...categories.map((c) => ({ value: c._id || c.id, label: c.name }))]}
            />
            <FormField label="Topic" name="topic" value={form.topic} onChange={onChange} hint="(e.g. Strategy)" />
            <FormField label="Author" name="author" value={form.author} onChange={onChange} />
            <FormField label="Excerpt" name="excerpt" as="textarea" rows={3} value={form.excerpt} onChange={onChange} />
          </div>

          <div className="editor-panel">
            <h3 className="editor-panel__title">Hero image</h3>
            <label
              className={`editor-hero${dragging ? ' is-dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); acceptHero(e.dataTransfer.files?.[0]); }}
            >
              {heroUrl ? (
                <>
                  <img className="editor-hero__img" src={heroUrl} alt="Hero preview" />
                  <span className="editor-hero__replace">Replace</span>
                </>
              ) : (
                <span className="editor-hero__empty">
                  <strong>Drop an image here</strong>
                  or click to upload
                </span>
              )}
              <input type="file" accept="image/*" onChange={(e) => acceptHero(e.target.files?.[0])} />
            </label>
          </div>

          <div className="editor-panel">
            <h3 className="editor-panel__title">SEO</h3>
            <FormField label="SEO title" name="seoTitle" value={form.seoTitle} onChange={onChange} />
            <FormField label="Meta description" name="seoDescription" as="textarea" rows={2} value={form.seoDescription} onChange={onChange} />
            <div className="editor-seo-preview" aria-hidden="true">
              <div className="editor-seo-preview__title">{form.seoTitle || form.title || 'Article title'}</div>
              <div className="editor-seo-preview__url">/insights/{slug || 'article-slug'}</div>
              <div className="editor-seo-preview__desc">
                {form.seoDescription || form.excerpt || 'Add a meta description to control the search snippet.'}
              </div>
            </div>
          </div>
        </>
      }
    >
      <input
        className="editor-title"
        name="title"
        value={form.title}
        onChange={onChange}
        placeholder="Article title"
        aria-label="Article title"
      />
      <span className="editor-body-label">Body</span>
      <RichTextEditor
        value={form.body}
        onChange={(html) => set('body', html)}
        onStats={({ minutes }) => setReadMinutes(minutes)}
        placeholder="Write your article…"
      />
    </EditorShell>
  );
}
