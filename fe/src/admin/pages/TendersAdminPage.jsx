import { useEffect, useRef, useState } from 'react';
import { tenderSitesApi } from '../../api';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';

// Which of the three lists on the Tender Websites page an entry is shown in,
// in the order the page renders them. Kept in step with TENDER_SITE_GROUPS in
// be/src/models/TenderSite.js, which is what the API validates against.
const GROUPS = [
  { value: 'australian', label: 'Federal, State and Territory' },
  { value: 'local', label: 'Local Government' },
  { value: 'other', label: 'Other tender website' },
];

// Note on the branching below: each section carries its own destinations, so
// the form and the save payload both switch on `group`.
//
//   australian  three links (open / upcoming / account) + the login tick
//   local       one link, the council's own website
//   other       one paid sign-in link + the disclaimer note
//
// 'local' stores its single link in `openTendersUrl`, which is the field those
// entries already hold their address in — so switching the section over needed
// no migration and no new column on the model.

// Short labels for the table, where the full option text is too long.
const GROUP_LABEL = {
  australian: 'Federal/State',
  local: 'Local Gov',
  other: 'Other',
};

// Prefilled the first time an entry is filed under "Other", since every one of
// them needs the same disclaimer. It stays editable — the operator's name in it
// has to match the site being linked.
const DEFAULT_NOTE =
  'Government Procurement has no affiliation with, and receives no commission ' +
  'or benefit from VendorPanel. All access fees are set solely by VendorPanel';

const EMPTY = {
  name: '',
  subtitle: '',
  group: 'australian',
  openTendersUrl: '',
  upcomingTendersUrl: '',
  createAccountUrl: '',
  loginUrl: '',
  note: '',
  loginRequired: false,
  order: 0,
  active: true,
};

