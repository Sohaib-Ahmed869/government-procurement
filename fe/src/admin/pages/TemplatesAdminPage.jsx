import { useEffect, useMemo, useRef, useState } from 'react';
import { templatesApi } from '../../api';
import {
  CATEGORIES,
  CATEGORY_BY_VALUE,
  CATEGORY_OPTIONS,
  FORMAT_BY_VALUE,
  FORMAT_OPTIONS,
  fileSize,
} from '../../features/templates/data.js';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';

const STATUS_OPTS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const EMPTY = {
  title: '',
  description: '',
  category: CATEGORIES[0].value,
  useCase: '',
  useCaseOrder: 0,
  format: FORMAT_OPTIONS[0].value,
  source: '',
  sourceUrl: '',
  licenceType: '',
  licenceHolder: '',
  licenceUrl: '',
  attributionRequired: false,
  attributionText: '',
  licenceNotes: '',
  confirmedBy: '',
  order: 0,
  status: 'draft',
};

// B6.7 — the Templates library's management screen.
//
// Half this form is provenance, and that is the point. B6.1 makes licensing a
// hard gate, and the server enforces it: a PATCH that sets status to Published
// without a file, a source, a licence and a sign-off is rejected. This screen's
// job is to make that obvious before the save rather than after it, which is why
// the blockers are listed in the drawer as you fill it in.
export default function TemplatesAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [allRows, setAllRows] = useState([]);
  const [file, setFile] = useState(null); // the uploaded file on the record
  const [fileBusy, setFileBusy] = useState(false);
  const fileRef = useRef(null);

  const load = () => {
    setStatus('loading');
    templatesApi
      .list(categoryFilter !== 'all' ? { category: categoryFilter } : undefined)
      .then((items) => {
        setRows(items || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [categoryFilter]);

  useEffect(() => {
    templatesApi
      .list()
      .then((items) => setAllRows(items || []))
      .catch(() => {});
  }, [rows.length]);

  const useCaseSuggestions = useMemo(() => {
    const seen = allRows
      .filter((r) => !form.category || r.category === form.category)
      .map((r) => r.useCase)
      .filter(Boolean);
    return [...new Set(seen)].sort((a, b) => a.localeCompare(b));
  }, [allRows, form.category]);

  // The same rule the server applies, mirrored here so an editor can see what
  // is missing while they fill the form instead of finding out on save. The
  // server remains the authority; this is a courtesy, not the gate.
  const publishBlockers = useMemo(() => {
    const out = [];
    if (!file?.key) out.push('a document has to be uploaded');
    if (!form.source.trim()) out.push('the source has to be recorded');
    if (!form.licenceType.trim()) out.push('the licence has to be recorded');
    if (!form.confirmedBy.trim()) out.push('the licence has to be signed off');
    if (form.attributionRequired && !form.attributionText.trim()) {
      out.push('this licence requires attribution, so the attribution text has to be written');
    }
    return out;
  }, [file, form]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setFile(null);
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id || row.id);
    const l = row.licence || {};
    setForm({
      title: row.title || '',
      description: row.description || '',
      category: row.category || CATEGORIES[0].value,
      useCase: row.useCase || '',
      useCaseOrder: row.useCaseOrder ?? 0,
      format: row.format || FORMAT_OPTIONS[0].value,
      source: row.source || '',
      sourceUrl: row.sourceUrl || '',
      licenceType: l.type || '',
      licenceHolder: l.holder || '',
      licenceUrl: l.url || '',
      attributionRequired: Boolean(l.attributionRequired),
      attributionText: l.attributionText || '',
      licenceNotes: l.notes || '',
      confirmedBy: l.confirmedBy || '',
      order: row.order ?? 0,
      status: row.status || 'draft',
    });
    setFile(row.file || null);
    setSaveError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving || fileBusy) return;
    setDrawerOpen(false);
  };

  const onFile = async (e) => {
    const picked = e.target.files?.[0];
    if (!picked || !editingId) return;
    setFileBusy(true);
    setSaveError(null);
    try {
      const updated = await templatesApi.uploadFile(editingId, picked);
      setFile(updated?.file || null);
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to upload the document');
    } finally {
      setFileBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setSaveError('Title is required.');
    if (!form.useCase.trim()) return setSaveError('Use case is required.');

    setSaving(true);
    setSaveError(null);
    const body = {
      title: form.title,
      description: form.description,
      category: form.category,
      useCase: form.useCase.trim(),
      useCaseOrder: Number(form.useCaseOrder) || 0,
      format: form.format,
      source: form.source,
      sourceUrl: form.sourceUrl,
      licence: {
        type: form.licenceType,
        holder: form.licenceHolder,
        url: form.licenceUrl,
        attributionRequired: Boolean(form.attributionRequired),
        attributionText: form.attributionText,
        notes: form.licenceNotes,
        confirmedBy: form.confirmedBy,
      },
      order: Number(form.order) || 0,
      status: form.status,
    };
    try {
      if (editingId) {
        await templatesApi.update(editingId, body);
        setDrawerOpen(false);
      } else {
        // Created as a draft with no file yet, so the drawer stays open in edit
        // mode: the document has to be attached before any of this is useful.
        const createdRow = await templatesApi.create(body);
        setEditingId(createdRow?._id || createdRow?.id || null);
        setFile(null);
        setForm((f) => ({ ...f, status: 'draft' }));
      }
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save this template');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await templatesApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    {
      key: 'category',
      header: 'Category',
      width: 150,
      render: (r) => CATEGORY_BY_VALUE[r.category]?.label || r.category,
    },
    { key: 'useCase', header: 'Use case', width: 190 },
    { key: 'title', header: 'Template' },
    {
      key: 'format',
      header: 'Format',
      width: 110,
      render: (r) => FORMAT_BY_VALUE[r.format]?.label || r.format,
    },
    {
      key: 'file',
      header: 'File',
      width: 110,
      render: (r) =>
        r.file?.key ? (
          fileSize(r.file.size) || 'Attached'
        ) : (
          <span style={{ color: 'var(--admin-muted)' }}>None</span>
        ),
    },
    {
      key: 'licence',
      header: 'Licence',
      width: 150,
      // The one column worth scanning down: it says whether a row could go live.
      render: (r) =>
        r.licence?.confirmedBy ? (
          r.licence.type || 'Signed off'
        ) : (
          <span style={{ color: 'var(--admin-muted)' }}>Not checked</span>
        ),
    },
    { key: 'downloads', header: 'Downloads', width: 110, render: (r) => r.downloads ?? 0 },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="admin-table__actions">
          <button type="button" className="admin-btn admin-btn--sm" onClick={() => openEdit(r)}>
            Edit
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--sm admin-btn--danger"
            onClick={() => setConfirmId(r._id || r.id)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-page__head">
        <div className="admin-page__heading">
          <h2 className="admin-page__title">Templates</h2>
          <p className="admin-page__subtitle">
            The downloadable documents on the Templates page. Every one is sourced, so
            nothing can be published until its licence has been recorded and signed off.
            Files are served in their original format and are never converted.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New template
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <select
          className="admin-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          style={{ maxWidth: 240 }}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load the templates' : null}
        emptyText="No templates yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit template' : 'New template'}
        subtitle={
          editingId
            ? 'Update this document, its provenance and its licence.'
            : 'Create the record first, then attach the document.'
        }
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button
              type="button"
              className="admin-btn"
              onClick={closeDrawer}
              disabled={saving || fileBusy}
            >
              {editingId ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              form="template-form"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create template'}
            </button>
          </>
        }
      >
        <form id="template-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <FormField
            label="Title"
            name="title"
            value={form.title}
            onChange={onChange}
            required
            hint="What the document is, e.g. “Evaluation Plan Template”."
          />
          <FormField
            label="Description"
            name="description"
            as="textarea"
            rows={3}
            value={form.description}
            onChange={onChange}
            hint="One or two lines on what it is for and when to reach for it."
          />
          <FormField
            label="Category"
            name="category"
            as="select"
            options={CATEGORY_OPTIONS}
            value={form.category}
            onChange={onChange}
            required
          />
          <FormField
            label="Use case"
            name="useCase"
            value={form.useCase}
            onChange={onChange}
            required
            list="template-use-cases"
            hint="The group this sits under. Pick an existing one from the list — a new spelling makes a new group."
          />
          <datalist id="template-use-cases">
            {useCaseSuggestions.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <FormField
            label="Use case position"
            name="useCaseOrder"
            type="number"
            value={form.useCaseOrder}
            onChange={onChange}
            hint="Where the use case sits within its category. Same number on every template in it; lowest wins."
          />
          <FormField
            label="Format"
            name="format"
            as="select"
            options={FORMAT_OPTIONS}
            value={form.format}
            onChange={onChange}
            required
            hint="Must match the file you upload. This sets the media type the download is served with."
          />

          {/* --- the document --- */}
          <div className="admin-field">
            <span className="admin-field__label">Document</span>
            {editingId ? (
              <>
                {file?.key && (
                  <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                    Attached: {file.name} ({fileSize(file.size)})
                  </p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  className="admin-input"
                  onChange={onFile}
                  disabled={fileBusy}
                />
                <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                  {fileBusy
                    ? 'Uploading…'
                    : 'Word, Excel or PowerPoint. Uploaded as-is and served as-is: visitors get the editable file, never a PDF.'}
                </p>
              </>
            ) : (
              <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                Create the record first, then attach the document.
              </p>
            )}
          </div>

          {/* --- provenance and licence (B6.1) --- */}
          <FormField
            label="Source"
            name="source"
            value={form.source}
            onChange={onChange}
            hint="Where it came from, e.g. “Adapted from the NSW Procurement Board template” or “Created in-house”. Required to publish."
          />
          <FormField
            label="Source URL"
            name="sourceUrl"
            value={form.sourceUrl}
            onChange={onChange}
            hint="Optional link to the original."
          />
          <FormField
            label="Licence"
            name="licenceType"
            value={form.licenceType}
            onChange={onChange}
            hint="What permits us to hand this out: a licence name, “purchased”, “created in-house”, “written permission”. Required to publish."
          />
          <FormField
            label="Licence holder"
            name="licenceHolder"
            value={form.licenceHolder}
            onChange={onChange}
            hint="Who owns the rights, where that is somebody other than us."
          />
          <FormField
            label="Licence URL"
            name="licenceUrl"
            value={form.licenceUrl}
            onChange={onChange}
            hint="Optional link to the licence terms."
          />

          <div className="admin-field">
            <div className="admin-checkgroup">
              <label className="admin-checkgroup__item">
                <input
                  type="checkbox"
                  name="attributionRequired"
                  checked={Boolean(form.attributionRequired)}
                  onChange={onChange}
                />
                <span>This licence requires attribution</span>
              </label>
            </div>
          </div>

          {form.attributionRequired && (
            <FormField
              label="Attribution text"
              name="attributionText"
              as="textarea"
              rows={2}
              value={form.attributionText}
              onChange={onChange}
              hint="Printed on the template's card exactly as written here. Required to publish once the box above is ticked."
            />
          )}

          <FormField
            label="Licence notes"
            name="licenceNotes"
            as="textarea"
            rows={2}
            value={form.licenceNotes}
            onChange={onChange}
            hint="Internal only. Anything worth recording about what the licence does and does not allow."
          />
          <FormField
            label="Licence checked by"
            name="confirmedBy"
            value={form.confirmedBy}
            onChange={onChange}
            hint="Your name, once you have read the licence and confirmed it permits publication. The date is stamped automatically. Required to publish."
          />

          <FormField
            label="Position within use case"
            name="order"
            type="number"
            value={form.order}
            onChange={onChange}
          />
          <FormField
            label="Status"
            name="status"
            as="select"
            options={STATUS_OPTS}
            value={form.status}
            onChange={onChange}
          />

          {/* The gate, shown while there is still something to do about it. */}
          {publishBlockers.length > 0 && (
            <div className="admin-alert" style={{ marginTop: 12 }}>
              <strong>Not ready to publish.</strong> Before this can go live:
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                {publishBlockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete template"
        message="Delete this template? The document is removed from storage as well. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
