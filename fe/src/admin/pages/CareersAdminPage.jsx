import { useEffect, useState } from 'react';
import { careersApi } from '../../api';
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

const EMPTY = { title: '', description: '', applyUrl: '', order: 0, status: 'published' };

// Job openings listed under "Roles we are hiring for" on the Careers page.
export default function CareersAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = () => {
    setStatus('loading');
    careersApi
      .listOpenings()
      .then((items) => {
        setRows(items || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, []);

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
      title: row.title || '',
      description: row.description || '',
      applyUrl: row.applyUrl || '',
      order: row.order ?? 0,
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
      title: form.title,
      description: form.description,
      applyUrl: form.applyUrl,
      order: Number(form.order) || 0,
      status: form.status,
    };
    try {
      if (editingId) await careersApi.updateOpening(editingId, body);
      else await careersApi.createOpening(body);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save job opening');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await careersApi.removeOpening(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    { key: 'order', header: '#', render: (r) => r.order ?? 0, width: 60 },
    { key: 'title', header: 'Role' },
    {
      key: 'applyUrl',
      header: 'Apply link',
      render: (r) => r.applyUrl || '—',
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
          <h2 className="admin-page__title">Careers</h2>
          <p className="admin-page__subtitle">
            Openings listed under “Roles we are hiring for” on the Careers page.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New opening
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load job openings' : null}
        emptyText="No job openings yet. The section is hidden on the Careers page while this list is empty."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit opening' : 'New opening'}
        subtitle={
          editingId ? 'Update this role.' : 'Add a role to the Careers page.'
        }
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDrawer} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="opening-form" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create opening'}
            </button>
          </>
        }
      >
        <form id="opening-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <FormField
            label="Role title"
            name="title"
            value={form.title}
            onChange={onChange}
            required
            hint="e.g. Graduate, Analyst, Consultant."
          />
          <FormField
            label="Description"
            name="description"
            as="textarea"
            rows={5}
            value={form.description}
            onChange={onChange}
            hint="The paragraph shown on the card."
          />
          <FormField
            label="Apply link"
            name="applyUrl"
            value={form.applyUrl}
            onChange={onChange}
            required
            hint="Where the Apply button goes — a URL or mailto: address."
          />
          <FormField
            label="Order"
            name="order"
            type="number"
            value={form.order}
            onChange={onChange}
            hint="Lowest first."
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
        title="Delete opening"
        message="Delete this job opening? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
