import { useEffect, useState } from 'react';
import { auditApi } from '../../api';
import DataTable from '../components/DataTable.jsx';

// Format an ISO timestamp into a short, readable label for the table.
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Read-only, paginated audit trail of admin actions.
export default function AuditLogPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setStatus('loading');
    auditApi
      .page({ page, limit: 25, q })
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || null);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [page, q]);

  // Reset to the first page whenever the search term changes.
  const onSearch = (e) => {
    setPage(1);
    setQ(e.target.value);
  };

  const columns = [
    { key: 'createdAt', header: 'Time', render: (r) => formatDate(r.createdAt) },
    { key: 'actorEmail', header: 'Actor', render: (r) => r.actorEmail || '—' },
    { key: 'action', header: 'Action' },
    { key: 'entity', header: 'Entity' },
    { key: 'summary', header: 'Summary', render: (r) => r.summary || '—' },
  ];

  return (
    <div>
      <div className="admin-page__head">
        <h2 className="admin-page__title">Audit log</h2>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-input"
          placeholder="Search audit log…"
          value={q}
          onChange={onSearch}
          style={{ maxWidth: 280 }}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load audit log' : null}
        emptyText="No audit entries."
      />

      {meta && (
        <div className="admin-toolbar" style={{ justifyContent: 'space-between' }}>
          <span className="admin-field__hint">
            Page {meta.page} of {meta.totalPages || 1}
          </span>
          <div className="admin-table__actions">
            <button
              type="button"
              className="admin-btn admin-btn--sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!meta.hasPrev || status === 'loading'}
            >
              Prev
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNext || status === 'loading'}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
