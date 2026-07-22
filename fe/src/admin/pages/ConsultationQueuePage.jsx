import { useEffect, useState } from 'react';
import { consultationsApi } from '../../api';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const STATUSES = ['new', 'contacted', 'scheduled', 'closed'];

// Link-styled button so a row's name opens the detail panel without a route.
const linkBtnStyle = {
  background: 'none',
  border: 0,
  padding: 0,
  font: 'inherit',
  color: 'var(--admin-green)',
  textDecoration: 'underline',
  cursor: 'pointer',
};

// Format an ISO date/timestamp into a short, readable label.
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Consultation request queue: filter/search the list, open a row into a detail
// panel to triage its status and jot notes, or delete it.
export default function ConsultationQueuePage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ status: 'new', notes: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = () => {
    setStatus('loading');
    consultationsApi
      .list({
        q,
        status: statusFilter === 'all' ? undefined : statusFilter,
        service: serviceFilter || undefined,
        limit: 100,
      })
      .then((items) => {
        setRows(items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, [q, statusFilter, serviceFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = (row) => {
    setSelected(row);
    setForm({ status: row.status || 'new', notes: row.notes || '' });
    setSaveError(null);
  };

  const onSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      const id = selected._id || selected.id;
      const updated = await consultationsApi.update(id, {
        status: form.status,
        notes: form.notes,
      });
      setSelected(updated);
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await consultationsApi.remove(confirmId);
    if (selected && (selected._id || selected.id) === confirmId) setSelected(null);
    setConfirmId(null);
    load();
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (r) => (
        <button type="button" style={linkBtnStyle} onClick={() => openDetail(r)}>
          {r.name || '—'}
        </button>
      ),
    },
    { key: 'email', header: 'Email' },
    { key: 'service', header: 'Service', render: (r) => r.service || '—' },
    { key: 'preferredDate', header: 'Preferred date', render: (r) => formatDate(r.preferredDate) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="admin-table__actions">
          <button type="button" className="admin-btn admin-btn--sm" onClick={() => openDetail(r)}>
            View
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
        <h2 className="admin-page__title">Consultations</h2>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-input"
          placeholder="Search consultations…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ maxWidth: 180 }}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <input
          className="admin-input"
          placeholder="Filter by service…"
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          style={{ maxWidth: 220 }}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load consultations' : null}
        emptyText="No consultation requests yet."
      />

      {selected && (
        <div className="admin-card" style={{ marginTop: 24 }}>
          <div className="admin-page__head">
            <h3 className="admin-page__title">{selected.name || 'Consultation'}</h3>
            <div className="admin-page__actions">
              <button type="button" className="admin-btn" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>

          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <div style={{ marginBottom: 20 }}>
            <div className="admin-field">
              <div className="admin-field__label">Email</div>
              <div>{selected.email || '—'}</div>
            </div>
            <div className="admin-field">
              <div className="admin-field__label">Phone</div>
              <div>{selected.phone || '—'}</div>
            </div>
            <div className="admin-field">
              <div className="admin-field__label">Service</div>
              <div>{selected.service || '—'}</div>
            </div>
            <div className="admin-field">
              <div className="admin-field__label">Preferred date</div>
              <div>{formatDate(selected.preferredDate)}</div>
            </div>
            <div className="admin-field">
              <div className="admin-field__label">Message</div>
              <div>{selected.message || '—'}</div>
            </div>
            <div className="admin-field">
              <div className="admin-field__label">Submitted</div>
              <div>{formatDate(selected.createdAt)}</div>
            </div>
          </div>

          <div className="admin-form-grid">
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="c-status">
                Status
              </label>
              <select
                id="c-status"
                className="admin-select"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-field__label" htmlFor="c-notes">
              Notes
            </label>
            <textarea
              id="c-notes"
              className="admin-textarea"
              rows={4}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--danger"
              onClick={() => setConfirmId(selected._id || selected.id)}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmId)}
        message="Delete this consultation request? This cannot be undone."
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
