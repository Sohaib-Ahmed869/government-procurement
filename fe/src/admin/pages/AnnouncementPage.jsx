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
  tone: 'info',
  active: true,
  startsAt: '',
  endsAt: '',
};

// Convert an ISO timestamp to the `YYYY-MM-DDTHH:mm` value a
// datetime-local input expects (in local time).
function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

// Short human label for a date used in the table's window column.
function shortDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

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
      tone: r.tone || 'info',
      active: r.active !== false,
      startsAt: toLocalInput(r.startsAt),
      endsAt: toLocalInput(r.endsAt),
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
      tone: form.tone,
      active: String(form.active) === 'true',
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
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
    { key: 'tone', header: 'Tone' },
    {
      key: 'active',
      header: 'Active',
      render: (r) => <StatusBadge status={r.active !== false ? 'active' : 'inactive'} />,
    },
    {
      key: 'window',
      header: 'Window',
      render: (r) => `${shortDate(r.startsAt)} → ${shortDate(r.endsAt)}`,
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
              label="Tone"
              name="tone"
              as="select"
              value={form.tone}
              onChange={onChange}
              options={[
                { value: 'info', label: 'Info' },
                { value: 'success', label: 'Success' },
                { value: 'warning', label: 'Warning' },
              ]}
            />
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
            <FormField label="Starts at" name="startsAt" type="datetime-local" value={form.startsAt} onChange={onChange} />
            <FormField label="Ends at" name="endsAt" type="datetime-local" value={form.endsAt} onChange={onChange} />
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
