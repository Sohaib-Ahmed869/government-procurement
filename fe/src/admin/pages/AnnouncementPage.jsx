import { useEffect, useState } from 'react';
import { announcementsApi } from '../../api';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';

const EMPTY = {
  message: '',
  link: '',
  linkLabel: '',
  active: true,
};

// Site announcements banner: list + inline create/edit.
export default function AnnouncementPage() {
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
    announcementsApi
      .list({ all: 1, limit: 100 })
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
      message: r.message || '',
      link: r.link || '',
      linkLabel: r.linkLabel || '',
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
      message: form.message,
      link: form.link,
      linkLabel: form.linkLabel,
      active: String(form.active) === 'true',
    };
    try {
      if (editingId) await announcementsApi.update(editingId, body);
      else await announcementsApi.create(body);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setError(err.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await announcementsApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    {
      key: 'message',
      header: 'Message',
      render: (r) => {
        const msg = r.message || '';
        return msg.length > 60 ? `${msg.slice(0, 60)}…` : msg;
      },
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
          <h2 className="admin-page__title">Announcements</h2>
          <p className="admin-page__subtitle">Site-wide banner messages with an optional scheduling window.</p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New announcement
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load announcements' : null}
        emptyText="No announcements yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit announcement' : 'New announcement'}
        subtitle="Leave the window blank to show it immediately and indefinitely."
        onClose={closeDrawer}
        busy={saving}
        /* Wider than the 440px default so the two-column field grid — including
           the datetime-local inputs — fits without a horizontal scrollbar. */
        width="640px"
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDrawer} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="ann-form" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add announcement'}
            </button>
          </>
        }
      >
        <form id="ann-form" onSubmit={onSubmit}>
          {error && <div className="admin-alert admin-alert--error">{error}</div>}
          <FormField label="Message" name="message" as="textarea" rows={3} value={form.message} onChange={onChange} required />
          <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <FormField label="Link" name="link" value={form.link} onChange={onChange} />
            <FormField label="Link label" name="linkLabel" value={form.linkLabel} onChange={onChange} />
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
        message="Delete this announcement? This cannot be undone."
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
