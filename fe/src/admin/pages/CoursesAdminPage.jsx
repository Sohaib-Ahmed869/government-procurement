import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { coursesApi } from '../../api';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

// Resource types share the Course collection, distinguished by resourceType.
const TYPE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'courses', label: 'Courses' },
  { value: 'artefacts', label: 'Artefacts' },
  { value: 'bundles', label: 'Bundles' },
];
const TYPE_LABEL = { courses: 'Course', artefacts: 'Artefact', bundles: 'Bundle' };
// Singular label used on the "New …" button per active tab.
const NEW_LABEL = { all: 'resource', courses: 'course', artefacts: 'artefact', bundles: 'bundle' };

// LIST screen for courses, artefacts and bundles.
export default function CoursesAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setStatus('loading');
    coursesApi
      .list({ q, limit: 100, ...(type !== 'all' ? { resourceType: type } : {}) })
      .then((items) => {
        setRows(items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [q, type]);

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
      render: (r) => TYPE_LABEL[r.resourceType] || 'Course',
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
          <Link
            className="admin-btn admin-btn--primary"
            to={`new${type !== 'all' ? `?type=${type}` : ''}`}
          >
            New {NEW_LABEL[type]}
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
        <div className="admin-tabs" role="tablist" aria-label="Resource type">
          {TYPE_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={type === t.value}
              className={`admin-tab${type === t.value ? ' is-active' : ''}`}
              onClick={() => setType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load courses' : null}
        emptyText={type === 'all' ? 'No courses yet.' : `No ${type} yet.`}
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
