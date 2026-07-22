import { useEffect, useState } from 'react';
import { homepageRailsApi } from '../../api';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';

// NOTE: this screen manages rail *metadata* (key, title, kind, fallback,
// limits, ordering) only. Curating specific items per rail (a manual
// item-picker) is out of scope here — the `fallback` strategy decides what
// fills a rail that has no curated items.
const EMPTY = {
  key: '',
  title: '',
  kind: 'article',
  fallback: 'latest',
  maxItems: 6,
  order: 0,
  active: true,
};

// Homepage rails: list + inline create/edit of rail metadata.
export default function HomepageRailsPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [confirmId, setConfirmId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setStatus('loading');
    homepageRailsApi
      .list({ all: 1 })
      .then((items) => {
        setRows(items);
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
    setForm(EMPTY);
    setEditingId(null);
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (r) => {
    setEditingId(r._id || r.id);
    setError(null);
    setForm({
      key: r.key || '',
      title: r.title || '',
      kind: r.kind || 'article',
      fallback: r.fallback || 'latest',
      maxItems: r.maxItems ?? 6,
      order: r.order ?? 0,
      active: r.active !== false,
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      key: form.key,
      title: form.title,
      kind: form.kind,
      fallback: form.fallback,
      maxItems: Number(form.maxItems) || 0,
      order: Number(form.order) || 0,
      active: String(form.active) === 'true',
    };
    try {
      if (editingId) await homepageRailsApi.update(editingId, body);
      else await homepageRailsApi.create(body);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setError(err.message || 'Failed to save rail');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await homepageRailsApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    { key: 'key', header: 'Key' },
    { key: 'title', header: 'Title' },
    { key: 'kind', header: 'Kind' },
    { key: 'fallback', header: 'Fallback' },
    {
      key: 'active',
      header: 'Active',
      render: (r) => <StatusBadge status={r.active !== false ? 'active' : 'inactive'} />,
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
          <h2 className="admin-page__title">Homepage rails</h2>
          <p className="admin-page__subtitle">Content strips shown on the homepage and their fallback strategy.</p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New rail
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load rails' : null}
        emptyText="No rails yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit rail' : 'New rail'}
        subtitle="Rail metadata only — item curation uses the fallback strategy."
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDrawer} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="rail-form" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add rail'}
            </button>
          </>
        }
      >
        <form id="rail-form" onSubmit={onSubmit}>
          {error && <div className="admin-alert admin-alert--error">{error}</div>}
          <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <FormField label="Key" name="key" hint="stable id" value={form.key} onChange={onChange} required />
            <FormField label="Title" name="title" value={form.title} onChange={onChange} required />
            <FormField
              label="Kind"
              name="kind"
              as="select"
              value={form.kind}
              onChange={onChange}
              options={[
                { value: 'article', label: 'Article' },
                { value: 'video', label: 'Video' },
                { value: 'course', label: 'Course' },
              ]}
            />
            <FormField
              label="Fallback"
              name="fallback"
              as="select"
              value={form.fallback}
              onChange={onChange}
              options={[
                { value: 'latest', label: 'Latest' },
                { value: 'featured', label: 'Featured' },
                { value: 'none', label: 'None' },
              ]}
            />
            <FormField label="Max items" name="maxItems" type="number" value={form.maxItems} onChange={onChange} />
            <FormField label="Order" name="order" type="number" value={form.order} onChange={onChange} />
            <FormField
              label="Active"
              name="active"
              as="select"
              value={String(form.active)}
              onChange={onChange}
              options={[
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ]}
            />
          </div>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        message="Delete this rail? This cannot be undone."
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
