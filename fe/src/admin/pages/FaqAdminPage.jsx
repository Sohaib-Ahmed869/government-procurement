import { useEffect, useState } from 'react';
import { faqsApi } from '../../api';
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

const EMPTY = { question: '', answer: '', category: '', order: 0, status: 'draft' };

// FAQ manager: the list is the whole screen; creating/editing opens a drawer.
export default function FaqAdminPage() {
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
    faqsApi
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
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id || row.id);
    setForm({
      question: row.question || '',
      answer: row.answer || '',
      category: row.category || '',
      order: row.order ?? 0,
      status: row.status || 'draft',
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
      question: form.question,
      answer: form.answer,
      category: form.category,
      order: Number(form.order) || 0,
      status: form.status,
    };
    try {
      if (editingId) await faqsApi.update(editingId, body);
      else await faqsApi.create(body);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await faqsApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    { key: 'question', header: 'Question' },
    { key: 'category', header: 'Category', render: (r) => r.category || '—' },
    { key: 'order', header: 'Order', render: (r) => r.order ?? 0, width: 80 },
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
          <h2 className="admin-page__title">FAQs</h2>
          <p className="admin-page__subtitle">Questions and answers shown on the public FAQ page.</p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New FAQ
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load FAQs' : null}
        emptyText="No FAQs yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit FAQ' : 'New FAQ'}
        subtitle={editingId ? 'Update this question and answer.' : 'Add a question and answer to the FAQ page.'}
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDrawer} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="faq-form" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create FAQ'}
            </button>
          </>
        }
      >
        <form id="faq-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}
          <FormField label="Question" name="question" value={form.question} onChange={onChange} required />
          <FormField
            label="Answer"
            name="answer"
            as="textarea"
            rows={5}
            value={form.answer}
            onChange={onChange}
            required
          />
          <FormField label="Category" name="category" value={form.category} onChange={onChange} />
          <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <FormField label="Order" name="order" type="number" value={form.order} onChange={onChange} />
            <FormField
              label="Status"
              name="status"
              as="select"
              value={form.status}
              onChange={onChange}
              options={STATUS_OPTS}
            />
          </div>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        message="Delete this FAQ? This cannot be undone."
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
