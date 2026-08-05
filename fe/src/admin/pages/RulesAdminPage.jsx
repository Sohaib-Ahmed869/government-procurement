import { useEffect, useState } from 'react';
import { rulesApi } from '../../api';
import {
  JURISDICTIONS,
  JURISDICTION_BY_VALUE,
  CATEGORIES,
  CATEGORY_BY_VALUE,
} from '../../features/jurisdictions/data.js';
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

// Same lists the public page uses, so the two can't drift apart.
const STATE_OPTS = JURISDICTIONS.map((j) => ({ value: j.value, label: j.label }));
const CATEGORY_OPTS = CATEGORIES.map((c) => ({ value: c.value, label: c.label }));

const EMPTY = {
  state: JURISDICTIONS[0].value,
  category: CATEGORIES[0].value,
  title: '',
  body: '',
  sourceUrl: '',
  status: 'published',
};

// Procurement rules shown on the Jurisdictional links page.
export default function RulesAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [stateFilter, setStateFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = () => {
    setStatus('loading');
    rulesApi
      .list(stateFilter !== 'all' ? { state: stateFilter } : undefined)
      .then((items) => {
        setRows(items || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [stateFilter]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id || row.id);
    setForm({
      state: row.state || JURISDICTIONS[0].value,
      category: row.category || CATEGORIES[0].value,
      title: row.title || '',
      body: row.body || '',
      sourceUrl: row.sourceUrl || '',
      status: row.status || 'published',
    });
    setSaveError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const body = {
      state: form.state,
      category: form.category,
      title: form.title,
      body: form.body,
      sourceUrl: form.sourceUrl,
      status: form.status,
    };
    try {
      if (editingId) await rulesApi.update(editingId, body);
      else await rulesApi.create(body);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await rulesApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    {
      key: 'state',
      header: 'Jurisdiction',
      render: (r) => JURISDICTION_BY_VALUE[r.state]?.label || r.state || '—',
      width: 210,
    },
    { key: 'title', header: 'Rule' },
    {
      key: 'category',
      header: 'Category',
      render: (r) => CATEGORY_BY_VALUE[r.category]?.label || r.category || '—',
    },
    {
      key: 'sourceUrl',
      header: 'Read more',
      render: (r) => (r.sourceUrl ? 'Linked' : '—'),
      width: 110,
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
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
          <h2 className="admin-page__title">Jurisdictional Links</h2>
          <p className="admin-page__subtitle">
            Procurement rules shown on the Jurisdictional links page, by state and category.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New rule
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <select
          className="admin-select"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          aria-label="Filter by jurisdiction"
          style={{ maxWidth: 240 }}
        >
          <option value="all">All jurisdictions</option>
          {JURISDICTIONS.map((j) => (
            <option key={j.value} value={j.value}>
              {j.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load rules' : null}
        emptyText="No rules yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit rule' : 'New rule'}
        subtitle={
          editingId ? 'Update this rule.' : 'Add a rule to the Jurisdictional links page.'
        }
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDrawer} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="rule-form" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create rule'}
            </button>
          </>
        }
      >
        <form id="rule-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <FormField
            label="Jurisdiction"
            name="state"
            as="select"
            options={STATE_OPTS}
            value={form.state}
            onChange={onChange}
            required
          />
          <FormField
            label="Category"
            name="category"
            as="select"
            options={CATEGORY_OPTS}
            value={form.category}
            onChange={onChange}
            required
            hint="Sets the label and icon shown on the card."
          />
          <FormField
            label="Rule title"
            name="title"
            value={form.title}
            onChange={onChange}
            required
          />
          <FormField
            label="Description"
            name="body"
            as="textarea"
            rows={4}
            value={form.body}
            onChange={onChange}
          />
          <FormField
            label="Read more URL"
            name="sourceUrl"
            value={form.sourceUrl}
            onChange={onChange}
            hint="Link to the official source. Without one the card has no Read more button."
          />
          <FormField
            label="Status"
            name="status"
            as="select"
            options={STATUS_OPTS}
            value={form.status}
            onChange={onChange}
          />
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete rule"
        message="Delete this rule? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
