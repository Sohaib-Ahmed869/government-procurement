import { useEffect, useState } from 'react';
import { capabilitiesApi } from '../../api';
// A5 — the icon set moved to the serviceOffering feature when Capabilities was
// renamed, and became drawn marks rather than PNGs. Same keys, so cards saved
// against the old set still resolve.
import { CAPABILITY_ICONS, CapabilityIcon } from '../../features/serviceOffering/serviceIcons.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';

const ICON_OPTS = CAPABILITY_ICONS.map((i) => ({ value: i.key, label: i.label }));

// Which side of the site's audience toggle a card is written for, and the
// default. "Both" is one card serving each segment, so a service whose wording
// does not change between them is written once rather than twice.
//
// This decides where the service appears at all. Win and Award do not list the
// same services, or the same NUMBER of them, so a card written for one segment
// is absent from the other — which is what "Both segments" is for on the ones
// that genuinely are shared.
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
  title: '',
  body: '',
  stage: '',
  icon: CAPABILITY_ICONS[0].key,
  audience: 'both',
  order: 0,
  active: true,
};

// The service cards on the Service Offering page.
//
// Every service the site shows is one of these — there is no built-in set behind
// them any more, and no "which of the six is this" to answer. A card carries its
// own title, the stage label over it, the description, the drawn mark the card
// grids use, and the segment it belongs to. The icon comes from a fixed set
// rather than an upload, so every card is drawn in the same style.
//
// Order is what the page runs on, for every card rather than only for the ones
// added past a fixed six: lowest first, ties falling back to the order the cards
// were created in.
export default function ServiceOfferingAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

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
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id || row.id);
    setForm({
      title: row.title || '',
      body: row.body || '',
      stage: row.stage || '',
      icon: row.icon || CAPABILITY_ICONS[0].key,
      audience: row.audience || 'both',
      order: row.order ?? 0,
      active: row.active !== false,
    });
    setSaveError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
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
        // card can be adjusted without reopening it.
        const createdCard = await capabilitiesApi.create(body);
        setEditingId(createdCard?._id || createdCard?.id || null);
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
            Every service on the page. Win and Award list different services, and
            different numbers of them, so a card belongs to the segment you write it
            for — use “Both segments” only for a service that genuinely reads the same
            under each. The page runs them in the order you set, lowest first.
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
        emptyText="No services yet. The Service Offering page is empty until you add one."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit card' : 'New card'}
        subtitle={
          editingId ? 'Update this service.' : 'Add a service to the Service Offering page.'
        }
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button
              type="button"
              className="admin-btn"
              onClick={closeDrawer}
              disabled={saving}
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
            label="Title"
            name="title"
            value={form.title}
            onChange={onChange}
            required
            hint="The service's name, as it appears on the page."
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
            hint="The small label over the title, e.g. “Before market”. Optional."
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
            hint="Position on the page. Lowest first; cards left on the same number keep the order you created them in."
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
