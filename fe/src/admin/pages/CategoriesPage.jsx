import { useEffect, useState } from 'react';
import { categoriesApi } from '../../api';
import DataTable from '../components/DataTable.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';

const KINDS = ['article', 'video', 'faq', 'course'];
const BLANK = { name: '', kinds: [], order: 0 };

// Categories admin: the list is the whole screen; add/edit opens a drawer.
export default function CategoriesPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = () => {
    setStatus('loading');
    categoriesApi
      .list({ limit: 200 })
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

  const toggleKind = (kind) => {
    setForm((f) => ({
      ...f,
      kinds: f.kinds.includes(kind) ? f.kinds.filter((k) => k !== kind) : [...f.kinds, kind],
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(BLANK);
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id || row.id);
    setForm({
      name: row.name ?? '',
      kinds: Array.isArray(row.kinds) ? row.kinds : [],
      order: row.order ?? 0,
    });
    setError(null);
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
    const payload = { name: form.name, kinds: form.kinds, order: Number(form.order) || 0 };
    try {
      if (editingId) await categoriesApi.update(editingId, payload);
      else await categoriesApi.create(payload);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setError(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await categoriesApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'kinds', header: 'Kinds', render: (r) => (Array.isArray(r.kinds) ? r.kinds.join(', ') : '') },
    { key: 'order', header: 'Order', width: 80 },
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
          <h2 className="admin-page__title">Categories</h2>
          <p className="admin-page__subtitle">Shared taxonomy for articles, videos, FAQs and courses.</p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New category
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load categories' : null}
        emptyText="No categories yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit category' : 'New category'}
        subtitle="Pick which content types this category applies to."
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDrawer} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="cat-form" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add category'}
            </button>
          </>
        }
      >
        <form id="cat-form" onSubmit={onSubmit}>
          {error && <div className="admin-alert admin-alert--error">{error}</div>}
          <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <FormField label="Name" name="name" value={form.name} onChange={onChange} required />
            <FormField label="Order" name="order" type="number" value={form.order} onChange={onChange} />
          </div>

          <div className="admin-field">
            <span className="admin-field__label">Applies to</span>
            <div className="admin-checkgroup">
              {KINDS.map((kind) => (
                <label key={kind} className="admin-checkgroup__item">
                  <input
                    type="checkbox"
                    checked={form.kinds.includes(kind)}
                    onChange={() => toggleKind(kind)}
                  />
                  <span>{kind}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        message="Delete this category? This cannot be undone."
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
