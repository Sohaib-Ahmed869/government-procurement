import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { coursesApi } from '../../api';
import FormField from '../components/FormField.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';
import EditorShell from '../components/EditorShell.jsx';

const BLANK = {
  title: '', summary: '', body: '',
  resourceType: 'courses', segment: 'general', level: 'beginner',
  durationLabel: '',
  availability: 'coming_soon', startDate: '',
  featured: 'false', status: 'draft',
  // Course detail page fields.
  instructorName: '', instructorRole: '', instructorAvatarUrl: '',
  price: '', currency: 'AUD', levelLabel: '', sidebarSummary: '',
  learnPoints: '', requirements: '', includes: '', access: '', whoShouldTake: '',
};

// The list fields are edited as one-item-per-line textareas.
const linesToArray = (str) =>
  (str || '').split('\n').map((s) => s.trim()).filter(Boolean);
const arrayToLines = (arr) => (arr || []).join('\n');
// "Who should take" items are "Title: description" per line.
const whoToLines = (arr) =>
  (arr || []).map((w) => `${w.title}${w.text ? `: ${w.text}` : ''}`).join('\n');
const linesToWho = (str) =>
  linesToArray(str).map((line) => {
    const i = line.indexOf(':');
    return i === -1
      ? { title: line, text: '' }
      : { title: line.slice(0, i).trim(), text: line.slice(i + 1).trim() };
  });

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

const TYPE_LABEL = { courses: 'Course', artefacts: 'Artefact', bundles: 'Bundle' };

// Homepage slots per resource type — the "Unlock your potential" section renders
// 4 course cards and 2 artefact cards. A type absent here has no rail there
// (bundles), so it gets no Featured control at all. Mirrors the same map in
// courses.controller.js, which refuses to store the flag for those types.
const FEATURED_SLOTS = { courses: 4, artefacts: 2 };

