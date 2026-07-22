import { useEffect, useRef, useState } from 'react';
import { testimonialsApi } from '../../api';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';

const EMPTY = {
  quote: '',
  author: '',
  role: '',
  organisation: '',
  order: 0,
  status: 'published',
};

const STATUS_OPTS = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

// Testimonials: list + drawer create/edit. Avatar upload is only possible once
// the testimonial exists (needs an id), so the avatar picker shows while editing.
export default function TestimonialsPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [confirmId, setConfirmId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInputRef = useRef(null);

  const load = () => {
    setStatus('loading');
    testimonialsApi
      .list({ limit: 100 })
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
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
    setDrawerOpen(true);
  };

  const openEdit = (r) => {
    setEditingId(r._id || r.id);
    setError(null);
    setForm({
      quote: r.quote || '',
      author: r.author || '',
      role: r.role || '',
      organisation: r.organisation || '',
      order: r.order ?? 0,
      status: r.status || 'published',
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
      quote: form.quote,
      author: form.author,
      role: form.role,
      organisation: form.organisation,
      order: Number(form.order) || 0,
      status: form.status,
    };
    try {
      if (editingId) {
        await testimonialsApi.update(editingId, body);
        setDrawerOpen(false);
      } else {
        // Keep the drawer open after creating so the avatar can be attached.
        const created = await testimonialsApi.create(body);
        setEditingId(created._id || created.id);
      }
      load();
    } catch (err) {
      setError(err.message || 'Failed to save testimonial');
    } finally {
      setSaving(false);
    }
  };

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    setAvatarBusy(true);
    setError(null);
    try {
      await testimonialsApi.uploadAvatar(editingId, file);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      load();
    } catch (err) {
      setError(err.message || 'Avatar upload failed');
    } finally {
      setAvatarBusy(false);
    }
  };

  const onDelete = async () => {
    await testimonialsApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    { key: 'author', header: 'Author' },
    { key: 'organisation', header: 'Organisation' },
    { key: 'order', header: 'Order', width: 80 },
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
          <h2 className="admin-page__title">Testimonials</h2>
          <p className="admin-page__subtitle">Client quotes featured across the public site.</p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New testimonial
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load testimonials' : null}
        emptyText="No testimonials yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit testimonial' : 'New testimonial'}
        subtitle={editingId ? 'Update the quote and attribution.' : 'Add a client quote. Save first to attach an avatar.'}
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDrawer} disabled={saving}>
              {editingId ? 'Done' : 'Cancel'}
            </button>
            <button type="submit" form="testi-form" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add testimonial'}
            </button>
          </>
        }
      >
        <form id="testi-form" onSubmit={onSubmit}>
          {error && <div className="admin-alert admin-alert--error">{error}</div>}
          <FormField label="Quote" name="quote" as="textarea" rows={4} value={form.quote} onChange={onChange} required />
          <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <FormField label="Author" name="author" value={form.author} onChange={onChange} required />
            <FormField label="Role" name="role" value={form.role} onChange={onChange} />
            <FormField label="Organisation" name="organisation" value={form.organisation} onChange={onChange} />
            <FormField label="Order" name="order" type="number" value={form.order} onChange={onChange} />
          </div>
          <FormField
            label="Status"
            name="status"
            as="select"
            value={form.status}
            onChange={onChange}
            options={STATUS_OPTS}
          />

          {editingId && (
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="f-avatar">
                Avatar{' '}
                <span className="admin-field__hint">
                  {avatarBusy ? 'uploading…' : 'uploads immediately'}
                </span>
              </label>
              <input
                id="f-avatar"
                ref={avatarInputRef}
                className="admin-input"
                type="file"
                accept="image/*"
                onChange={onAvatar}
                disabled={avatarBusy}
              />
            </div>
          )}
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        message="Delete this testimonial? This cannot be undone."
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
