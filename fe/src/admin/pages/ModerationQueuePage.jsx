import { Fragment, useEffect, useState } from 'react';
import { questionsApi } from '../../api';
import StatusBadge from '../components/StatusBadge.jsx';

// Format an ISO date/timestamp into a short, readable label for the table.
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Split a textarea into paragraphs (blank line delimited) → array of strings.
function toParagraphs(text) {
  return String(text)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// Split a textarea into key lessons (one per line) → array of strings.
function toLessons(text) {
  return String(text)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

// Forum Q&A moderation queue. Moves a submission through the workflow
// (Submitted → In Review → Approved → Published, or Rejected) and lets a
// moderator attach a structured answer (paragraphs + key lessons).
export default function ModerationQueuePage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Reject flow + answer editor drafts (per-open row).
  const [rejectNote, setRejectNote] = useState('');
  const [paragraphs, setParagraphs] = useState('');
  const [lessons, setLessons] = useState('');

  const load = () => {
    setStatus('loading');
    questionsApi
      .list({ q, status: statusFilter === 'all' ? undefined : statusFilter, limit: 100 })
      .then((items) => {
        setRows(items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, [q, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRow = (row) => {
    if (openId === (row._id || row.id)) {
      setOpenId(null);
      return;
    }
    setError('');
    setRejectNote('');
    const answer = row.answer || {};
    setParagraphs((answer.paragraphs || []).join('\n\n'));
    setLessons((answer.lessons || answer.keyLessons || []).join('\n'));
    setOpenId(row._id || row.id);
  };

  const setStatusFor = async (id, next, note) => {
    setBusy(true);
    setError('');
    try {
      await questionsApi.setStatus(id, next, note);
      load();
    } catch (err) {
      setError(err?.message || 'Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  const saveAnswer = async (id) => {
    setBusy(true);
    setError('');
    try {
      await questionsApi.answer(id, toParagraphs(paragraphs), toLessons(lessons));
      load();
    } catch (err) {
      setError(err?.message || 'Failed to save answer');
    } finally {
      setBusy(false);
    }
  };

  const toggleFeatured = async (id, next) => {
    setBusy(true);
    setError('');
    try {
      await questionsApi.setFeatured(id, next);
      load();
    } catch (err) {
      setError(err?.message || 'Failed to update featured');
    } finally {
      setBusy(false);
    }
  };

  const columns = ['Title', 'Category', 'Status', 'Submitted'];

  const renderDetail = (row) => {
    const id = row._id || row.id;
    const name = row.name || row.submitter?.name || '—';
    const email = row.email || row.submitter?.email || '—';
    return (
      <div className="admin-card" style={{ margin: '4px 0' }}>
        {error && <div className="admin-alert admin-alert--error">{error}</div>}

        <p className="admin-modal__text" style={{ whiteSpace: 'pre-wrap' }}>
          {row.body || 'No message body.'}
        </p>
        <p className="admin-stat__label">
          Submitted by <strong>{name}</strong> ({email})
        </p>

        <div className="admin-toolbar" style={{ marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className="admin-btn admin-btn--sm"
            disabled={busy}
            onClick={() => setStatusFor(id, 'in_review')}
          >
            Move to In Review
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--sm admin-btn--mint"
            disabled={busy}
            onClick={() => setStatusFor(id, 'approved')}
          >
            Approve
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--sm admin-btn--primary"
            disabled={busy}
            onClick={() => setStatusFor(id, 'published')}
          >
            Publish
          </button>
          <button
            type="button"
            className={`admin-btn admin-btn--sm${row.featured ? ' admin-btn--mint' : ''}`}
            disabled={busy}
            onClick={() => toggleFeatured(id, !row.featured)}
            title="Featured questions show in the forum sidebar"
          >
            {row.featured ? '★ Featured' : '☆ Feature'}
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="admin-stat__label" htmlFor={`reject-${id}`}>
            Reject with a reason
          </label>
          <textarea
            id={`reject-${id}`}
            className="admin-textarea"
            rows={2}
            placeholder="Reason for rejection (sent as a note)…"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
          <div className="admin-form-actions" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="admin-btn admin-btn--sm admin-btn--danger"
              disabled={busy || !rejectNote.trim()}
              onClick={() => setStatusFor(id, 'rejected', rejectNote.trim())}
            >
              Reject
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <h3 className="admin-stat__label">Answer</h3>
          <label className="admin-stat__label" htmlFor={`paras-${id}`}>
            Paragraphs (separate with a blank line)
          </label>
          <textarea
            id={`paras-${id}`}
            className="admin-textarea"
            rows={5}
            value={paragraphs}
            onChange={(e) => setParagraphs(e.target.value)}
          />
          <label className="admin-stat__label" htmlFor={`lessons-${id}`} style={{ marginTop: 8 }}>
            Key lessons (one per line)
          </label>
          <textarea
            id={`lessons-${id}`}
            className="admin-textarea"
            rows={4}
            value={lessons}
            onChange={(e) => setLessons(e.target.value)}
          />
          <div className="admin-form-actions" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="admin-btn admin-btn--sm admin-btn--primary"
              disabled={busy}
              onClick={() => saveAnswer(id)}
            >
              Save answer
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="admin-page__head">
        <h2 className="admin-page__title">Moderation queue</h2>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-input"
          placeholder="Search questions…"
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
          <option value="submitted">Submitted</option>
          <option value="in_review">In review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
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
                  Failed to load questions
                </td>
              </tr>
            )}
            {status === 'ready' && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="admin-tablestate">
                  No questions yet.
                </td>
              </tr>
            )}
            {status === 'ready' &&
              rows.map((row) => {
                const id = row._id || row.id;
                return (
                  <Fragment key={id}>
                    <tr onClick={() => openRow(row)} style={{ cursor: 'pointer' }}>
                      <td>{row.title}</td>
                      <td>{row.category || '—'}</td>
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
    </div>
  );
}
