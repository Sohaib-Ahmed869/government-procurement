import { useEffect, useRef, useState } from 'react';
import { capabilitiesApi } from '../../api';
// A5 — the icon set moved to the serviceOffering feature when Capabilities was
// renamed, and became drawn marks rather than PNGs. Same keys, so cards saved
// against the old set still resolve.
import { CAPABILITY_ICONS, CapabilityIcon } from '../../features/serviceOffering/serviceIcons.jsx';
import { SERVICES, SERVICE_BY_KEY } from '../../features/serviceOffering/services.js';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';

const ICON_OPTS = CAPABILITY_ICONS.map((i) => ({ value: i.key, label: i.label }));

// A card is either the copy for one of the six services the brief fixes, or a
// service added beyond them. The blank option is the second case: it appends a
// new service to whichever segment the card is written for.
const SERVICE_OPTS = [
  { value: '', label: 'A new service (not one of the six)' },
  ...SERVICES.map((s) => ({ value: s.key, label: s.title })),
];

// Which side of the site's audience toggle a card is written for, and the
// default. "Both" is one card serving each segment, so a service whose wording
// does not change between them is written once rather than twice.
//
// For the six built-in services this decides which *copy* is used, not whether
// the service is listed: all six appear under both segments either way. For a
// service an editor adds, it decides where the service appears at all.
//
// These cards feed TWO public pages, which is worth knowing before editing one:
// the Service Offering page, and the Win half of How to Engage Us, where each
// card becomes a row with call / email / request-a-consultation on it. The Award
// half of that page is the panels list, edited under Content → How to Engage Us.
const AUDIENCE_OPTS = [
  { value: 'both', label: 'Both segments (one card)' },
  { value: 'win', label: 'Win contracts only' },
  { value: 'award', label: 'Award contracts only' },
];
const AUDIENCE_LABEL = Object.fromEntries(AUDIENCE_OPTS.map((o) => [o.value, o.label]));

const EMPTY = {
  key: '',
  title: '',
  body: '',
  stage: '',
  icon: CAPABILITY_ICONS[0].key,
  audience: 'both',
  order: 0,
  active: true,
};

