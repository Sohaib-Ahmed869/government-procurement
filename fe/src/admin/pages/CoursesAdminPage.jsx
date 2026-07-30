import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { coursesApi } from '../../api';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

// Level and category labels, matching the filters on the public courses page.
const LEVEL_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
const CATEGORY_LABEL = {
  general: 'General',
  award: 'Award Contracts',
  win: 'Win Contracts',
};
const TYPE_LABEL = {
  courses: 'Course',
  artefacts: 'Artefact',
  bundles: 'Bundle',
};

// LIST screen for courses, artefacts and bundles.
export default function CoursesAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setStatus('loading');
    coursesApi
      .list({
        q,
        limit: 100,
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      })
      .then((items) => {
        setRows(items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [q, statusFilter]);

  const onDelete = async () => {
    setBusy(true);
    try {
      await coursesApi.remove(confirmId);
      setConfirmId(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'title', header: 'Title' },
    {
      key: 'resourceType',
      header: 'Type',
      // Homepage slots are capped per type (4 courses, 2 artefacts), so the star
      // has to sit next to the type for the count to mean anything.
      render: (r) => (
        <span className="admin-cell-inline">
          {TYPE_LABEL[r.resourceType] || '—'}
          {r.featured && (
            <span className="admin-libcard__star" title="Featured on homepage">
              ★
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      // levelLabel is the free-text display chip; fall back to the enum.
      render: (r) => r.levelLabel || LEVEL_LABEL[r.level] || '—',
    },
    {
      key: 'segment',
      header: 'Category',
      render: (r) => CATEGORY_LABEL[r.segment] || '—',
    },
    {
      key: 'availability',
      header: 'Availability',
      render: (r) => <StatusBadge status={r.availability} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (r) =>
        r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '—',
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="admin-table__actions">
          <Link className="admin-btn admin-btn--sm" to={`${r._id}`}>
            Edit
          </Link>
          <button
            type="button"
            className="admin-btn admin-btn--sm admin-btn--danger"
            onClick={() => setConfirmId(r._id)}
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
        <h2 className="admin-page__title">Courses &amp; resources</h2>
        <div className="admin-page__actions">
          <Link className="admin-btn admin-btn--primary" to="new">
            New resource
          </Link>
        </div>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-input"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          style={{ maxWidth: 190 }}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load courses' : null}
        emptyText="No courses yet."
      />

      <ConfirmDialog
        open={Boolean(confirmId)}
        message="Delete this course? This cannot be undone."
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
        busy={busy}
      />
    </div>
  );
}
