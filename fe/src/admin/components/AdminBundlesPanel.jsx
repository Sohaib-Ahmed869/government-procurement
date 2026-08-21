import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminDrawer from './AdminDrawer.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { bundlesApi, coursesApi } from '../../api';

/* ---------------------------------------------------------------------------
   Course bundles in the CMS (Courses → Bundles).

   A bundle groups published courses and sells them for less than their total.
   It is deliberately NOT a learning path: there is no order, no prerequisite
   and no certificate, because none of those are what an admin is deciding when
   they group courses to discount them.

   The saving is never typed in. It is the difference between what the chosen
   courses cost today and the bundle price, recomputed here as the admin picks,
   and again on the server on every read — a saving somebody typed once is a
   saving that stops being true the first time a course is re-priced.
   ------------------------------------------------------------------------ */

const money = (n, currency = 'AUD') =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: 0 })
    .format(Number(n) || 0);

const EMPTY = {
  title: '',
  summary: '',
  price: '',
  currency: 'AUD',
  courses: [],
  status: 'draft',
};

export default function AdminBundlesPanel({ isAdmin, query }) {
  const [rows, setRows] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | { ...bundle } | EMPTY
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      // Staff reads return drafts too, so the list is everything the CMS owns.
      const [bundles, courses] = await Promise.all([
        bundlesApi.list({ limit: 100 }),
        coursesApi.list({ limit: 100, status: 'published' }),
      ]);
      setRows(bundles ?? []);
      setCatalogue(courses ?? []);
      setState('ready');
    } catch (err) {
      setError(err?.message ?? 'Could not load bundles');
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = (query ?? '').trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((b) => b.title?.toLowerCase().includes(needle));
  }, [rows, query]);

  const priceById = useMemo(
    () => new Map(catalogue.map((c) => [String(c._id), c])),
    [catalogue],
  );

  // What the admin is currently building is worth, live, as they tick courses.
  const draftTotals = useMemo(() => {
    if (!editing) return { listPrice: 0, saving: 0, percent: 0 };
    const listPrice = (editing.courses ?? []).reduce(
      (sum, id) => sum + (priceById.get(String(id))?.price ?? 0),
      0,
    );
    const price = Number(editing.price) || 0;
    const saving = Math.max(0, listPrice - price);
    return {
      listPrice,
      saving,
      percent: listPrice > 0 ? Math.round((saving / listPrice) * 100) : 0,
    };
  }, [editing, priceById]);

  const toggleCourse = (id) => {
    setEditing((b) => {
      const ids = (b.courses ?? []).map(String);
      const key = String(id);
      return {
        ...b,
        courses: ids.includes(key) ? ids.filter((c) => c !== key) : [...ids, key],
      };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    const payload = {
      title: editing.title.trim(),
      summary: editing.summary ?? '',
      price: Number(editing.price) || 0,
      currency: editing.currency || 'AUD',
      courses: (editing.courses ?? []).map(String),
      status: editing.status,
    };
    try {
      if (editing._id) await bundlesApi.update(editing._id, payload);
      else await bundlesApi.create(payload);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err?.message ?? 'That didn’t save');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (bundle) => {
    setBusy(true);
    setError('');
    try {
      await bundlesApi.remove(bundle._id);
      await load();
    } catch (err) {
      setError(err?.message ?? 'That didn’t work');
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <p className="admin-page__subtitle" style={{ margin: 0 }}>
          Group published courses and sell them together for less than their total.
        </p>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          style={{ marginLeft: 'auto' }}
          disabled={!isAdmin}
          onClick={() => {
            setFormError('');
            setEditing({ ...EMPTY });
          }}
        >
          New bundle
        </button>
      </div>

      {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}

      {!isAdmin ? (
        <div className="admin-alert">
          You can see the bundles here. Creating and pricing them is a super-admin action.
        </div>
      ) : null}

      {state === 'loading' ? (
        <div className="admin-card">Loading bundles…</div>
      ) : visible.length === 0 ? (
        <div className="admin-card">
          {rows.length === 0
            ? 'No bundles yet. A bundle is two or more published courses at one lower price.'
            : 'No bundles match that.'}
        </div>
      ) : (
        <div className="admin-courses">
          {visible.map((b) => (
            <article className="admin-card admin-course" key={b._id}>
              <div className="admin-course__head">
                <div>
                  <h3 className="admin-course__title">{b.title}</h3>
                  <p className="admin-course__meta">
                    {b.courses?.length
                      ? b.courses.map((c) => c.title).join(' + ')
                      : 'No courses in this bundle yet'}
                  </p>
                </div>
                <span className={`admin-badge admin-badge--${b.status}`}>
                  {b.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>

              {b.summary ? <p className="admin-course__meta">{b.summary}</p> : null}

              <ul className="admin-course__stats">
                <li><strong>{b.courseCount ?? 0}</strong> courses</li>
                <li>Bundle price <strong>{money(b.price, b.currency)}</strong></li>
                <li>Bought separately {money(b.listPrice, b.currency)}</li>
                <li>
                  {b.saving > 0
                    ? `Saves ${money(b.saving, b.currency)} (${b.savingPercent}%)`
                    : 'No saving'}
                </li>
              </ul>

              <div className="admin-course__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--sm admin-btn--danger"
                  disabled={!isAdmin || busy}
                  onClick={() => setDeleting(b)}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--sm"
                  disabled={!isAdmin || busy}
                  onClick={() => {
                    setFormError('');
                    setEditing({
                      ...b,
                      price: String(b.price ?? ''),
                      // The list gives populated course objects; the form works
                      // in ids, which is also what the PATCH takes.
                      courses: (b.courses ?? []).map((c) => String(c._id)),
                    });
                  }}
                >
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <AdminDrawer
        open={Boolean(editing)}
        busy={busy}
        width="520px"
        title={editing?._id ? 'Edit bundle' : 'New bundle'}
        subtitle="Two or more published courses, at one price below their total."
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="admin-btn" disabled={busy} onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button
              type="submit"
              form="bundle-form"
              className="admin-btn admin-btn--primary"
              disabled={busy || !editing?.title?.trim()}
            >
              {busy ? 'Saving…' : 'Save bundle'}
            </button>
          </>
        }
      >
        {editing ? (
          <form id="bundle-form" onSubmit={save}>
            {formError ? <div className="admin-alert admin-alert--error">{formError}</div> : null}

            <div className="admin-field">
              <label className="admin-field__label" htmlFor="bundle-title">
                Name<span className="admin-field__req">*</span>
              </label>
              <input
                id="bundle-title"
                className="admin-input"
                value={editing.title}
                autoFocus
                placeholder="e.g. Tendering Essentials Bundle"
                onChange={(e) => setEditing((b) => ({ ...b, title: e.target.value }))}
              />
            </div>

            <div className="admin-field">
              <label className="admin-field__label" htmlFor="bundle-summary">
                Summary
                <span className="admin-field__hint">Shown on the bundle card</span>
              </label>
              <textarea
                id="bundle-summary"
                className="admin-textarea"
                rows={3}
                value={editing.summary ?? ''}
                placeholder="One or two sentences on who this bundle is for."
                onChange={(e) => setEditing((b) => ({ ...b, summary: e.target.value }))}
              />
            </div>

            <div className="admin-field">
              <span className="admin-field__label">
                Courses in this bundle
                <span className="admin-field__hint">Published courses only</span>
              </span>
              {catalogue.length === 0 ? (
                <p className="admin-course__meta">
                  There are no published courses to bundle yet.
                </p>
              ) : (
                <div className="admin-checkgroup">
                  {catalogue.map((c) => (
                    <label className="admin-checkgroup__item" key={c._id}>
                      <input
                        type="checkbox"
                        checked={(editing.courses ?? []).map(String).includes(String(c._id))}
                        onChange={() => toggleCourse(c._id)}
                      />
                      <span>
                        {c.title} · {money(c.price, c.currency)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-form-grid">
              <div className="admin-field">
                <label className="admin-field__label" htmlFor="bundle-price">
                  Bundle price
                </label>
                <input
                  id="bundle-price"
                  className="admin-input"
                  type="number"
                  min="0"
                  step="1"
                  value={editing.price}
                  onChange={(e) => setEditing((b) => ({ ...b, price: e.target.value }))}
                />
              </div>
              <div className="admin-field">
                <label className="admin-field__label" htmlFor="bundle-status">
                  Status
                </label>
                <select
                  id="bundle-status"
                  className="admin-select"
                  value={editing.status}
                  onChange={(e) => setEditing((b) => ({ ...b, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            {/* The arithmetic, shown while the admin is still deciding rather
                than after they save and read it back off the card. */}
            <div className="admin-alert">
              Bought separately: <strong>{money(draftTotals.listPrice, editing.currency)}</strong>.{' '}
              {draftTotals.saving > 0 ? (
                <>
                  This bundle saves{' '}
                  <strong>{money(draftTotals.saving, editing.currency)}</strong> (
                  {draftTotals.percent}%).
                </>
              ) : (
                <>Set a price below that total, or the bundle is not a discount.</>
              )}
            </div>
          </form>
        ) : null}
      </AdminDrawer>

      {deleting ? (
        <ConfirmDialog
          open
          title="Delete this bundle?"
          message={`"${deleting.title}" is removed. The courses inside it are not affected.`}
          confirmLabel="Delete bundle"
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove(deleting)}
        />
      ) : null}
    </>
  );
}
