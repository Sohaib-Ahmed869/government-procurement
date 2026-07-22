import { Fragment, useEffect, useState } from 'react';
import { contactApi } from '../../api';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

// Format an ISO date/timestamp into a short, readable label for the table.
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Contact form inbox: browse messages, open one (which flips new → read),
// change its status, or delete it.
export default function ContactInboxPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setStatus('loading');
    contactApi
      .list({ q, status: statusFilter === 'all' ? undefined : statusFilter, limit: 100 })
      .then((items) => {
        setRows(items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, [q, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRow = async (row) => {
    const id = row._id || row.id;
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setError('');
    try {
      // get() also flips a "new" message to "read" server-side.
      const full = await contactApi.get(id);
      setDetail(full);
      // reflect the read state in the list without a full refetch flash
      load();
    } catch (err) {
      setError(err?.message || 'Failed to load message');
    }
  };

  const onChangeStatus = async (id, next) => {
    setBusy(true);
    setError('');
    try {
      await contactApi.update(id, { status: next });
      setDetail((d) => (d ? { ...d, status: next } : d));
      load();
    } catch (err) {
      setError(err?.message || 'Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await contactApi.remove(confirmId);
      if (openId === confirmId) {
        setOpenId(null);
        setDetail(null);
      }
      setConfirmId(null);
      load();
    } catch (err) {
      setError(err?.message || 'Failed to delete message');
    } finally {
      setBusy(false);
    }
  };

  const columns = ['Name', 'Email', 'Subject', 'Status', 'Received'];

  const renderDetail = (row) => {
    const id = row._id || row.id;
    return (
      <div className="admin-card" style={{ margin: '4px 0' }}>
        {error && <div className="admin-alert admin-alert--error">{error}</div>}
        {!detail && <p className="admin-modal__text">Loading…</p>}
        {detail && (
          <>
            <p className="admin-modal__text" style={{ whiteSpace: 'pre-wrap' }}>
              {detail.message || detail.body || 'No message body.'}
            </p>
            <div className="admin-toolbar" style={{ marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
              <label className="admin-stat__label" htmlFor={`status-${id}`}>
                Status
              </label>
              <select
                id={`status-${id}`}
                className="admin-select"
                value={detail.status || 'new'}
                disabled={busy}
                onChange={(e) => onChangeStatus(id, e.target.value)}
                style={{ maxWidth: 200 }}
              >
                <option value="new">New</option>
                <option value="read">Read</option>
                <option value="handled">Handled</option>
                <option value="archived">Archived</option>
              </select>
              <button
                type="button"
                className="admin-btn admin-btn--sm admin-btn--danger"
                onClick={() => setConfirmId(id)}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="admin-page__head">
        <h2 className="admin-page__title">Contact inbox</h2>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-input"
          placeholder="Search messages…"
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
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="handled">Handled</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {status === 'loading' && (
              <tr>
                <td colSpan={columns.length} className="admin-tablestate">
                  Loading…
                </td>
              </tr>
            )}
            {status === 'error' && (
              <tr>
                <td colSpan={columns.length} className="admin-tablestate">
                  Failed to load messages
                </td>
              </tr>
            )}
            {status === 'ready' && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="admin-tablestate">
                  No messages yet.
                </td>
              </tr>
            )}
            {status === 'ready' &&
              rows.map((row) => {
                const id = row._id || row.id;
                return (
                  <Fragment key={id}>
                    <tr onClick={() => openRow(row)} style={{ cursor: 'pointer' }}>
                      <td>{row.name || '—'}</td>
                      <td>{row.email || '—'}</td>
                      <td>{row.subject || '—'}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>{formatDate(row.createdAt)}</td>
                    </tr>
                    {openId === id && (
                      <tr>
                        <td colSpan={columns.length}>{renderDetail(row)}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(confirmId)}
        message="Delete this message? This cannot be undone."
        busy={busy}
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
