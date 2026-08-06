import { useEffect, useState } from 'react';
import { capabilitiesApi, capabilitiesHeroApi } from '../../api';
import { CAPABILITY_ICONS, CAPABILITY_ICON_BY_KEY } from '../../features/advisory/capabilityIcons.js';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';
import HeroCopyEditor from '../components/HeroCopyEditor.jsx';

const ICON_OPTS = CAPABILITY_ICONS.map((i) => ({ value: i.key, label: i.label }));

// Which side of the site's audience toggle a card is written for. "Both" is the
// default, and what every card saved before this option existed shows as.
const AUDIENCE_OPTS = [
  { value: 'both', label: 'Both segments' },
  { value: 'win', label: 'Win contracts' },
  { value: 'award', label: 'Award contracts' },
];
const AUDIENCE_LABEL = Object.fromEntries(AUDIENCE_OPTS.map((o) => [o.value, o.label]));

const EMPTY = {
  title: '',
  body: '',
  icon: CAPABILITY_ICONS[0].key,
  audience: 'both',
  order: 0,
  active: true,
};

// The "Deliver with Impact" cards on the Capabilities page. The icon comes from
// a fixed set rather than an upload, so every card is drawn in the same style.
export default function CapabilitiesPage() {
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
      icon: form.icon,
      audience: form.audience,
      order: Number(form.order) || 0,
      active: Boolean(form.active),
    };
    try {
      if (editingId) await capabilitiesApi.update(editingId, body);
      else await capabilitiesApi.create(body);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save capability');
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
    { key: 'order', header: '#', render: (r) => r.order ?? 0, width: 60 },
    {
      key: 'icon',
      header: 'Icon',
      width: 80,
      render: (r) => {
        const icon = CAPABILITY_ICON_BY_KEY[r.icon];
        return icon ? (
          <img src={icon.src} alt="" style={{ display: 'block', width: 26, height: 26 }} />
        ) : (
          '—'
        );
      },
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
        return t.length > 80 ? `${t.slice(0, 80)}…` : t || '—';
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
      {/* The page's hero copy sits with its cards rather than under a sidebar
          entry of its own, so everything on the Capabilities page is edited in
          one place. */}
      <HeroCopyEditor
        title="Capabilities hero"
        subtitle="The eyebrow and heading at the top of the Capabilities page. Each segment has its own copy — pick a tab to edit that version."
        load={() => capabilitiesHeroApi.get()}
        save={(audience, body) => capabilitiesHeroApi.save(audience, body)}
      />

      <div className="admin-page__head" style={{ marginTop: 40 }}>
        <div className="admin-page__heading">
          <h2 className="admin-page__title">Capabilities</h2>
          <p className="admin-page__subtitle">
            The cards under &ldquo;Deliver with Impact&rdquo; on the Capabilities page, in the
            order shown. Each one can be written for Win contracts, for Award contracts, or
            for both.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New capability
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load capabilities' : null}
        emptyText="No capabilities yet — the page is showing its built-in cards."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit capability' : 'New capability'}
        subtitle={
          editingId ? 'Update this card.' : 'Add a card to the Capabilities page.'
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
              form="capability-form"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create capability'}
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
            hint="e.g. Strategy Development"
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
            hint="Which side of the site's Win / Award toggle this card appears under."
          />
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
        title="Delete capability"
        message="This removes the card from the Capabilities page. This can't be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmId(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}
