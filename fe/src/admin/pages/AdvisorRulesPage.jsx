import { useEffect, useState } from 'react';
import { rulePacksApi } from '../../api';
import {
  THRESHOLD_GROUPS,
  DESCRIBED_KEYS,
  parseAmount,
  formatAmount,
} from '../../features/advisor/fields.js';
import { JURISDICTIONS as SITE_JURISDICTIONS } from '../../features/jurisdictions/data.js';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AdminDrawer from '../components/AdminDrawer.jsx';
import FormField from '../components/FormField.jsx';
import './AdvisorRulesPage.css';

// A6.7 / A6.8 — the rule versions behind the Procurement Advisor.
//
// Every figure and citation is an ordinary labelled field. An earlier version
// of this page asked for two blobs of JSON, which is fine for whoever wrote the
// rule pack and unusable for the person who actually keeps thresholds current —
// and a stray brace would have silently published nothing.
//
// Each field shows the value the tool uses today and is left blank unless it is
// being changed, so a version carries only what moved. That is also what makes
// the history readable: "raised one threshold" rather than a wall of numbers
// that are mostly identical to the last wall of numbers.
//
// What is NOT editable here is the decision logic — which question follows
// which, how a pathway is ranked. That is code, reviewed in code.
// Every jurisdiction the CMS knows about, taken from the same list the
// Jurisdictional Links page and its admin screen use rather than a third copy.
// Lowercased to match RULE_PACK_JURISDICTIONS on the server, which does the
// same thing to RULE_STATES.
const JURISDICTIONS = SITE_JURISDICTIONS.map((j) => ({
  value: j.value.toLowerCase(),
  label: j.label,
}));
const JURISDICTION_LABEL = Object.fromEntries(JURISDICTIONS.map((j) => [j.value, j.label]));

// The built-in packs, so the form can show what each figure is today. Loaded on
// demand — the NSW pack is a thousand lines and the rest of the CMS shouldn't
// carry it.
const PACKS = { nsw: () => import('../../features/advisor/rules/nsw.js').then((m) => m.default) };

const EMPTY_META = { jurisdiction: 'nsw', version: '', asAt: '', changeNote: '' };

