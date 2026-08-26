import { useEffect, useMemo, useState } from 'react';
import { engageServicesApi } from '../../api';
import DataTable from './DataTable.jsx';
import StatusBadge from './StatusBadge.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import AdminDrawer from './AdminDrawer.jsx';
import FormField from './FormField.jsx';

/* The WIN half of How to Engage Us.

   A row per service a bidder can start with us: its name, the sentence under
   it, and where it sits on the page. Each row draws its own "Request a
   consultation" link, and `serviceKey` is what that link carries so a request
   arrives already naming what it is about.

   Its own component rather than folded into PanelsAdminPage, because the two
   halves of that page share nothing but the screen they are edited on: an Award
   row is a panel appointment with an agency and a contract number, a Win row is
   a service with a sentence. One form could not serve both without becoming a
   form of mostly-hidden fields.

   It lives beside the panels rather than under Service Offering, which is where
   this content used to come from — an editor asking "what does the Win side of
   How to Engage Us say" should find the answer on the How to Engage Us screen. */

const EMPTY = {
  title: '',
  body: '',
  serviceKey: '',
  order: 0,
  status: 'published',
};

const STATUS_OPTIONS = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

export default function EngageServicesPanel() {
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
    engageServicesApi
      .list()
      .then((items) => {
        setRows(items || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  // Suggests the next position, in tens, so a row can be dropped between two
  // existing ones without renumbering the list.
  const nextOrder = useMemo(() => {
    const orders = rows.map((r) => Number(r.order) || 0);
    return orders.length ? Math.max(...orders) + 10 : 10;
  }, [rows]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY, order: nextOrder });
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id || row.id);
    setForm({
      title: row.title || '',
      body: row.body || '',
      serviceKey: row.serviceKey || '',
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
    if (!form.title.trim()) {
      setSaveError('Service is required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const body = {
      title: form.title.trim(),
      body: form.body.trim(),
      serviceKey: form.serviceKey.trim(),
      order: Number(form.order) || 0,
      status: form.status,
    };
    try {
      if (editingId) await engageServicesApi.update(editingId, body);
      else await engageServicesApi.create(body);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await engageServicesApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    { key: 'order', header: '#', render: (r) => r.order ?? 0, width: 60 },
    { key: 'title', header: 'Service' },
    {
      key: 'body',
      header: 'Description',
      render: (r) =>
        r.body ? (
          <span title={r.body}>
            {r.body.length > 90 ? `${r.body.slice(0, 90).trimEnd()}…` : r.body}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      render: (r) => <StatusBadge status={r.status} />,
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
          <p className="admin-page__subtitle">
            The services a supplier or bidder can start with us, listed on the{' '}
            <strong>How to Engage Us</strong> page when the visitor is on{' '}
            <strong>Win Contracts</strong>. Each row carries its own &ldquo;Request a
            consultation&rdquo; link. Published rows are live immediately; drafts are
            visible on the page to you and to nobody else.
          </p>
          <p className="admin-page__subtitle">
            This half used to be drawn from <strong>Content &rarr; Service Offering</strong>,
            so renaming a service there rewrote this page too. The two are edited separately
            now &mdash; a change here does not touch Service Offering, and a change there
            does not touch this.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New service
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load the services' : null}
        emptyText="No services listed yet. Add what a bidder can start with us."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit service' : 'New service'}
        subtitle={
          editingId
            ? 'Update this row on the Win Contracts side.'
            : 'Add a service a bidder can start with us.'
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
              form="engage-service-form"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create service'}
            </button>
          </>
        }
      >
        <form id="engage-service-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <FormField
            label="Service"
            name="title"
            value={form.title}
            onChange={onChange}
            required
            hint="The row's heading, e.g. &ldquo;Bid strategy and go / no-go&rdquo;."
          />
          <FormField
            label="Description"
            name="body"
            as="textarea"
            rows={4}
            value={form.body}
            onChange={onChange}
            hint="One or two sentences on what this service is for a bidder, in their terms."
          />
          <FormField
            label="Consultation reference"
            name="serviceKey"
            value={form.serviceKey}
            onChange={onChange}
            hint="Optional. Carried in the row's consultation link so the request arrives naming this service. Any short label will do; left blank the link still works, it just arrives unlabelled."
          />
          <FormField
            label="Order"
            name="order"
            type="number"
            value={form.order}
            onChange={onChange}
            hint="Position on the page. Lowest first; ties fall back to the service name."
          />
          <FormField
            label="Status"
            name="status"
            as="select"
            value={form.status}
            onChange={onChange}
            options={STATUS_OPTIONS}
            hint="A draft is on the page for signed-in staff only."
          />
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete service"
        message="This removes the row from the Win Contracts side of How to Engage Us. It cannot be undone."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmId(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}
