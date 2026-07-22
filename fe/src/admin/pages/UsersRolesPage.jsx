import { useEffect, useState } from 'react';
import { usersApi } from '../../api';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';

const ROLE_OPTIONS = [
  { value: 'superadmin', label: 'Super admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'moderator', label: 'Moderator' },
];

const BLANK_CREATE = { name: '', email: '', password: '', role: 'editor' };
const BLANK_EDIT = { name: '', role: 'editor', active: 'true', password: '' };

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

// Staff accounts (super-admin only). List users, create new ones inline,
// edit an existing user's role/status/password, and delete.
export default function UsersRolesPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [q, setQ] = useState('');
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Create form.
  const [createForm, setCreateForm] = useState(BLANK_CREATE);
  const [creating, setCreating] = useState(false);

  // Edit state (the user currently being edited; null while creating).
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(BLANK_EDIT);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation.
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setStatus('loading');
    usersApi
      .list({ q, limit: 100 })
      .then((items) => {
        setRows(items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((f) => ({ ...f, [name]: value }));
  };

  const onCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await usersApi.create({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
      });
      setCreateForm(BLANK_CREATE);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const openCreate = () => {
    setError(null);
    setEditId(null);
    setCreateForm(BLANK_CREATE);
    setDrawerOpen(true);
  };

  const openEdit = (user) => {
    setError(null);
    setEditId(user._id || user.id);
    setEditForm({
      name: user.name ?? '',
      role: user.role ?? 'editor',
      active: user.active === false ? 'false' : 'true',
      password: '',
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (creating || savingEdit) return;
    setDrawerOpen(false);
    setEditId(null);
    setEditForm(BLANK_EDIT);
  };

  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  };

  const onSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    setError(null);
    try {
      const body = {
        name: editForm.name,
        role: editForm.role,
        active: editForm.active === 'true',
      };
      if (editForm.password) body.password = editForm.password;
      await usersApi.update(editId, body);
      setDrawerOpen(false);
      setEditId(null);
      setEditForm(BLANK_EDIT);
      load();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await usersApi.remove(confirmId);
      setConfirmId(null);
      load();
    } catch (err) {
      // The API blocks deleting yourself — surface the returned message.
      setError(err.message || 'Failed to delete user');
      setConfirmId(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (r) => <StatusBadge status={r.role} /> },
    {
      key: 'active',
      header: 'Active',
      render: (r) => <StatusBadge status={r.active === false ? 'inactive' : 'active'} />,
    },
    { key: 'lastLoginAt', header: 'Last login', render: (r) => formatDate(r.lastLoginAt) },
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
          <h2 className="admin-page__title">Users &amp; roles</h2>
          <p className="admin-page__subtitle">Staff accounts and their access levels.</p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New user
          </button>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      <div className="admin-toolbar">
        <input
          className="admin-input"
          placeholder="Search users…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 280 }}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load users' : null}
        emptyText="No users yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editId ? 'Edit user' : 'New user'}
        subtitle={editId ? "Update this user's role, status or password." : 'Create a staff account with a role.'}
        onClose={closeDrawer}
        busy={creating || savingEdit}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDrawer} disabled={creating || savingEdit}>
              Cancel
            </button>
            <button type="submit" form="user-form" className="admin-btn admin-btn--primary" disabled={creating || savingEdit}>
              {editId
                ? savingEdit ? 'Saving…' : 'Save changes'
                : creating ? 'Creating…' : 'Create user'}
            </button>
          </>
        }
      >
        {editId ? (
          <form id="user-form" onSubmit={onSaveEdit}>
            <FormField label="Name" name="name" value={editForm.name} onChange={onEditChange} />
            <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <FormField
                label="Role"
                name="role"
                as="select"
                value={editForm.role}
                onChange={onEditChange}
                options={ROLE_OPTIONS}
              />
              <FormField
                label="Active"
                name="active"
                as="select"
                value={editForm.active}
                onChange={onEditChange}
                options={[
                  { value: 'true', label: 'Active' },
                  { value: 'false', label: 'Inactive' },
                ]}
              />
            </div>
            <FormField
              label="New password"
              name="password"
              type="password"
              hint="leave blank to keep"
              value={editForm.password}
              onChange={onEditChange}
            />
          </form>
        ) : (
          <form id="user-form" onSubmit={onCreate}>
            <FormField label="Name" name="name" value={createForm.name} onChange={onCreateChange} required />
            <FormField label="Email" name="email" type="email" value={createForm.email} onChange={onCreateChange} required />
            <FormField label="Password" name="password" type="password" value={createForm.password} onChange={onCreateChange} required />
            <FormField
              label="Role"
              name="role"
              as="select"
              value={createForm.role}
              onChange={onCreateChange}
              options={ROLE_OPTIONS}
            />
          </form>
        )}
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        message="Delete this user? This cannot be undone."
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
        busy={deleting}
      />
    </div>
  );
}
