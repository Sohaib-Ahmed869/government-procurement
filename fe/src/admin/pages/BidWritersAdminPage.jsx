import { useEffect, useRef, useState } from 'react';
import { bidWritersApi } from '../../api';
import {
  CATEGORIES,
  CATEGORY_BY_VALUE,
  STATES,
  STATE_BY_VALUE,
  STATE_OPTIONS,
  TIER_OPTIONS,
} from '../../features/bidWriters/data.js';
import { BID_WRITERS } from '../../config/features.js';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';

const EMPTY = {
  company: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  officeState: STATES[0].value,
  officeCity: '',
  categories: [],
  blurb: '',
  placementTier: 'standard',
  active: false,
  notes: '',
  order: 0,
};

// B7.6 — the directory's management screen.
//
// This screen is NOT feature-flagged. Listings have to be prepared, and paid
// for, before the page goes live, which is the whole reason the page is held
// back — so the CMS side works at every flag setting. What the banner at the
// top does is make sure nobody edits here believing the public can see it.
export default function BidWritersAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef(null);

  const load = () => {
    setStatus('loading');
    bidWritersApi
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

  const toggleCategory = (value) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(value)
        ? f.categories.filter((c) => c !== value)
        : [...f.categories, value],
    }));
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
      company: row.company || '',
      contactName: row.contactName || '',
      contactEmail: row.contactEmail || '',
      contactPhone: row.contactPhone || '',
      website: row.website || '',
      officeState: row.officeState || STATES[0].value,
      officeCity: row.officeCity || '',
      categories: row.categories || [],
      blurb: row.blurb || '',
      placementTier: row.placementTier || 'standard',
      active: Boolean(row.active),
      notes: row.notes || '',
      order: row.order ?? 0,
    });
    setLogoUrl(row.logo?.url || '');
    setSaveError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving || logoBusy) return;
    setDrawerOpen(false);
  };

  const onLogo = async (e) => {
    const picked = e.target.files?.[0];
    if (!picked || !editingId) return;
    setLogoBusy(true);
    setSaveError(null);
    try {
      const updated = await bidWritersApi.uploadLogo(editingId, picked);
      setLogoUrl(updated?.logo?.url || '');
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to upload the logo');
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim()) return setSaveError('Company is required.');

    setSaving(true);
    setSaveError(null);
    const body = { ...form, order: Number(form.order) || 0, active: Boolean(form.active) };
    try {
      if (editingId) {
        await bidWritersApi.update(editingId, body);
        setDrawerOpen(false);
      } else {
        // Stay open in edit mode so the logo can be attached without reopening.
        const createdRow = await bidWritersApi.create(body);
        setEditingId(createdRow?._id || createdRow?.id || null);
        setLogoUrl('');
      }
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save this listing');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await bidWritersApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    {
      key: 'logo',
      header: 'Logo',
      width: 70,
      render: (r) =>
        r.logo?.url ? (
          <img src={r.logo.url} alt="" style={{ display: 'block', width: 36, height: 36, objectFit: 'contain' }} />
        ) : (
          <span style={{ color: 'var(--admin-muted)' }}>—</span>
        ),
    },
    { key: 'company', header: 'Company' },
    {
      key: 'officeState',
      header: 'Office',
      width: 180,
      render: (r) => [r.officeCity, STATE_BY_VALUE[r.officeState]?.label].filter(Boolean).join(', '),
    },
    {
      key: 'categories',
      header: 'Categories',
      render: (r) =>
        (r.categories || []).map((c) => CATEGORY_BY_VALUE[c]?.label || c).join(', ') || (
          <span style={{ color: 'var(--admin-muted)' }}>None</span>
        ),
    },
    {
      key: 'placementTier',
      header: 'Placement',
      width: 120,
      render: (r) => (r.placementTier === 'featured' ? 'Featured' : 'Standard'),
    },
    {
      key: 'active',
      header: 'Live',
      width: 110,
      // "Published" here means the placement is paid for and showing.
      render: (r) => <StatusBadge status={r.active ? 'published' : 'draft'} />,
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
          <h2 className="admin-page__title">Find a Bid Writer</h2>
          <p className="admin-page__subtitle">
            Paid placements in the bid writer directory, which is also the general
            business advertising space. A listing only appears once “Placement is paid
            and live” is ticked.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New listing
          </button>
        </div>
      </div>

      {/* The state of the switch, said plainly and without mentioning files or
          settings the client cannot reach: this screen is used through a browser
          by someone who does not have the code. What they need to know is
          whether the public can see any of this, and who to ask to change it. */}
      {BID_WRITERS !== 'live' && (
        <div className="admin-alert" style={{ marginBottom: 16 }}>
          <strong>Visitors cannot see this directory yet.</strong>{' '}
          {BID_WRITERS === 'off'
            ? 'The page is switched off, so nothing you add here appears on the website. You can prepare listings now and they will all go live together.'
            : 'The page is in preview. It can be opened by anyone with the direct link, but it is kept out of the site menu and hidden from search engines.'}{' '}
          Ask your web developer to switch the directory on once placements are paid
          for and you are ready for it to go live.
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load the directory' : null}
        emptyText="No listings yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit listing' : 'New listing'}
        subtitle={
          editingId ? 'Update this placement.' : 'Create the listing, then add the logo.'
        }
        onClose={closeDrawer}
        busy={saving}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDrawer} disabled={saving || logoBusy}>
              {editingId ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              form="bidwriter-form"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create listing'}
            </button>
          </>
        }
      >
        <form id="bidwriter-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <FormField label="Company" name="company" value={form.company} onChange={onChange} required />
          <FormField
            label="Blurb"
            name="blurb"
            as="textarea"
            rows={3}
            value={form.blurb}
            onChange={onChange}
            hint="A couple of lines on what they do. Their words, not ours — this is their advertisement."
          />

          <FormField
            label="Office state"
            name="officeState"
            as="select"
            options={STATE_OPTIONS}
            value={form.officeState}
            onChange={onChange}
            required
            hint="Drives the location filter."
          />
          <FormField
            label="Office city"
            name="officeCity"
            value={form.officeCity}
            onChange={onChange}
            hint="Display only, e.g. “Parramatta”."
          />

          <div className="admin-field">
            <span className="admin-field__label">Categories</span>
            <div className="admin-checkgroup">
              {CATEGORIES.map((c) => (
                <label className="admin-checkgroup__item" key={c.value}>
                  <input
                    type="checkbox"
                    checked={form.categories.includes(c.value)}
                    onChange={() => toggleCategory(c.value)}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
            <p className="admin-field__hint" style={{ marginLeft: 0 }}>
              A listing can sit in several. These four are fixed — they are what a
              placement is sold against.
            </p>
          </div>

          <FormField label="Website" name="website" value={form.website} onChange={onChange} />
          <FormField label="Contact name" name="contactName" value={form.contactName} onChange={onChange} />
          <FormField label="Contact email" name="contactEmail" type="email" value={form.contactEmail} onChange={onChange} />
          <FormField label="Contact phone" name="contactPhone" value={form.contactPhone} onChange={onChange} />

          <div className="admin-field">
            <span className="admin-field__label">Logo</span>
            {editingId ? (
              <>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt=""
                    style={{ display: 'block', width: 88, height: 88, objectFit: 'contain', marginBottom: 10 }}
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
                  {logoBusy ? 'Uploading…' : 'Optional. Without one the listing shows an empty tile, and the names still line up.'}
                </p>
              </>
            ) : (
              <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                Create the listing first, then add the logo.
              </p>
            )}
          </div>

          <FormField
            label="Placement tier"
            name="placementTier"
            as="select"
            options={TIER_OPTIONS}
            value={form.placementTier}
            onChange={onChange}
            hint="Featured listings sort above standard ones and carry a rule down their edge. The tier itself is never labelled on the page."
          />
          <FormField
            label="Order"
            name="order"
            type="number"
            value={form.order}
            onChange={onChange}
            hint="Within the tier. Lowest first; ties fall back to company name."
          />
          <FormField
            label="Internal notes"
            name="notes"
            as="textarea"
            rows={2}
            value={form.notes}
            onChange={onChange}
            hint="Never served publicly. Use it for the commercial detail: what was agreed, when it runs to."
          />

          <div className="admin-field">
            <div className="admin-checkgroup">
              <label className="admin-checkgroup__item">
                <input type="checkbox" name="active" checked={Boolean(form.active)} onChange={onChange} />
                <span>Placement is paid and live</span>
              </label>
            </div>
            <p className="admin-field__hint" style={{ marginLeft: 0 }}>
              Off by default. A listing does not appear on the directory until this is
              ticked, so a record created while a deal is still being discussed cannot
              show by accident.
            </p>
          </div>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete listing"
        message="Delete this listing? The logo is removed from storage as well. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
