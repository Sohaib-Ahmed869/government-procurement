import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { articlesApi, categoriesApi, teamApi } from '../../api';
import FormField from '../components/FormField.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';
import EditorShell from '../components/EditorShell.jsx';

const BLANK = {
  title: '', author: '', body: '',
  category: '', featured: 'false', status: 'draft',
  seoTitle: '', seoDescription: '',
};

// The homepage "Latest Insights" rail has three slots (LatestInsights.jsx asks
// for 3, featured first). Only a *published* insight occupies one — a featured
// draft isn't on the homepage yet, so it doesn't hold a slot open. Publishing is
// where that's reconciled: see the publish handler below.
const MAX_FEATURED = 3;

// Message shown when a featured draft can't take a slot because the live ones
// filled up while it sat unpublished. The flag is dropped for the author, so the
// next Publish click goes through.
const NO_SLOT_NOTICE =
  `No space in featured insights — all ${MAX_FEATURED} homepage slots are taken by ` +
  'published insights, so this one has been changed to not featured on homepage. ' +
  'Click Publish again to publish it.';

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Authoring view for a single insight (create /new and edit /:id) — document
// column on the left, settings rail on the right, sticky save/publish bar.
export default function ArticleEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isNew, setIsNew] = useState(!id);
  const [currentId, setCurrentId] = useState(id || null);

  const [form, setForm] = useState(BLANK);
  const [categories, setCategories] = useState([]);
  // Authors are the people on the Our Team page — picking one here is what puts
  // the insight in that member's "Published work".
  const [team, setTeam] = useState([]);
  const [heroFile, setHeroFile] = useState(null);
  const [heroUrl, setHeroUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [readMinutes, setReadMinutes] = useState(0);
  // How many *other* published insights hold a homepage slot — the featured
  // control locks once they fill all MAX_FEATURED of them.
  const [featuredElsewhere, setFeaturedElsewhere] = useState(0);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState(null);
  // The last-saved form, serialised. State rather than a ref: `dirty` below is
  // memoised, so the saved baseline has to be something React can see change —
  // with a ref, saving left `dirty` stuck on its previous value.
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(BLANK));

  useEffect(() => {
    categoriesApi.list({ kind: 'article' }).then(setCategories).catch(() => setCategories([]));
    teamApi.list({ limit: 100 }).then((list) => setTeam(list || [])).catch(() => setTeam([]));
  }, []);

  // Published + featured only: those are the ones actually on the homepage.
  // Re-counted after every save, so unfeaturing another insight in a second tab
  // and coming back here doesn't leave the control stuck.
  useEffect(() => {
    let alive = true;
    articlesApi
      .list({ featured: true, status: 'published', limit: 100 })
      .then((items) => {
        if (!alive) return;
        const others = (items || []).filter((a) => (a._id || a.id) !== currentId);
        setFeaturedElsewhere(others.length);
      })
      .catch(() => {
        // Can't tell — leave the control open rather than blocking on a hiccup.
        if (alive) setFeaturedElsewhere(0);
      });
    return () => { alive = false; };
  }, [currentId, justSaved]);

  useEffect(() => {
    if (!currentId) return;
    setLoading(true);
    articlesApi
      .get(currentId)
      .then((a) => {
        const next = {
          title: a.title ?? '', author: a.author ?? '',
          body: a.body ?? '',
          category: a.category?._id ?? a.category ?? '',
          featured: a.featured ? 'true' : 'false', status: a.status ?? 'draft',
          seoTitle: a.seo?.title ?? '', seoDescription: a.seo?.description ?? '',
        };
        setForm(next);
        setSnapshot(JSON.stringify(next));
        setHeroUrl(a.heroImage?.url ?? '');
        setLoading(false);
      })
      .catch((err) => { setError(err.message || 'Failed to load'); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== snapshot || Boolean(heroFile),
    [form, heroFile, snapshot],
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
    // `excerpt` is deliberately not sent. The field has been retired from this
    // editor, and omitting it leaves whatever an older article already had
    // stored intact rather than blanking it on the next save.
    title: form.title, author: form.author,
    body: form.body,
    category: form.category || undefined,
    featured: form.featured === 'true',
    status: statusOverride || form.status,
    // publishedAt is deliberately not sent — the API stamps it when the insight
    // first goes live, and that one date is what both the CMS card and the site
    // print. There's nothing here for the author to keep in sync.
    readingMinutes: readMinutes || undefined,
    seo: { title: form.seoTitle, description: form.seoDescription },
  });

  // Drop the featured flag and explain why, leaving the insight otherwise
  // untouched. The author's next Publish click then goes through.
  const releaseFeatured = () => {
    set('featured', 'false');
    setError(null);
    setNotice(NO_SLOT_NOTICE);
  };

  const save = async (statusOverride) => {
    if (!form.title.trim()) { setError('Please add a title before saving.'); return; }
    setSaving(true);
    setError(null);
    setNotice(null);
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
      setSnapshot(JSON.stringify(nextForm));
      setHeroFile(null);
      setJustSaved(true);
      setSaving(false);

      if (isNew && savedId) {
        setIsNew(false);
        setCurrentId(savedId);
        navigate(`/admin/articles/${savedId}`, { replace: true });
      }
    } catch (err) {
      // The API refused because the homepage slots are full — the same case the
      // pre-flight check below catches, but reached when the count went stale
      // (another editor published a featured insight in the meantime). Handle it
      // the same way rather than showing a dead end.
      if (err?.errors?.featured === 'no-free-slot') releaseFeatured();
      else setError(err.message || 'Failed to save');
      setSaving(false);
    }
  };

  // Publishing a featured draft is the moment it would actually claim a homepage
  // slot. If they're all taken by live insights, unfeature it and say so instead
  // of publishing — the author clicks Publish again to go ahead. Unpublishing
  // never needs a slot, so it passes straight through.
  const onPublishClick = () => {
    const goingLive = form.status !== 'published';
    if (goingLive && form.featured === 'true' && featuredElsewhere >= MAX_FEATURED) {
      releaseFeatured();
      return;
    }
    save(goingLive ? 'published' : 'draft');
  };

  if (loading) return <p className="admin-tablestate">Loading insight…</p>;

  const isPublished = form.status === 'published';
  const slug = slugify(form.title);

  // All the live slots are taken and this insight isn't one of them, so it can't
  // be added until another insight gives its slot up. Already-featured insights
  // keep the control live — that's how a slot is released.
  const isFeatured = form.featured === 'true';
  const slotsFull = featuredElsewhere >= MAX_FEATURED;
  const featureLocked = slotsFull && !isFeatured;
  // Slots in use right now, counting this insight only if it's actually live.
  const slotsUsed = featuredElsewhere + (isFeatured && isPublished ? 1 : 0);
  // A featured draft with nowhere to land: warn before they hit Publish, since
  // that's the click that will drop the flag.
  const willLoseSlotOnPublish = isFeatured && !isPublished && slotsFull;

  return (
    <EditorShell
      eyebrow={isNew ? 'New insight' : 'Insight'}
      title={form.title}
      status={form.status}
      dirty={dirty}
      saving={saving}
      justSaved={justSaved}
      error={error}
      notice={notice}
      onBack={() => navigate('/admin/articles')}
      onSave={() => save()}
      // Saving a live insight isn't saving a draft — it pushes the edit straight
      // to the site. "Save draft" is only honest while it's new or still a draft.
      saveLabel={isPublished ? 'Save' : 'Save draft'}
      onPublish={onPublishClick}
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
              disabled={featureLocked}
              hint={`(${slotsUsed} of ${MAX_FEATURED} slots used)`}
            />
            {/* Suppressed while the notice banner is up — it already explains
                that the slots are full and what was done about it. */}
            {featureLocked && !notice && (
              <p className="editor-hint">
                All {MAX_FEATURED} homepage slots are taken by published insights. Remove
                one from the homepage first, then this one can take its place.
              </p>
            )}
            {willLoseSlotOnPublish && (
              <p className="editor-hint">
                All {MAX_FEATURED} homepage slots have been taken since this draft was
                marked featured. Publishing it will change it to not featured on homepage.
              </p>
            )}
            {isFeatured && !isPublished && !slotsFull && (
              <p className="editor-hint">Takes a homepage slot once published.</p>
            )}
          </div>

          <div className="editor-panel">
            <h3 className="editor-panel__title">Details</h3>
            {/* The category is also the topic label the site shows on cards and
                in the article hero, and it's what the Insights filter offers. */}
            <FormField
              label="Category" name="category" as="select" value={form.category} onChange={onChange}
              options={[{ value: '', label: '— None —' }, ...categories.map((c) => ({ value: c._id || c.id, label: c.name }))]}
              hint="(shown as the topic on the site)"
            />
            <FormField
              label="Author"
              name="author"
              as="select"
              value={form.author}
              onChange={onChange}
              options={[
                { value: '', label: '— None —' },
                // An author saved before this became a dropdown — or a member
                // since removed — would otherwise vanish from the field on open.
                ...(form.author && !team.some((m) => m.name === form.author)
                  ? [{ value: form.author, label: `${form.author} (not on the team page)` }]
                  : []),
                ...team.map((m) => ({ value: m.name, label: m.name })),
              ]}
              hint="(their profile lists this insight under Published work)"
            />
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
              <div className="editor-seo-preview__title">{form.seoTitle || form.title || 'Insight title'}</div>
              <div className="editor-seo-preview__url">/insights/{slug || 'insight-slug'}</div>
              <div className="editor-seo-preview__desc">
                {form.seoDescription || 'Add a meta description to control the search snippet.'}
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
        placeholder="Insight title"
        aria-label="Insight title"
      />
      <span className="editor-body-label">Body</span>
      <RichTextEditor
        value={form.body}
        onChange={(html) => set('body', html)}
        onStats={({ minutes }) => setReadMinutes(minutes)}
        placeholder="Write your insight…"
      />
    </EditorShell>
  );
}
