import { useEffect, useMemo, useRef, useState } from 'react';
import { pagesApi } from '../../api';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import FormField from '../components/FormField.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';
import EditorShell from '../components/EditorShell.jsx';

// Link-styled button so a row's title loads the page into the editor.
const linkBtnStyle = {
  background: 'none',
  border: 0,
  padding: 0,
  font: 'inherit',
  color: 'var(--admin-green)',
  textDecoration: 'underline',
  cursor: 'pointer',
};

const BLANK = {
  title: '',
  body: '',
  status: 'draft',
  updatedLabel: '',
  seoTitle: '',
  seoDescription: '',
};

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Static-page editor. The about/privacy/terms pages are seeded, so editing an
// existing page is the primary flow; a new page can also be created (its slug is
// derived from the title on the server). The list of pages doubles as the entry
// point into the two-pane authoring layout.
export default function PagesEditorPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [statusFilter, setStatusFilter] = useState('all');

  const [editing, setEditing] = useState(false); // false = list view
  const [isNew, setIsNew] = useState(true);
  const [currentId, setCurrentId] = useState(null);
  const [currentSlug, setCurrentSlug] = useState('');

  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState(null);
  const snapshot = useRef(JSON.stringify(BLANK));

  const load = () => {
    setStatus('loading');
    pagesApi
      .list(statusFilter !== 'all' ? { status: statusFilter } : undefined)
      .then((items) => {
        setRows(items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [statusFilter]);

  const dirty = useMemo(() => JSON.stringify(form) !== snapshot.current, [form]);

  const set = (name, value) => { setForm((f) => ({ ...f, [name]: value })); setJustSaved(false); };
  const onChange = (e) => set(e.target.name, e.target.value);

  const startNew = () => {
    setIsNew(true);
    setCurrentId(null);
    setCurrentSlug('');
    setForm(BLANK);
    snapshot.current = JSON.stringify(BLANK);
    setError(null);
    setJustSaved(false);
    setEditing(true);
  };

  const selectPage = (row) => {
    const next = {
      title: row.title || '',
      body: row.body || '',
      status: row.status || 'draft',
      updatedLabel: row.updatedLabel || '',
      seoTitle: row.seo?.title || '',
      seoDescription: row.seo?.description || '',
    };
    setIsNew(false);
    setCurrentId(row._id || row.id);
    setCurrentSlug(row.slug || '');
    setForm(next);
    snapshot.current = JSON.stringify(next);
    setError(null);
    setJustSaved(false);
    setEditing(true);
  };

  const backToList = () => {
    setEditing(false);
    load();
  };

  const payload = (statusOverride) => ({
    title: form.title,
    body: form.body,
    status: statusOverride || form.status,
    updatedLabel: form.updatedLabel,
    seo: { title: form.seoTitle, description: form.seoDescription },
  });

  const save = async (statusOverride) => {
    if (!form.title.trim()) { setError('Please add a title before saving.'); return; }
    setSaving(true);
    setError(null);
    try {
      const body = payload(statusOverride);
      let savedId = currentId;
      let savedSlug = currentSlug;
      if (isNew) {
        const created = await pagesApi.create(body);
        savedId = created._id || created.id;
        savedSlug = created.slug || savedSlug;
      } else {
        const updated = await pagesApi.update(currentId, body);
        savedSlug = updated?.slug || savedSlug;
      }

      const nextForm = statusOverride ? { ...form, status: statusOverride } : form;
      if (statusOverride) setForm(nextForm);
      snapshot.current = JSON.stringify(nextForm);
      setJustSaved(true);
      setSaving(false);

      if (isNew) {
        setIsNew(false);
        setCurrentId(savedId);
      }
      setCurrentSlug(savedSlug);
      load();
    } catch (err) {
      setError(err?.message || 'Failed to save page');
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (r) => (
        <button type="button" style={linkBtnStyle} onClick={() => selectPage(r)}>
          {r.title || '—'}
        </button>
      ),
    },
    { key: 'slug', header: 'Slug', render: (r) => r.slug || '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="admin-table__actions">
          <button type="button" className="admin-btn admin-btn--sm" onClick={() => selectPage(r)}>
            Edit
          </button>
        </div>
      ),
    },
  ];

  if (editing) {
    const isPublished = form.status === 'published';
    const slug = currentSlug || slugify(form.title);

    return (
      <EditorShell
        eyebrow={isNew ? 'New page' : 'Page'}
        title={form.title}
        status={form.status}
        dirty={dirty}
        saving={saving}
        justSaved={justSaved}
        error={error}
        onBack={backToList}
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
                label="Status" name="status" as="select" value={form.status} onChange={onChange}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                  { value: 'archived', label: 'Archived' },
                ]}
              />
              <FormField label="Updated label" name="updatedLabel" value={form.updatedLabel} onChange={onChange} />
            </div>

            <div className="editor-panel">
              <h3 className="editor-panel__title">SEO</h3>
              <FormField label="SEO title" name="seoTitle" value={form.seoTitle} onChange={onChange} />
              <FormField label="Meta description" name="seoDescription" as="textarea" rows={2} value={form.seoDescription} onChange={onChange} />
              <div className="editor-seo-preview" aria-hidden="true">
                <div className="editor-seo-preview__title">{form.seoTitle || form.title || 'Page title'}</div>
                <div className="editor-seo-preview__url">/{slug || 'page-slug'}</div>
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
          placeholder="Page title"
          aria-label="Page title"
        />
        <span className="editor-body-label">Body</span>
        <RichTextEditor
          value={form.body}
          onChange={(html) => set('body', html)}
          placeholder="Write this page…"
        />
      </EditorShell>
    );
  }

  return (
    <div>
      <div className="admin-page__head">
        <h2 className="admin-page__title">Pages</h2>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={startNew}>
            New page
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          style={{ maxWidth: 190 }}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load pages' : null}
        emptyText="No pages yet."
      />
    </div>
  );
}