// Tender portals listed on the Tender Websites page. Each entry is one
// jurisdiction's site: its name, who runs it, up to three destinations and a
// logo. These replaced the tender entries that used to sit in Links.
export default function TendersAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  // The logo needs an existing record to attach to, so the picker only shows
  // while editing.
  const [logoUrl, setLogoUrl] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef(null);

  const load = () => {
    setStatus('loading');
    tenderSitesApi
      .list({ all: 1 })
      .then((items) => {
        setRows(items || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: type === 'checkbox' ? checked : value };
      // Switching to "Other" brings the standard disclaimer with it, unless a
      // note has already been written.
      if (name === 'group' && value === 'other' && !f.note.trim()) {
        next.note = DEFAULT_NOTE;
      }
      return next;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setLogoUrl('');
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id || row.id);
    setForm({
      name: row.name || '',
      subtitle: row.subtitle || '',
      group: row.group || 'australian',
      openTendersUrl: row.openTendersUrl || '',
      upcomingTendersUrl: row.upcomingTendersUrl || '',
      createAccountUrl: row.createAccountUrl || '',
      loginUrl: row.loginUrl || '',
      note: row.note || '',
      loginRequired: Boolean(row.loginRequired),
      order: row.order ?? 0,
      active: row.active !== false,
    });
    setLogoUrl(row.logo?.url || '');
    setSaveError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setSaveError('Name is required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const group = form.group || 'australian';
    const body = {
      name: form.name,
      subtitle: form.subtitle,
      group,
      order: Number(form.order) || 0,
      active: Boolean(form.active),
      // Only the selected section's fields are kept, so an entry moved between
      // sections doesn't hold on to links the page no longer draws.
      ...(group === 'other'
        ? {
            loginUrl: form.loginUrl,
            note: form.note,
            loginRequired: false,
            openTendersUrl: '',
            upcomingTendersUrl: '',
            createAccountUrl: '',
          }
        : group === 'local'
          ? {
              // The council's website, in the field the page reads for it.
              openTendersUrl: form.openTendersUrl,
              upcomingTendersUrl: '',
              createAccountUrl: '',
              loginRequired: false,
              loginUrl: '',
              note: '',
            }
          : {
              openTendersUrl: form.openTendersUrl,
              upcomingTendersUrl: form.upcomingTendersUrl,
              createAccountUrl: form.createAccountUrl,
              loginRequired: Boolean(form.loginRequired),
              loginUrl: '',
              note: '',
            }),
    };
    try {
      if (editingId) {
        await tenderSitesApi.update(editingId, body);
      } else {
        // Creating first gives the logo a record to attach to — the picker
        // appears once the drawer reopens on the saved entry.
        const site = await tenderSitesApi.create(body);
        setEditingId(site?._id || site?.id || null);
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save tender site');
    } finally {
      setSaving(false);
    }
  };

  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    setLogoBusy(true);
    setSaveError(null);
    try {
      const updated = await tenderSitesApi.uploadLogo(editingId, file);
      setLogoUrl(updated?.logo?.url || '');
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to upload logo');
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDelete = async () => {
    await tenderSitesApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  // A tick per destination that's filled in, so the table shows at a glance
  // which entries are still missing a link.
  const linkSummary = (r) =>
    (r.group === 'other'
      ? [r.loginUrl ? 'Login' : null]
      : r.group === 'local'
        ? [r.openTendersUrl ? 'Website' : null]
        : [
            r.openTendersUrl ? 'Open' : null,
            r.upcomingTendersUrl ? 'Upcoming' : null,
            r.createAccountUrl ? 'Account' : null,
          ]
    )
      .filter(Boolean)
      .join(', ') || '—';

  const columns = [
    { key: 'order', header: '#', render: (r) => r.order ?? 0, width: 60 },
    {
      key: 'logo',
      header: 'Logo',
      width: 80,
      render: (r) =>
        r.logo?.url ? (
          <img
            src={r.logo.url}
            alt=""
            style={{ display: 'block', width: 40, height: 40, objectFit: 'contain' }}
          />
        ) : (
          '—'
        ),
    },
    { key: 'name', header: 'Name' },
    { key: 'subtitle', header: 'Subtitle', render: (r) => r.subtitle || '—' },
    {
      key: 'group',
      header: 'Section',
      width: 120,
      render: (r) => GROUP_LABEL[r.group] || GROUP_LABEL.australian,
    },
    { key: 'links', header: 'Links', render: linkSummary },
    {
      key: 'active',
      header: 'Status',
      render: (r) => <StatusBadge status={r.active !== false ? 'published' : 'draft'} />,
      width: 120,
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
          <h2 className="admin-page__title">Tender Websites</h2>
          <p className="admin-page__subtitle">
            The portals listed on the Tender Websites page, in the order shown.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New tender site
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load tender sites' : null}
        emptyText="No tender sites yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit tender site' : 'New tender site'}
        subtitle={
          editingId
            ? 'Update this portal.'
            : 'Add a portal to the Tender Websites page. Save it, then reopen to add the logo.'
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
              form="tender-form"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create tender site'}
            </button>
          </>
        }
      >
        <form id="tender-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <FormField
            label="Name"
            name="name"
            value={form.name}
            onChange={onChange}
            required
            hint="e.g. Buy.NSW"
          />
          <FormField
            label="Subtitle"
            name="subtitle"
            value={form.subtitle}
            onChange={onChange}
            hint="e.g. NSW State Government"
          />
          <FormField
            label="Section"
            name="group"
            as="select"
            value={form.group}
            onChange={onChange}
            options={GROUPS}
            hint="Which list on the Tender Websites page this appears under."
          />
          {/* Each section lists different destinations, so each shows only its
              own links. */}
          {form.group === 'other' ? (
            <>
              <FormField
                label="Login (Paid wall)"
                name="loginUrl"
                value={form.loginUrl}
                onChange={onChange}
                hint="Link to the paid sign-in. Leave empty to hide the button."
              />
              <FormField
                label="Note"
                name="note"
                as="textarea"
                rows={3}
                value={form.note}
                onChange={onChange}
                hint="Printed under the Login button. Name the operator this entry links to."
              />
            </>
          ) : form.group === 'local' ? (
            /* One destination, not three. A council has a website; it does not
               run a forecast pipeline or a supplier registration of its own, so
               the other two fields were always left blank on these entries and
               drew nothing on the card. */
            <FormField
              label="Website Link"
              name="openTendersUrl"
              value={form.openTendersUrl}
              onChange={onChange}
              hint="Link to the council's own tenders page. Leave empty to hide the button."
            />
          ) : (
            <>
              <FormField
                label="Open Tenders"
                name="openTendersUrl"
                value={form.openTendersUrl}
                onChange={onChange}
                hint="Link to the portal's open tender search. Leave empty to hide the button."
              />
              <FormField
                label="Upcoming Tenders"
                name="upcomingTendersUrl"
                value={form.upcomingTendersUrl}
                onChange={onChange}
                hint="Link to forecast or upcoming notices. Leave empty to hide the button."
              />
              <FormField
                label="Create Free Account"
                name="createAccountUrl"
                value={form.createAccountUrl}
                onChange={onChange}
                hint="Link to registration or sign-in. Leave empty to hide the button."
              />

              <div className="admin-field">
                <div className="admin-checkgroup">
                  <label className="admin-checkgroup__item">
                    <input
                      type="checkbox"
                      name="loginRequired"
                      checked={Boolean(form.loginRequired)}
                      onChange={onChange}
                    />
                    <span>Listings need a sign-in</span>
                  </label>
                </div>
                <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                  Adds &ldquo;(Login Required)&rdquo; to the Open and Upcoming
                  Tenders buttons, so nobody clicks through into a sign-in wall
                  unaware. Tick it only for a portal whose listings genuinely
                  cannot be searched without an account &mdash; today that is
                  South Australia alone. Every other jurisdiction links straight
                  through and must be left unticked.
                </p>
              </div>
            </>
          )}

          <div className="admin-field">
            <span className="admin-field__label">Logo</span>
            {editingId ? (
              <>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt=""
                    style={{
                      display: 'block',
                      width: 120,
                      height: 60,
                      objectFit: 'contain',
                      marginBottom: 10,
                    }}
                  />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="admin-input"
                  onChange={onLogo}
                  disabled={logoBusy}
                />
                <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                  {logoBusy
                    ? 'Uploading…'
                    : 'Use the version that sits best on a dark background. Without one the card shows the name alone.'}
                </p>
              </>
            ) : (
              <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                Create the tender site first, then add a logo.
              </p>
            )}
          </div>

          <FormField
            label="Order"
            name="order"
            type="number"
            value={form.order}
            onChange={onChange}
            hint="Lowest first."
          />

          <div className="admin-field">
            <div className="admin-checkgroup">
              <label className="admin-checkgroup__item">
                <input
                  type="checkbox"
                  name="active"
                  checked={Boolean(form.active)}
                  onChange={onChange}
                />
                <span>Shown on the site</span>
              </label>
            </div>
          </div>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete tender site"
        message="This removes it from the Tender Websites page. This can't be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmId(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}