export default function AdvisorRulesPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [meta, setMeta] = useState(EMPTY_META);
  // Keyed by threshold / source key. A missing or empty entry means "unchanged".
  const [thresholds, setThresholds] = useState({});
  const [sources, setSources] = useState({});
  const [pack, setPack] = useState(null);
  // The version currently live for the jurisdiction being viewed, so the panel
  // below can show the figure actually in use and mark the ones an overlay has
  // moved away from the built-in value.
  const [published, setPublished] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = () => {
    setStatus('loading');
    rulePacksApi
      .list()
      .then((items) => {
        setRows(items || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, []);

  // The defaults shown beside each field follow whichever jurisdiction is
  // selected, so switching it re-labels the whole form rather than showing NSW
  // figures under a Victorian heading.
  useEffect(() => {
    let alive = true;
    const loadPack = PACKS[meta.jurisdiction];
    if (!loadPack) {
      setPack(null);
      return undefined;
    }
    loadPack().then((p) => alive && setPack(p));
    rulePacksApi
      .active(meta.jurisdiction)
      .then((v) => alive && setPublished(v))
      .catch(() => alive && setPublished(null));
    return () => {
      alive = false;
    };
  }, [meta.jurisdiction, rows]);

  const openCreate = () => {
    setEditingId(null);
    setMeta(EMPTY_META);
    setThresholds({});
    setSources({});
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id || row.id);
    setMeta({
      jurisdiction: row.jurisdiction || 'nsw',
      version: row.version || '',
      asAt: row.asAt || '',
      changeNote: row.changeNote || '',
    });
    setThresholds(
      Object.fromEntries(
        Object.entries(row.thresholds || {}).map(([k, v]) => [k, String(v)]),
      ),
    );
    setSources(row.sources || {});
    setSaveError(null);
    setDrawerOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!meta.version.trim()) {
      setSaveError('Give this version a name so you can tell it apart from the others.');
      return;
    }

    // Only fields the editor actually filled in are sent. A blank field means
    // "leave the built-in value alone", not "set it to zero".
    const outThresholds = {};
    for (const [key, raw] of Object.entries(thresholds)) {
      const n = parseAmount(raw);
      if (n !== null) outThresholds[key] = n;
    }

    const outSources = {};
    for (const [key, value] of Object.entries(sources)) {
      const entry = {};
      for (const f of ['title', 'url', 'asAt']) {
        if (value?.[f]?.trim()) entry[f] = value[f].trim();
      }
      if (Object.keys(entry).length) outSources[key] = entry;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const body = {
        jurisdiction: meta.jurisdiction,
        version: meta.version.trim(),
        asAt: meta.asAt.trim(),
        changeNote: meta.changeNote.trim(),
        thresholds: outThresholds,
        sources: outSources,
      };
      if (editingId) await rulePacksApi.update(editingId, body);
      else await rulePacksApi.create(body);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save this version');
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async (row) => {
    await rulePacksApi.publish(row._id || row.id);
    load();
  };

  const onDelete = async () => {
    try {
      await rulePacksApi.remove(confirmId);
    } finally {
      setConfirmId(null);
      load();
    }
  };

  const columns = [
    {
      key: 'jurisdiction',
      header: 'Jurisdiction',
      width: 170,
      render: (r) => JURISDICTION_LABEL[r.jurisdiction] || r.jurisdiction,
    },
    { key: 'version', header: 'Version', width: 130 },
    { key: 'asAt', header: 'Rules as at', width: 130, render: (r) => r.asAt || 'Not stated' },
    {
      key: 'changes',
      header: 'Changes',
      render: (r) => {
        const t = Object.keys(r.thresholds || {}).length;
        const s = Object.keys(r.sources || {}).length;
        if (!t && !s) return 'Nothing changed';
        return [
          t ? `${t} figure${t === 1 ? '' : 's'}` : null,
          s ? `${s} source${s === 1 ? '' : 's'}` : null,
        ]
          .filter(Boolean)
          .join(', ');
      },
    },
    { key: 'changeNote', header: 'Note', render: (r) => r.changeNote || '' },
    {
      key: 'active',
      header: 'Status',
      width: 120,
      render: (r) => <StatusBadge status={r.active ? 'published' : 'draft'} />,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="admin-table__actions">
          {!r.active && (
            <button type="button" className="admin-btn admin-btn--sm" onClick={() => onPublish(r)}>
              Publish
            </button>
          )}
          <button type="button" className="admin-btn admin-btn--sm" onClick={() => openEdit(r)}>
            Edit
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--sm admin-btn--danger"
            onClick={() => setConfirmId(r._id || r.id)}
            disabled={r.active}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  // Any threshold the pack defines that fields.js hasn't described yet, so a
  // new figure is still editable rather than invisible.
  const undescribed = pack
    ? Object.keys(pack.thresholds || {}).filter((k) => !DESCRIBED_KEYS.has(k))
    : [];

  return (
    <div>
      <div className="admin-page__head">
        <div className="admin-page__heading">
          <h2 className="admin-page__title">Sourcing Advisor</h2>
          <p className="admin-page__subtitle">
            The figures and sources the Sourcing Advisor works from. Change one, publish
            it, and the live tool uses it straight away. Every field shows the value in use
            today; fill in only what has changed.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            New version
          </button>
        </div>
      </div>

      {/* The rules as they stand, whether or not anyone has ever published a
          version. Without this the page is empty on day one and the figures are
          only visible from inside the "New version" form — which reads as the
          CMS having no data, when what it actually has is no *changes* yet. */}
      <CurrentFigures pack={pack} published={published} />

      <h3 className="arp__h3">Change history</h3>
      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load rule versions' : null}
        emptyText="No versions yet, the advisor is running on its built-in figures."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit version' : 'New version'}
        subtitle="Leave a figure blank to keep the value the tool uses now."
        onClose={() => !saving && setDrawerOpen(false)}
        busy={saving}
        footer={
          <>
            <button
              type="button"
              className="admin-btn"
              onClick={() => setDrawerOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="rulepack-form"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create version'}
            </button>
          </>
        }
      >
        <form id="rulepack-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <FormField
            label="Jurisdiction"
            name="jurisdiction"
            as="select"
            options={JURISDICTIONS}
            value={meta.jurisdiction}
            onChange={(e) => setMeta((m) => ({ ...m, jurisdiction: e.target.value }))}
          />
          <FormField
            label="Name this version"
            name="version"
            value={meta.version}
            onChange={(e) => setMeta((m) => ({ ...m, version: e.target.value }))}
            required
            hint="Anything you will recognise later, e.g. “August 2026 thresholds”. Only shown here."
          />
          <FormField
            label="Rules correct as at"
            name="asAt"
            type="date"
            value={meta.asAt}
            onChange={(e) => setMeta((m) => ({ ...m, asAt: e.target.value }))}
            hint="Printed on the tool's result page, so it is the date you are saying these figures were correct."
          />
          <FormField
            label="What changed"
            name="changeNote"
            as="textarea"
            rows={2}
            value={meta.changeNote}
            onChange={(e) => setMeta((m) => ({ ...m, changeNote: e.target.value }))}
            hint="For your own records."
          />

          {!pack && (
            <p className="arp__empty">
              There are no built-in rules for {JURISDICTION_LABEL[meta.jurisdiction]} yet, so
              there is nothing to override. New South Wales is the only jurisdiction the
              advisor currently runs.
            </p>
          )}

          {pack && (
            <>
              <h3 className="arp__h3">Figures</h3>
              {THRESHOLD_GROUPS.map((group) => {
                const fields = group.fields.filter((f) => f.key in (pack.thresholds || {}));
                if (!fields.length) return null;
                return (
                  <fieldset className="arp__group" key={group.title}>
                    <legend className="arp__legend">{group.title}</legend>
                    {group.intro && <p className="arp__intro">{group.intro}</p>}
                    {fields.map((f) => (
                      <AmountField
                        key={f.key}
                        field={f}
                        current={pack.thresholds[f.key]}
                        value={thresholds[f.key] ?? ''}
                        onChange={(v) => setThresholds((t) => ({ ...t, [f.key]: v }))}
                      />
                    ))}
                  </fieldset>
                );
              })}

              {undescribed.length > 0 && (
                <fieldset className="arp__group">
                  <legend className="arp__legend">Other figures</legend>
                  <p className="arp__intro">
                    These are used by the tool but have not been given a plain description
                    yet. Ask a developer before changing one.
                  </p>
                  {undescribed.map((key) => (
                    <AmountField
                      key={key}
                      field={{ key, label: key, format: 'number' }}
                      current={pack.thresholds[key]}
                      value={thresholds[key] ?? ''}
                      onChange={(v) => setThresholds((t) => ({ ...t, [key]: v }))}
                    />
                  ))}
                </fieldset>
              )}

              <h3 className="arp__h3">Sources</h3>
              <p className="arp__intro">
                The documents the tool cites on its results. Update one when a policy is
                renamed, replaced, or moves to a new address.
              </p>
              {Object.entries(pack.sources || {}).map(([key, source]) => (
                <SourceField
                  key={key}
                  source={source}
                  value={sources[key] || {}}
                  onChange={(patch) =>
                    setSources((s) => ({ ...s, [key]: { ...(s[key] || {}), ...patch } }))
                  }
                />
              ))}
            </>
          )}
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete version"
        message="This removes the version from the history. The published version is unaffected."
        confirmLabel="Delete"
        onCancel={() => setConfirmId(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}

// The rules as the live tool sees them: the built-in figures, with anything a
// published version has changed shown in its place and marked.
//
// Read-only on purpose. Editing happens by creating a version, which is what
// keeps the history meaningful — a figure that changed without a version behind
// it would be a change nobody can date or explain.
function CurrentFigures({ pack, published }) {
  const [open, setOpen] = useState(true);
  if (!pack) return null;

  const overridden = published?.thresholds || {};
  const sourceEdits = published?.sources || {};
  const changedCount = Object.keys(overridden).length + Object.keys(sourceEdits).length;

  return (
    <section className="arp__current-panel">
      <button type="button" className="arp__panel-head" onClick={() => setOpen((o) => !o)}>
        <span>
          <strong>Rules in use now</strong>
          <span className="arp__panel-meta">
            {published
              ? `Version “${published.version}”${published.asAt ? `, as at ${published.asAt}` : ''} · ${changedCount} value${changedCount === 1 ? '' : 's'} changed from the built-in rules`
              : `Built-in rules, as at ${pack.asAt} · nothing changed from the CMS yet`}
          </span>
        </span>
        <span className="arp__panel-toggle">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="arp__panel-body">
          {THRESHOLD_GROUPS.map((group) => {
            const fields = group.fields.filter((f) => f.key in (pack.thresholds || {}));
            if (!fields.length) return null;
            return (
              <div className="arp__panel-group" key={group.title}>
                <h4 className="arp__panel-group-title">{group.title}</h4>
                <dl className="arp__panel-list">
                  {fields.map((f) => {
                    const isOverridden = f.key in overridden;
                    const value = isOverridden ? overridden[f.key] : pack.thresholds[f.key];
                    return (
                      <div className={`arp__panel-row${isOverridden ? ' is-changed' : ''}`} key={f.key}>
                        <dt>{f.label}</dt>
                        <dd>
                          {f.format === 'percent'
                            ? `${formatAmount(value, f.format)}%`
                            : `$${formatAmount(value, f.format)}`}
                          {isOverridden && (
                            <span className="arp__panel-was">
                              {f.format === 'percent'
                                ? `was ${formatAmount(pack.thresholds[f.key], f.format)}%`
                                : `was $${formatAmount(pack.thresholds[f.key], f.format)}`}
                            </span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// One figure. The value in use is shown beside the field rather than pre-filled
// into it, so an untouched field is unambiguously "unchanged" — pre-filling
// would make every version carry every number whether or not it moved.
function AmountField({ field, current, value, onChange }) {
  const { label, help, format } = field;
  const changed = value !== '' && parseAmount(value) !== Number(current);

  return (
    <div className="arp__field">
      <label className="arp__label" htmlFor={`t-${field.key}`}>
        {label}
      </label>
      {help && <p className="arp__help">{help}</p>}
      <div className="arp__row">
        <span className="arp__current">
          Now: {format === 'percent' ? `${formatAmount(current, format)}%` : `$${formatAmount(current, format)}`}
        </span>
        <div className="arp__input">
          {format !== 'percent' && <span className="arp__affix">$</span>}
          <input
            id={`t-${field.key}`}
            type="text"
            inputMode="decimal"
            placeholder="Unchanged"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {format === 'percent' && <span className="arp__affix">%</span>}
        </div>
        {value !== '' && (
          <button type="button" className="admin-btn admin-btn--sm" onClick={() => onChange('')}>
            Clear
          </button>
        )}
      </div>
      {changed && (
        <p className="arp__changed">
          Will change to{' '}
          {format === 'percent'
            ? `${formatAmount(parseAmount(value), format)}%`
            : `$${formatAmount(parseAmount(value), format)}`}
        </p>
      )}
    </div>
  );
}

// One cited document. The quotes a finding relies on are part of the tool's
// evidence and are not editable here — only what the document is called, where
// it lives, and when it was last checked.
function SourceField({ source, value, onChange }) {
  const [open, setOpen] = useState(false);
  const touched = Boolean(value.title || value.url || value.asAt);

  return (
    <div className={`arp__source${touched ? ' is-touched' : ''}`}>
      <button type="button" className="arp__source-head" onClick={() => setOpen((o) => !o)}>
        <span className="arp__source-title">{value.title || source.title}</span>
        <span className="arp__source-state">{touched ? 'Changed' : open ? 'Hide' : 'Edit'}</span>
      </button>

      {open && (
        <div className="arp__source-body">
          <FormField
            label="Title"
            name="title"
            value={value.title ?? ''}
            onChange={(e) => onChange({ title: e.target.value })}
            hint={`Now: ${source.title}`}
          />
          <FormField
            label="Web address"
            name="url"
            value={value.url ?? ''}
            onChange={(e) => onChange({ url: e.target.value })}
            hint={source.url ? `Now: ${source.url}` : 'No address recorded.'}
          />
          <FormField
            label="Last checked"
            name="asAt"
            type="date"
            value={value.asAt ?? ''}
            onChange={(e) => onChange({ asAt: e.target.value })}
            hint={source.asAt ? `Now: ${source.asAt}` : 'Not recorded.'}
          />
        </div>
      )}
    </div>
  );
}
