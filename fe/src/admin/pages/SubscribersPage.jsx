import { useEffect, useState } from 'react';
import { subscribersApi, getToken } from '../../api';
import { BASE_URL } from '../../api/client.js';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

// Format an ISO date/timestamp into a short, readable label for the table.
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Newsletter subscribers list: search + status filter, delete, and CSV export.
export default function SubscribersPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setStatus('loading');
    subscribersApi
      .list({ q, status: statusFilter === 'all' ? undefined : statusFilter, limit: 100 })
      .then((items) => {
        setRows(items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, [q, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await subscribersApi.remove(confirmId);
      setConfirmId(null);
      load();
    } catch (err) {
      setError(err?.message || 'Failed to delete subscriber');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/subscribers/export`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'subscribers.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || 'Failed to export CSV');
    }
  };

  const columns = [
    { key: 'email', header: 'Email' },
    { key: 'name', header: 'Name', render: (r) => r.name || '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'confirmedAt', header: 'Confirmed', render: (r) => formatDate(r.confirmedAt) },
    { key: 'createdAt', header: 'Created', render: (r) => formatDate(r.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="admin-table__actions">
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
        <h2 className="admin-page__title">Subscribers</h2>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      <div className="admin-toolbar">
        <input
          className="admin-input"
          placeholder="Search subscribers…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ maxWidth: 200 }}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load subscribers' : null}
        emptyText="No subscribers yet."
      />

      <ConfirmDialog
        open={Boolean(confirmId)}
        message="Delete this subscriber? This cannot be undone."
        busy={busy}
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
