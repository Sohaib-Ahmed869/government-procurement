import { useEffect, useMemo, useState } from 'react';
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
  status: 'draft',
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
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState(null);
  // State rather than a ref — `dirty` below is memoised, so the saved baseline
  // has to be something React can see change, or saving leaves `dirty` stuck on
  // its previous value.
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(BLANK));

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
          status: c.status ?? 'draft',
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
      setError(err.message || 'Failed to save');
      setSaving(false);
    }
  };

  const onPublishClick = () => {
    save(form.status !== 'published' ? 'published' : 'draft');
  };

  if (loading) return <p className="admin-tablestate">Loading course…</p>;

  const isPublished = form.status === 'published';

  return (
    <EditorShell
      eyebrow={`${isNew ? 'New ' : ''}${TYPE_LABEL[form.resourceType] || 'Course'}`}
      title={form.title}
      status={form.status}
      dirty={dirty}
      saving={saving}
      justSaved={justSaved}
      error={error}
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

    </EditorShell>
  );
}