// Only a published resource holds a slot: a featured draft isn't on the homepage
// yet. So a draft can be marked featured while a slot is free and find the rail
// full by the time it's published — this is what the author sees then. The flag
// is dropped for them, so the next Publish click goes through.
const noSlotNotice = (resourceType, max) =>
  `No space in featured ${resourceType}. All ${max} homepage slots are taken by ` +
  `published ${resourceType}, so this one has been changed to not featured on ` +
  'homepage. Click Publish again to publish it.';

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
  const [notice, setNotice] = useState(null);
  // How many *other* published resources of this type hold a homepage slot.
  const [featuredElsewhere, setFeaturedElsewhere] = useState(0);
  // State rather than a ref — `dirty` below is memoised, so the saved baseline
  // has to be something React can see change, or saving leaves `dirty` stuck on
  // its previous value.
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(BLANK));

  // Scoped to the resource type currently selected, so switching a resource from
  // Courses to Artefacts re-checks against the artefact rail. Re-counted after
  // every save, so unfeaturing something in a second tab doesn't leave the
  // control stuck.
  const resourceType = form.resourceType;
  useEffect(() => {
    if (!FEATURED_SLOTS[resourceType]) {
      setFeaturedElsewhere(0); // no homepage rail for this type
      return undefined;
    }
    let alive = true;
    coursesApi
      .list({ featured: true, status: 'published', resourceType, limit: 100 })
      .then((items) => {
        if (!alive) return;
        const others = (items || []).filter((c) => (c._id || c.id) !== currentId);
        setFeaturedElsewhere(others.length);
      })
      .catch(() => {
        // Can't tell — leave the control open rather than blocking on a hiccup.
        if (alive) setFeaturedElsewhere(0);
      });
    return () => { alive = false; };
  }, [resourceType, currentId, justSaved]);

  useEffect(() => {
    if (!currentId) return;
    setLoading(true);
    coursesApi
      .get(currentId)
      .then((c) => {
        const next = {
          title: c.title ?? '', summary: c.summary ?? '', body: c.body ?? '',
          resourceType: c.resourceType ?? 'courses',
          segment: c.segment ?? 'general',
          level: c.level ?? 'beginner',
          durationLabel: c.durationLabel ?? '',
          availability: c.availability ?? 'coming_soon', startDate: toDateInput(c.startDate),
          featured: c.featured ? 'true' : 'false', status: c.status ?? 'draft',
          instructorName: c.instructor?.name ?? '',
          instructorRole: c.instructor?.role ?? '',
          instructorAvatarUrl: c.instructor?.avatarUrl ?? '',
          price: c.price != null ? String(c.price) : '',
          currency: c.currency ?? 'AUD',
          levelLabel: c.levelLabel ?? '',
          sidebarSummary: c.sidebarSummary ?? '',
          learnPoints: arrayToLines(c.learnPoints),
          requirements: arrayToLines(c.requirements),
          includes: arrayToLines(c.includes),
          access: arrayToLines(c.access),
          whoShouldTake: whoToLines(c.whoShouldTake),
        };
        setForm(next);
        setSnapshot(JSON.stringify(next));
        setImageUrl(c.image?.url ?? c.imageUrl ?? '');
        setMedia(c.media || []);
        setLoading(false);
      })
      .catch((err) => { setError(err.message || 'Failed to load'); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== snapshot || Boolean(imageFile),
    [form, imageFile, snapshot],
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
    resourceType: form.resourceType, segment: form.segment, level: form.level,
    durationLabel: form.durationLabel,
    availability: form.availability,
    startDate: form.startDate || undefined,
    // Types without a homepage rail can't carry the flag — so switching a
    // featured course to a Bundle clears it rather than leaving it stranded.
    featured: FEATURED_SLOTS[form.resourceType] ? form.featured === 'true' : false,
    status: statusOverride || form.status,
    instructor: {
      name: form.instructorName,
      role: form.instructorRole,
      avatarUrl: form.instructorAvatarUrl,
    },
    price: form.price === '' ? 0 : Number(form.price),
    currency: form.currency,
    levelLabel: form.levelLabel,
    sidebarSummary: form.sidebarSummary,
    learnPoints: linesToArray(form.learnPoints),
    requirements: linesToArray(form.requirements),
    includes: linesToArray(form.includes),
    access: linesToArray(form.access),
    whoShouldTake: linesToWho(form.whoShouldTake),
  });

  // Drop the featured flag and explain why, leaving everything else untouched.
  // The author's next Publish click then goes through.
  const releaseFeatured = () => {
    set('featured', 'false');
    setError(null);
    setNotice(noSlotNotice(resourceType, FEATURED_SLOTS[resourceType]));
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
        const created = await coursesApi.create(body);
        savedId = created._id || created.id;
      } else {
        await coursesApi.update(currentId, body);
      }
      if (imageFile && savedId) await coursesApi.uploadImage(savedId, imageFile);

      const nextForm = statusOverride ? { ...form, status: statusOverride } : form;
      if (statusOverride) setForm(nextForm);
      setSnapshot(JSON.stringify(nextForm));
      setImageFile(null);
      setJustSaved(true);
      setSaving(false);

      if (isNew && savedId) {
        setIsNew(false);
        setCurrentId(savedId);
        navigate(`/admin/courses/${savedId}`, { replace: true });
      }
    } catch (err) {
      // The API refused because the rail is full — the same case the pre-flight
      // check below catches, but reached when the count went stale (another
      // editor published a featured resource meanwhile). Handle it the same way
      // rather than showing a dead end.
      if (err?.errors?.featured === 'no-free-slot') releaseFeatured();
      else setError(err.message || 'Failed to save');
      setSaving(false);
    }
  };

  // Publishing a featured draft is the moment it would actually claim a homepage
  // slot. If the rail for its type is full, unfeature it and say so instead of
  // publishing — the author clicks Publish again to go ahead. Unpublishing never
  // needs a slot, so it passes straight through.
  const onPublishClick = () => {
    const goingLive = form.status !== 'published';
    const max = FEATURED_SLOTS[resourceType];
    if (goingLive && form.featured === 'true' && max && featuredElsewhere >= max) {
      releaseFeatured();
      return;
    }
    save(goingLive ? 'published' : 'draft');
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

  // Homepage slots for this resource type. Bundles have no rail, so the whole
  // slot UI is left out for them and the control stays open.
  const maxFeatured = FEATURED_SLOTS[resourceType];
  const isFeatured = form.featured === 'true';
  const slotsFull = Boolean(maxFeatured) && featuredElsewhere >= maxFeatured;
  const featureLocked = slotsFull && !isFeatured;
  // Slots in use right now, counting this resource only if it's actually live.
  const slotsUsed = featuredElsewhere + (isFeatured && isPublished ? 1 : 0);
  // A featured draft with nowhere to land: warn before they hit Publish, since
  // that's the click that will drop the flag.
  const willLoseSlotOnPublish = isFeatured && !isPublished && slotsFull;

  return (
    <EditorShell
      eyebrow={`${isNew ? 'New ' : ''}${TYPE_LABEL[form.resourceType] || 'Course'}`}
      title={form.title}
      status={form.status}
      dirty={dirty}
      saving={saving}
      justSaved={justSaved}
      error={error}
      notice={notice}
      onBack={() => navigate('/admin/courses')}
      onSave={() => save()}
      onPublish={onPublishClick}
      publishLabel={isPublished ? 'Unpublish' : 'Publish'}
      sidebar={
        <>
          <div className="editor-panel">
            <h3 className="editor-panel__title">Status</h3>
            <div className="editor-publish">
              <span className={`editor-publish__dot${isPublished ? ' is-live' : ''}`} />
              <span>{isPublished ? 'Published, live on the site' : 'Draft, not visible yet'}</span>
            </div>
            {/* No Featured control for a type with no homepage rail — there'd be
                nowhere for the flag to take effect. */}
            {maxFeatured ? (
              <>
                <FormField
                  label="Featured" name="featured" as="select" value={form.featured} onChange={onChange}
                  options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Featured on homepage' }]}
                  disabled={featureLocked}
                  hint={`(${slotsUsed} of ${maxFeatured} slots used)`}
                />
                {/* Suppressed while the notice banner is up — it already explains
                    that the rail is full and what was done about it. */}
                {featureLocked && !notice && (
                  <p className="editor-hint">
                    All {maxFeatured} homepage slots are taken by published {resourceType}. Remove
                    one from the homepage first, then this one can take its place.
                  </p>
                )}
                {willLoseSlotOnPublish && (
                  <p className="editor-hint">
                    All {maxFeatured} homepage slots have been taken since this draft was marked
                    featured. Publishing it will change it to not featured on homepage.
                  </p>
                )}
                {isFeatured && !isPublished && !slotsFull && (
                  <p className="editor-hint">Takes a homepage slot once published.</p>
                )}
              </>
            ) : (
              <p className="editor-hint">
                {TYPE_LABEL[resourceType] || 'These'}s aren&rsquo;t shown on the homepage, so they
                can&rsquo;t be featured there.
              </p>
            )}
          </div>

          <div className="editor-panel">
            <h3 className="editor-panel__title">Details</h3>
            <FormField
              label="Resource type" name="resourceType" as="select" value={form.resourceType} onChange={onChange}
              options={RESOURCE_TYPE_OPTS}
            />
            {/* `segment` is what the public /courses page filters as "Category"
                (CoursesBrowser.jsx), so that's what it's labelled here too. */}
            <FormField
              label="Category" name="segment" as="select" value={form.segment} onChange={onChange}
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
            <h3 className="editor-panel__title">Instructor &amp; pricing</h3>
            <FormField label="Instructor name" name="instructorName" value={form.instructorName} onChange={onChange} />
            <FormField label="Instructor role" name="instructorRole" value={form.instructorRole} onChange={onChange} />
            <FormField label="Instructor avatar URL" name="instructorAvatarUrl" value={form.instructorAvatarUrl} onChange={onChange} hint="image link" />
            <FormField label="Price" name="price" type="number" value={form.price} onChange={onChange} hint="0 = Free" />
            <FormField label="Currency" name="currency" value={form.currency} onChange={onChange} />
            <FormField label="Level label" name="levelLabel" value={form.levelLabel} onChange={onChange} hint='e.g. "Foundational"' />
          </div>

          <div className="editor-panel">
            <h3 className="editor-panel__title">Purchase box</h3>
            <FormField label="Sidebar summary" name="sidebarSummary" as="textarea" rows={3} value={form.sidebarSummary} onChange={onChange} hint="blurb under “Start learning today!”" />
            <FormField label="This includes" name="includes" as="textarea" rows={4} value={form.includes} onChange={onChange} hint="one item per line" />
            <FormField label="Access" name="access" as="textarea" rows={3} value={form.access} onChange={onChange} hint="one item per line" />
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

      <div className="editor-detail-fields">
        <FormField
          label="What you'll learn" name="learnPoints" as="textarea" rows={6}
          value={form.learnPoints} onChange={onChange} hint="one point per line"
        />
        <FormField
          label="Requirements" name="requirements" as="textarea" rows={4}
          value={form.requirements} onChange={onChange} hint="one per line"
        />
        <FormField
          label="Who should take this course?" name="whoShouldTake" as="textarea" rows={6}
          value={form.whoShouldTake} onChange={onChange}
          hint="one per line as “Title: description”"
        />
      </div>

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
