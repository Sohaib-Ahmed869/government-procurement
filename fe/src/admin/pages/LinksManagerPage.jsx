import { useEffect, useState } from 'react';
import { linksApi } from '../../api';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';

// Blank form used for "create". `region` matters for tender links, `platform`
// for social links — we keep both fields and only surface the relevant one per
// group in the table.
const EMPTY = {
  group: 'tender',
  label: '',
  url: '',
  region: 'global',
  platform: '',
  order: 0,
  active: true,
};

// Links manager: tender + social links, with an inline create/edit form.
// Listing uses `all: 1` so inactive links show up too.
export default function LinksManagerPage() {
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
    linksApi
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
      group: r.group || 'tender',
      label: r.label || '',
      url: r.url || '',
      region: r.region || '',
      platform: r.platform || '',
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
      group: form.group,
      label: form.label,
      url: form.url,
      region: form.region,
      platform: form.platform,
      order: Number(form.order) || 0,
      active: String(form.active) === 'true',
    };
    try {
      if (editingId) await linksApi.update(editingId, body);
      else await linksApi.create(body);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setError(err.message || 'Failed to save link');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await linksApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    { key: 'group', header: 'Group' },
    { key: 'label', header: 'Label' },
    {
      key: 'url',
      header: 'URL',
      render: (r) => (
        <a href={r.url} target="_blank" rel="noreferrer">
          {r.url}
        </a>
      ),
    },
    {
      key: 'regionPlatform',
      header: 'Region / Platform',
      render: (r) => (r.group === 'social' ? r.platform || '—' : r.region || '—'),
    },
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
          <h2 className="admin-page__title">Links</h2>
          <p className="admin-page__subtitle">Tender portal links and social profiles.</p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New link
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load links' : null}
        emptyText="No links yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit link' : 'New link'}
        subtitle="Region applies to tender links; platform applies to social links."
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDrawer} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="link-form" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add link'}
            </button>
          </>
        }
      >
        <form id="link-form" onSubmit={onSubmit}>
          {error && <div className="admin-alert admin-alert--error">{error}</div>}
          <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <FormField
              label="Group"
              name="group"
              as="select"
              value={form.group}
              onChange={onChange}
              options={[
                { value: 'tender', label: 'Tender' },
                { value: 'social', label: 'Social' },
              ]}
            />
            <FormField label="Label" name="label" value={form.label} onChange={onChange} required />
          </div>
          <FormField label="URL" name="url" value={form.url} onChange={onChange} required />
          <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <FormField
              label="Region"
              name="region"
              as="select"
              hint="tender links"
              value={form.region}
              onChange={onChange}
              options={[
                { value: 'global', label: 'Global' },
                { value: 'australia', label: 'Australia' },
                { value: '', label: '(none)' },
              ]}
            />
            <FormField
              label="Platform"
              name="platform"
              hint="social links"
              value={form.platform}
              onChange={onChange}
            />
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
        message="Delete this link? This cannot be undone."
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
