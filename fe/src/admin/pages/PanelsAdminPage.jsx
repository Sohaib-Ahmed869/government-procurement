import { useEffect, useMemo, useState } from 'react';
import { panelsApi } from '../../api';
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
  group: '',
  groupOrder: 0,
  agency: '',
  name: '',
  reference: '',
  sourceUrl: '',
  order: 0,
  status: 'published',
};

// B2 — the panels on /government-panels.
//
// The page is a credentials list: each row says a client can engage us through
// that arrangement. So this screen is deliberately plain — there is no category
// or "taking new suppliers" here, because neither means anything about a panel
// we already hold.
//
// `group` is free text so a council can have its own heading, which leaves one
// risk worth designing against: a typo makes a second heading rather than an
// error. The field is backed by a datalist of the headings already in use, so
// picking an existing one is a click and only a genuinely new heading is typed.
export default function PanelsAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [groupFilter, setGroupFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  // Every heading in use, for the filter and the datalist. Taken from all rows
  // rather than from the filtered view, so filtering to one heading doesn't
  // shrink the list of headings you can move an entry to.
  const [allGroups, setAllGroups] = useState([]);

  const load = () => {
    setStatus('loading');
    panelsApi
      .list(groupFilter !== 'all' ? { group: groupFilter } : undefined)
      .then((items) => {
        setRows(items || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [groupFilter]);

  useEffect(() => {
    panelsApi
      .list()
      .then((items) => {
        const seen = [...new Set((items || []).map((i) => i.group).filter(Boolean))];
        setAllGroups(seen.sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {
        /* the filter falls back to "all"; the datalist is simply empty */
      });
  }, [rows.length]);

  // Suggests the next heading position, so an editor adding a brand new group
  // doesn't have to look up what the last one used.
  const nextGroupOrder = useMemo(() => {
    const orders = rows.map((r) => Number(r.groupOrder) || 0);
    return orders.length ? Math.max(...orders) + 10 : 10;
  }, [rows]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY, groupOrder: nextGroupOrder });
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id || row.id);
    setForm({
      group: row.group || '',
      groupOrder: row.groupOrder ?? 0,
      agency: row.agency || '',
      name: row.name || '',
      reference: row.reference || '',
      sourceUrl: row.sourceUrl || '',
      order: row.order ?? 0,
      status: row.status || 'published',
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
    if (!form.group.trim()) {
      setSaveError('Heading is required. It is what the entry is listed under.');
      return;
    }
    if (!form.name.trim()) {
      setSaveError('Panel name is required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const body = {
      group: form.group.trim(),
      groupOrder: Number(form.groupOrder) || 0,
      agency: form.agency,
      name: form.name,
      reference: form.reference,
      sourceUrl: form.sourceUrl,
      order: Number(form.order) || 0,
      status: form.status,
    };
    try {
      if (editingId) await panelsApi.update(editingId, body);
      else await panelsApi.create(body);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save this panel');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await panelsApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    { key: 'group', header: 'Heading', width: 220 },
    {
      key: 'name',
      header: 'Panel',
      // Rendered as the site renders it, so the table is a preview of the page
      // rather than a set of fields to assemble in your head.
      render: (r) => (
        <>
          {r.agency && <span style={{ color: 'var(--admin-muted)' }}>{r.agency} – </span>}
          {r.name}
          {r.reference && (
            <span style={{ color: 'var(--admin-muted)' }}> ({r.reference})</span>
          )}
        </>
      ),
    },
    {
      key: 'sourceUrl',
      header: 'Link',
      width: 90,
      render: (r) =>
        r.sourceUrl ? 'Linked' : <span style={{ color: 'var(--admin-muted)' }}>—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      render: (r) => <StatusBadge status={r.status} />,
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
          <h2 className="admin-page__title">How to Engage Us — Award</h2>
          <p className="admin-page__subtitle">
            The panels and prequalification schemes we can be engaged through, listed on the
            <strong> How to Engage Us</strong> page when the visitor is on{' '}
            <strong>Award Contracts</strong>. Each entry says a client can appoint us under
            that arrangement, so only add one we actually hold. Published entries are live
            immediately; drafts are visible on the page to you and to nobody else.
          </p>
          <p className="admin-page__subtitle">
            The <strong>Win Contracts</strong> side of the same page shows services and how
            to start one, not panels — a supplier cannot engage us through a panel, because
            a panel is how government buys. That half is edited under{' '}
            <strong>Content → Service Offering</strong>: any card tagged “Win contracts
            only” or “Both segments” appears there.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New panel
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <select
          className="admin-select"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          aria-label="Filter by heading"
          style={{ maxWidth: 260 }}
        >
          <option value="all">All headings</option>
          {allGroups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load the panels' : null}
        emptyText="No panels listed yet. Add the arrangements we hold an appointment on."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit panel' : 'New panel'}
        subtitle={
          editingId
            ? 'Update this panel appointment.'
            : 'Add a panel or scheme we can be engaged through.'
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
              form="panel-form"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create panel'}
            </button>
          </>
        }
      >
        <form id="panel-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <FormField
            label="Heading"
            name="group"
            value={form.group}
            onChange={onChange}
            required
            list="panel-groups"
            hint="The heading this sits under, e.g. “Victorian Government” or “Toowoomba Regional Council”. Pick an existing one from the list. A new spelling makes a new heading."
          />
          {/* Backed by what is already in use, so the common case is a click and
              only a genuinely new heading gets typed. */}
          <datalist id="panel-groups">
            {allGroups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>

          <FormField
            label="Heading position"
            name="groupOrder"
            type="number"
            value={form.groupOrder}
            onChange={onChange}
            hint="Where the heading sits on the page. Use the same number on every entry under it; lowest wins."
          />
          <FormField
            label="Agency"
            name="agency"
            value={form.agency}
            onChange={onChange}
            hint="Who runs the panel, e.g. “Australian Federal Police”. Printed before the panel name. Leave blank if the name stands alone."
          />
          <FormField
            label="Panel name"
            name="name"
            value={form.name}
            onChange={onChange}
            required
            hint="The official name, e.g. “Capability Support Services Panel”."
          />
          <FormField
            label="Reference number"
            name="reference"
            value={form.reference}
            onChange={onChange}
            hint="The panel or contract number, e.g. “SON 3538332”. Shown in brackets. This is what a client quotes to buy through it."
          />
          <FormField
            label="Official URL"
            name="sourceUrl"
            value={form.sourceUrl}
            onChange={onChange}
            hint="Optional. With one the row becomes a link; without one it stays plain text rather than a link that goes nowhere."
          />
          <FormField
            label="Position within heading"
            name="order"
            type="number"
            value={form.order}
            onChange={onChange}
            hint="Lowest first; ties fall back to the panel name."
          />
          <FormField
            label="Status"
            name="status"
            as="select"
            options={STATUS_OPTS}
            value={form.status}
            onChange={onChange}
            hint="Only Published entries are visible to the public."
          />
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete panel"
        message="Delete this panel? It disappears from the How to Engage Us page (Award). This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
