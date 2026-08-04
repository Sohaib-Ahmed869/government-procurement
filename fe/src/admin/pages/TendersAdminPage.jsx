import { useEffect, useRef, useState } from 'react';
import { tenderSitesApi } from '../../api';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';

const EMPTY = {
  name: '',
  subtitle: '',
  openTendersUrl: '',
  upcomingTendersUrl: '',
  createAccountUrl: '',
  order: 0,
  active: true,
};

// Tender portals listed on the Tender Websites page. Each entry is one
// jurisdiction's site: its name, who runs it, up to three destinations and a
// logo. These replaced the tender entries that used to sit in Links.
export default function TendersAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  // The logo needs an existing record to attach to, so the picker only shows
  // while editing.
  const [logoUrl, setLogoUrl] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef(null);

  const load = () => {
    setStatus('loading');
    tenderSitesApi
      .list({ all: 1 })
      .then((items) => {
        setRows(items || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setLogoUrl('');
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id || row.id);
    setForm({
      name: row.name || '',
      subtitle: row.subtitle || '',
      openTendersUrl: row.openTendersUrl || '',
      upcomingTendersUrl: row.upcomingTendersUrl || '',
      createAccountUrl: row.createAccountUrl || '',
      order: row.order ?? 0,
      active: row.active !== false,
    });
    setLogoUrl(row.logo?.url || '');
    setSaveError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setSaveError('Name is required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const body = {
      name: form.name,
      subtitle: form.subtitle,
      openTendersUrl: form.openTendersUrl,
      upcomingTendersUrl: form.upcomingTendersUrl,
      createAccountUrl: form.createAccountUrl,
      order: Number(form.order) || 0,
      active: Boolean(form.active),
    };
    try {
      if (editingId) {
        await tenderSitesApi.update(editingId, body);
      } else {
        // Creating first gives the logo a record to attach to — the picker
        // appears once the drawer reopens on the saved entry.
        const site = await tenderSitesApi.create(body);
        setEditingId(site?._id || site?.id || null);
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save tender site');
    } finally {
      setSaving(false);
    }
  };

  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    setLogoBusy(true);
    setSaveError(null);
    try {
      const updated = await tenderSitesApi.uploadLogo(editingId, file);
      setLogoUrl(updated?.logo?.url || '');
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to upload logo');
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDelete = async () => {
    await tenderSitesApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  // A tick per destination that's filled in, so the table shows at a glance
  // which entries are still missing a link.
  const linkSummary = (r) =>
    [
      r.openTendersUrl ? 'Open' : null,
      r.upcomingTendersUrl ? 'Upcoming' : null,
      r.createAccountUrl ? 'Account' : null,
    ]
      .filter(Boolean)
      .join(', ') || '—';

  const columns = [
    { key: 'order', header: '#', render: (r) => r.order ?? 0, width: 60 },
    {
      key: 'logo',
      header: 'Logo',
      width: 80,
      render: (r) =>
        r.logo?.url ? (
          <img
            src={r.logo.url}
            alt=""
            style={{ display: 'block', width: 40, height: 40, objectFit: 'contain' }}
          />
        ) : (
          '—'
        ),
    },
    { key: 'name', header: 'Name' },
    { key: 'subtitle', header: 'Subtitle', render: (r) => r.subtitle || '—' },
    { key: 'links', header: 'Links', render: linkSummary },
    {
      key: 'active',
      header: 'Status',
      render: (r) => <StatusBadge status={r.active !== false ? 'published' : 'draft'} />,
      width: 120,
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
          <h2 className="admin-page__title">Tenders</h2>
          <p className="admin-page__subtitle">
            The portals listed on the Tender Websites page, in the order shown.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New tender site
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load tender sites' : null}
        emptyText="No tender sites yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit tender site' : 'New tender site'}
        subtitle={
          editingId
            ? 'Update this portal.'
            : 'Add a portal to the Tender Websites page. Save it, then reopen to add the logo.'
        }
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDrawer} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              form="tender-form"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create tender site'}
            </button>
          </>
        }
      >
        <form id="tender-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <FormField
            label="Name"
            name="name"
            value={form.name}
            onChange={onChange}
            required
            hint="e.g. Buy.NSW"
          />
          <FormField
            label="Subtitle"
            name="subtitle"
            value={form.subtitle}
            onChange={onChange}
            hint="e.g. NSW State Government"
          />
          <FormField
            label="Open Tenders"
            name="openTendersUrl"
            value={form.openTendersUrl}
            onChange={onChange}
            hint="Link to the portal's open tender search. Leave empty to hide the button."
          />
          <FormField
            label="Upcoming Tenders"
            name="upcomingTendersUrl"
            value={form.upcomingTendersUrl}
            onChange={onChange}
            hint="Link to forecast or upcoming notices. Leave empty to hide the button."
          />
          <FormField
            label="Create Free Account"
            name="createAccountUrl"
            value={form.createAccountUrl}
            onChange={onChange}
            hint="Link to registration or sign-in. Leave empty to hide the button."
          />

          <div className="admin-field">
            <span className="admin-field__label">Logo</span>
            {editingId ? (
              <>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt=""
                    style={{
                      display: 'block',
                      width: 120,
                      height: 60,
                      objectFit: 'contain',
                      marginBottom: 10,
                    }}
                  />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="admin-input"
                  onChange={onLogo}
                  disabled={logoBusy}
                />
                <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                  {logoBusy
                    ? 'Uploading…'
                    : 'Use the version that sits best on a dark background. Without one the card shows the name alone.'}
                </p>
              </>
            ) : (
              <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                Create the tender site first, then add a logo.
              </p>
            )}
          </div>

          <FormField
            label="Order"
            name="order"
            type="number"
            value={form.order}
            onChange={onChange}
            hint="Lowest first."
          />

          <div className="admin-field">
            <div className="admin-checkgroup">
              <label className="admin-checkgroup__item">
                <input
                  type="checkbox"
                  name="active"
                  checked={Boolean(form.active)}
                  onChange={onChange}
                />
                <span>Shown on the site</span>
              </label>
            </div>
          </div>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete tender site"
        message="This removes it from the Tender Websites page. This can't be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmId(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}
