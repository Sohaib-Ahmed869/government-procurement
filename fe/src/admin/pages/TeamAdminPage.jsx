import { useEffect, useRef, useState } from 'react';
import { teamApi } from '../../api';
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

const EMPTY = {
  name: '',
  role: '',
  location: '',
  email: '',
  linkedin: '',
  summary: '',
  about: '',
  expertise: '',
  pastExperience: '',
  education: '',
  hasProfile: false,
  order: 0,
  status: 'published',
};

// Team members shown on /our-team. Every member gets a card; only those with
// "Opens a profile page" ticked also get a /our-team/<slug> page, which is where
// the About and Expertise fields appear — hence those two are hidden otherwise.
export default function TeamAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  // The photo needs an existing record to attach to, so the picker only shows
  // while editing.
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef(null);

  const load = () => {
    setStatus('loading');
    teamApi
      .list()
      .then((items) => {
        setRows(items || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setPhotoUrl('');
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id || row.id);
    setForm({
      name: row.name || '',
      role: row.role || '',
      location: row.location || '',
      email: row.email || '',
      linkedin: row.linkedin || '',
      summary: row.summary || '',
      // Stored as arrays; edited as one entry per line.
      about: (row.about || []).join('\n'),
      expertise: (row.expertise || []).join('\n'),
      // Stored as { org, role } / { school, qualification }; edited as
      // "left | right", one per line.
      pastExperience: (row.pastExperience || [])
        .map((e) => [e.org, e.role].filter(Boolean).join(' | '))
        .join('\n'),
      education: (row.education || [])
        .map((e) => [e.school, e.qualification].filter(Boolean).join(' | '))
        .join('\n'),
      hasProfile: Boolean(row.hasProfile),
      order: row.order ?? 0,
      status: row.status || 'published',
    });
    setPhotoUrl(row.photo?.url || '');
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
      name: form.name,
      role: form.role,
      location: form.location,
      email: form.email,
      linkedin: form.linkedin,
      summary: form.summary,
      about: form.about,
      expertise: form.expertise,
      pastExperience: form.pastExperience,
      education: form.education,
      hasProfile: form.hasProfile,
      order: Number(form.order) || 0,
      status: form.status,
    };
    try {
      if (editingId) {
        await teamApi.update(editingId, body);
        setDrawerOpen(false);
      } else {
        // Stay in the drawer after creating so the photo can be attached.
        const createdMember = await teamApi.create(body);
        setEditingId(createdMember?._id || createdMember?.id || null);
      }
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save team member');
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    setPhotoBusy(true);
    setSaveError(null);
    try {
      const updated = await teamApi.uploadPhoto(editingId, file);
      setPhotoUrl(updated?.photo?.url || '');
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to upload photo');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDelete = async () => {
    await teamApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    { key: 'order', header: '#', render: (r) => r.order ?? 0, width: 60 },
    { key: 'name', header: 'Name' },
    {
      key: 'role',
      header: 'Role',
      render: (r) => [r.role, r.location].filter(Boolean).join(', ') || '—',
    },
    {
      key: 'hasProfile',
      header: 'Profile page',
      render: (r) => (r.hasProfile ? 'Yes' : '—'),
      width: 120,
    },
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
          <h2 className="admin-page__title">Meeting the Team</h2>
          <p className="admin-page__subtitle">
            People shown on the Meeting the Team page, in the order set below.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New team member
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load team members' : null}
        emptyText="No team members yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit team member' : 'New team member'}
        subtitle={
          editingId
            ? 'Update this person’s card, photo and profile.'
            : 'Add a person to the Meeting the Team page. Save first, then add their photo.'
        }
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDrawer} disabled={saving}>
              {editingId ? 'Close' : 'Cancel'}
            </button>
            <button type="submit" form="team-form" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create member'}
            </button>
          </>
        }
      >
        <form id="team-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <FormField label="Name" name="name" value={form.name} onChange={onChange} required />
          <FormField
            label="Role"
            name="role"
            value={form.role}
            onChange={onChange}
            hint="Shown on the card as “Role, Location”."
          />
          <FormField label="Location" name="location" value={form.location} onChange={onChange} />
          <FormField
            label="Card bio"
            name="summary"
            as="textarea"
            rows={4}
            value={form.summary}
            onChange={onChange}
            hint="The short paragraph on the card."
          />

          <FormField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            hint="Used by the mail button on the card."
          />
          <FormField
            label="LinkedIn URL"
            name="linkedin"
            value={form.linkedin}
            onChange={onChange}
          />

          {/* Photo needs a saved record to attach to. */}
          <div className="admin-field">
            <span className="admin-field__label">Photo</span>
            {editingId ? (
              <>
                {photoUrl && (
                  <img
                    src={photoUrl}
                    alt=""
                    style={{
                      display: 'block',
                      width: 96,
                      height: 96,
                      objectFit: 'cover',
                      borderRadius: '50%',
                      marginBottom: 10,
                    }}
                  />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="admin-input"
                  onChange={onPhoto}
                  disabled={photoBusy}
                />
                <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                  {photoBusy ? 'Uploading…' : 'Without a photo the card shows the person’s initials.'}
                </p>
              </>
            ) : (
              <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                Create the member first, then add a photo.
              </p>
            )}
          </div>

          <div className="admin-field">
            <div className="admin-checkgroup">
              <label className="admin-checkgroup__item">
                <input
                  type="checkbox"
                  name="hasProfile"
                  checked={form.hasProfile}
                  onChange={onChange}
                />
                <span>Opens a profile page</span>
              </label>
            </div>
            <p className="admin-field__hint" style={{ marginLeft: 0 }}>
              With this on, the card links to its own page and the two fields below are shown there.
              Leave it off and the card isn’t clickable.
            </p>
          </div>

          {form.hasProfile && (
            <>
              <FormField
                label="About"
                name="about"
                as="textarea"
                rows={8}
                value={form.about}
                onChange={onChange}
                hint="Profile page only. One paragraph per line."
              />
              <FormField
                label="Expertise"
                name="expertise"
                as="textarea"
                rows={5}
                value={form.expertise}
                onChange={onChange}
                hint="Profile page only. One item per line."
              />
              <FormField
                label="Past experience"
                name="pastExperience"
                as="textarea"
                rows={4}
                value={form.pastExperience}
                onChange={onChange}
                hint={'Optional. One role per line, as "Organisation | Role". Leave empty to hide the section.'}
              />
              <FormField
                label="Education"
                name="education"
                as="textarea"
                rows={4}
                value={form.education}
                onChange={onChange}
                hint={'Optional. One entry per line, as "Institution | Qualification". Leave empty to hide the section.'}
              />
            </>
          )}

          <FormField
            label="Order"
            name="order"
            type="number"
            value={form.order}
            onChange={onChange}
            hint="Lowest first."
          />
          <FormField
            label="Status"
            name="status"
            as="select"
            options={STATUS_OPTS}
            value={form.status}
            onChange={onChange}
          />
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete team member"
        message="Delete this team member? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