// The six service cards on the Service Offering page.
//
// Everything the site shows for a service is editable here: its title, the
// stage label over it, the description, the drawn mark the card grids use, and
// the photograph the Service Offering page runs beside the copy. The icon comes
// from a fixed set rather than an upload, so every card is drawn in the same
// style; the photograph is an upload, because it is a photograph.
//
// The six built-in services run in the order the brief fixes for each segment:
// the stages of a procurement on Award, the points a bidder meets them on Win.
// That order lives in services.js and the Order field below does not affect it.
// Order applies to services an editor *adds*, which always follow the six.
export default function ServiceOfferingAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  // The image needs a saved card to attach to, so the picker only appears in
  // edit mode — same as a team member's photo.
  const [imageUrl, setImageUrl] = useState('');
  const [imageBusy, setImageBusy] = useState(false);
  const fileRef = useRef(null);

  const load = () => {
    setStatus('loading');
    capabilitiesApi
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
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setImageUrl('');
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id || row.id);
    setForm({
      key: row.key || '',
      title: row.title || '',
      body: row.body || '',
      stage: row.stage || '',
      icon: row.icon || CAPABILITY_ICONS[0].key,
      audience: row.audience || 'both',
      order: row.order ?? 0,
      active: row.active !== false,
    });
    setImageUrl(row.image?.url || '');
    setSaveError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving || imageBusy) return;
    setDrawerOpen(false);
  };

  const onImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    setImageBusy(true);
    setSaveError(null);
    try {
      const updated = await capabilitiesApi.uploadImage(editingId, file);
      setImageUrl(updated?.image?.url || '');
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to upload the image');
    } finally {
      setImageBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onImageRemove = async () => {
    if (!editingId) return;
    setImageBusy(true);
    setSaveError(null);
    try {
      await capabilitiesApi.removeImage(editingId);
      setImageUrl('');
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to remove the image');
    } finally {
      setImageBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setSaveError('Title is required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const body = {
      key: form.key,
      title: form.title,
      body: form.body,
      stage: form.stage,
      icon: form.icon,
      audience: form.audience,
      order: Number(form.order) || 0,
      active: Boolean(form.active),
    };
    try {
      if (editingId) {
        await capabilitiesApi.update(editingId, body);
        setDrawerOpen(false);
      } else {
        // Stay in the drawer after creating, and switch it to edit mode, so the
        // image can be attached without reopening the card.
        const createdCard = await capabilitiesApi.create(body);
        setEditingId(createdCard?._id || createdCard?.id || null);
        setImageUrl('');
      }
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save this card');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await capabilitiesApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    {
      key: 'key',
      header: 'Service',
      width: 200,
      // A card with no key is an added service, not a broken one — it shows as
      // such rather than as an empty cell.
      render: (r) =>
        SERVICE_BY_KEY[r.key]?.title ?? (
          <span style={{ color: 'var(--admin-muted)' }}>Added service</span>
        ),
    },
    {
      key: 'icon',
      header: 'Icon',
      width: 80,
      // CapabilityIcon falls back to the 'target' mark for a key it doesn't
      // know, so a card saved against a removed icon still draws something.
      render: (r) => (
        <span style={{ display: 'block', lineHeight: 0 }}>
          <CapabilityIcon name={r.icon} size={26} />
        </span>
      ),
    },
    {
      key: 'image',
      header: 'Image',
      width: 90,
      render: (r) =>
        r.image?.url ? (
          <img
            src={r.image.url}
            alt=""
            style={{ display: 'block', width: 56, height: 40, objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          <span style={{ color: 'var(--admin-muted)' }}>Built-in</span>
        ),
    },
    { key: 'title', header: 'Title' },
    {
      key: 'audience',
      header: 'Segment',
      width: 140,
      render: (r) => AUDIENCE_LABEL[r.audience] || AUDIENCE_LABEL.both,
    },
    {
      key: 'body',
      header: 'Description',
      render: (r) => {
        const t = r.body || '';
        return t.length > 80 ? `${t.slice(0, 80)}…` : t || 'No description';
      },
    },
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
      {/* The hero copy editor that used to sit here is gone. The headings on
          that page are fixed by the brief — "Service Offering: Win Contracts"
          and "Service Offering: Award Contracts" — and the eyebrow above them
          was removed, so there was nothing left for it to edit. */}
      <div className="admin-page__head">
        <div className="admin-page__heading">
          <h2 className="admin-page__title">Service Offering</h2>
          <p className="admin-page__subtitle">
            The copy on each of the six services, and any service you add beyond them.
            Use “Both segments” to write a service once and have it serve Win and Award
            together; pick a single segment only where the wording actually differs.
            Added services follow the six, in the order you set.
          </p>
          <p className="admin-page__subtitle">
            These cards appear in two places: the <strong>Service Offering</strong> page,
            and the <strong>Win Contracts</strong> half of{' '}
            <strong>How to Engage Us</strong>, where each becomes a row with call, email
            and request-a-consultation beside it. Editing a card changes both.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New card
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load the service copy' : null}
        emptyText="No copy written yet. The page is showing the six services with their built-in titles."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit card' : 'New card'}
        subtitle={
          editingId ? 'Update this card.' : 'Write the copy for one of the six services.'
        }
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button
              type="button"
              className="admin-btn"
              onClick={closeDrawer}
              disabled={saving || imageBusy}
            >
              {editingId ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              form="capability-form"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create card'}
            </button>
          </>
        }
      >
        <form id="capability-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <FormField
            label="Service"
            name="key"
            as="select"
            options={SERVICE_OPTS}
            value={form.key}
            onChange={onChange}
            hint="Which of the six this card is the copy for."
          />
          <FormField
            label="Title"
            name="title"
            value={form.title}
            onChange={onChange}
            required
            hint="Leave as the service's own name unless this segment calls it something else."
          />
          <FormField
            label="Description"
            name="body"
            as="textarea"
            rows={4}
            value={form.body}
            onChange={onChange}
          />
          <FormField
            label="Stage"
            name="stage"
            value={form.stage}
            onChange={onChange}
            hint="The small label over the title, e.g. “Before market”. The six carry their own unless you set one here."
          />
          <FormField
            label="Icon"
            name="icon"
            as="select"
            options={ICON_OPTS}
            value={form.icon}
            onChange={onChange}
            hint="Shown above the title."
          />
          {/* The photograph beside the copy on the Service Offering page. Not
              used by the card grids — those are drawn marks. */}
          <div className="admin-field">
            <span className="admin-field__label">Image</span>
            {editingId ? (
              <>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt=""
                    style={{
                      display: 'block',
                      width: '100%',
                      maxWidth: 260,
                      aspectRatio: '4 / 3',
                      objectFit: 'cover',
                      borderRadius: 6,
                      marginBottom: 10,
                    }}
                  />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="admin-input"
                  onChange={onImage}
                  disabled={imageBusy}
                />
                <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                  {imageBusy
                    ? 'Working…'
                    : 'Shown beside this service on the Service Offering page. Without one the page uses its built-in photograph for this service.'}
                </p>
                {imageUrl && (
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm"
                    onClick={onImageRemove}
                    disabled={imageBusy}
                  >
                    Remove image
                  </button>
                )}
              </>
            ) : (
              <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                Create the card first, then add its image.
              </p>
            )}
          </div>

          <FormField
            label="Segment"
            name="audience"
            as="select"
            options={AUDIENCE_OPTS}
            value={form.audience}
            onChange={onChange}
            hint="“Both segments” is one card that serves Win and Award together — write the service once. Pick Win or Award only when the wording genuinely differs between them."
          />
          <FormField
            label="Order"
            name="order"
            type="number"
            value={form.order}
            onChange={onChange}
            hint="Only used by added services, which always follow the six. Lowest first."
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
        title="Delete card"
        message="This removes the written copy for that service. The service itself stays on the page, with its built-in title and no description. This can't be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmId(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}
