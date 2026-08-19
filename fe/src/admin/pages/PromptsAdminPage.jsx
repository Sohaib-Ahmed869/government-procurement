import { useEffect, useMemo, useState } from 'react';
import { promptsApi } from '../../api';
import {
  TOPICS,
  TOPIC_BY_VALUE,
  TOPIC_OPTIONS,
  TOOL_BY_VALUE,
  TOOL_OPTIONS,
} from '../../features/prompts/data.js';
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
  mainTopic: TOPICS[0].value,
  useCase: '',
  useCaseOrder: 0,
  tool: TOOL_OPTIONS[0].value,
  title: '',
  body: '',
  notes: '',
  order: 0,
  status: 'published',
};

// B4 — the AI Prompt Library's contents.
//
// Two of the three levels are fixed selects; Use Case is free text, because
// nobody can enumerate the use cases up front and a new one should not need a
// deploy. That leaves the usual risk — a typo makes a second use case rather
// than an error — so the field is backed by a datalist of the ones already in
// use, scoped to the topic being edited.
export default function PromptsAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [topicFilter, setTopicFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [allRows, setAllRows] = useState([]);

  const load = () => {
    setStatus('loading');
    promptsApi
      .list(topicFilter !== 'all' ? { mainTopic: topicFilter } : undefined)
      .then((items) => {
        setRows(items || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [topicFilter]);

  // Unfiltered, so the use-case datalist and the topic filter don't shrink to
  // whatever is currently on screen.
  useEffect(() => {
    promptsApi
      .list()
      .then((items) => setAllRows(items || []))
      .catch(() => {
        /* the datalist is simply empty */
      });
  }, [rows.length]);

  // Use cases already in use under the topic being edited. Scoped to the topic
  // because the same words can legitimately mean different work on either side
  // of the toggle, and suggesting Award's list while writing a Win prompt would
  // push an editor into merging two groups that should stay apart.
  const useCaseSuggestions = useMemo(() => {
    const seen = allRows
      .filter((r) => !form.mainTopic || r.mainTopic === form.mainTopic)
      .map((r) => r.useCase)
      .filter(Boolean);
    return [...new Set(seen)].sort((a, b) => a.localeCompare(b));
  }, [allRows, form.mainTopic]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
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
      mainTopic: row.mainTopic || TOPICS[0].value,
      useCase: row.useCase || '',
      useCaseOrder: row.useCaseOrder ?? 0,
      tool: row.tool || TOOL_OPTIONS[0].value,
      title: row.title || '',
      body: row.body || '',
      notes: row.notes || '',
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
    if (!form.useCase.trim()) {
      setSaveError('Use case is required. It is the group this prompt is listed under.');
      return;
    }
    if (!form.title.trim()) {
      setSaveError('Title is required.');
      return;
    }
    if (!form.body.trim()) {
      setSaveError('The prompt itself is required. This is what the copy button puts on the clipboard.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const body = {
      mainTopic: form.mainTopic,
      useCase: form.useCase.trim(),
      useCaseOrder: Number(form.useCaseOrder) || 0,
      tool: form.tool,
      title: form.title,
      body: form.body,
      notes: form.notes,
      order: Number(form.order) || 0,
      status: form.status,
    };
    try {
      if (editingId) await promptsApi.update(editingId, body);
      else await promptsApi.create(body);
      setDrawerOpen(false);
      load();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save this prompt');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    await promptsApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    {
      key: 'mainTopic',
      header: 'Topic',
      width: 150,
      render: (r) => TOPIC_BY_VALUE[r.mainTopic]?.label || r.mainTopic,
    },
    { key: 'useCase', header: 'Use case', width: 210 },
    { key: 'title', header: 'Prompt' },
    {
      key: 'tool',
      header: 'Tool',
      width: 110,
      render: (r) => TOOL_BY_VALUE[r.tool]?.label || r.tool,
    },
    {
      key: 'order',
      header: 'Order',
      width: 130,
      // Both numbers matter and they do different jobs, so the table shows the
      // pair rather than making an editor open the drawer to tell them apart.
      render: (r) => `${r.useCaseOrder ?? 0} / ${r.order ?? 0}`,
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
          <h2 className="admin-page__title">AI Prompt Library</h2>
          <p className="admin-page__subtitle">
            Master prompts on the Prompt Library page, grouped there as Main topic →
            Use case → the prompts under it. Topic and tool are fixed lists; the use
            case is yours to name. Published prompts are live immediately.
          </p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New prompt
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <select
          className="admin-select"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          aria-label="Filter by main topic"
          style={{ maxWidth: 240 }}
        >
          <option value="all">All topics</option>
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={status === 'loading'}
        error={status === 'error' ? 'Failed to load the prompt library' : null}
        emptyText="No prompts yet."
      />

      <AdminDrawer
        open={drawerOpen}
        title={editingId ? 'Edit prompt' : 'New prompt'}
        subtitle={
          editingId ? 'Update this prompt.' : 'Add a master prompt to the library.'
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
              form="prompt-form"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create prompt'}
            </button>
          </>
        }
      >
        <form id="prompt-form" onSubmit={onSubmit}>
          {saveError && <div className="admin-alert admin-alert--error">{saveError}</div>}

          <FormField
            label="Main topic"
            name="mainTopic"
            as="select"
            options={TOPIC_OPTIONS}
            value={form.mainTopic}
            onChange={onChange}
            required
            hint="The first level on the page. “Other” is for prompts that serve neither segment specifically."
          />
          <FormField
            label="Use case"
            name="useCase"
            value={form.useCase}
            onChange={onChange}
            required
            list="prompt-use-cases"
            hint="The group this sits under, e.g. “Drafting evaluation criteria”. Pick an existing one from the list. A new spelling makes a new group."
          />
          <datalist id="prompt-use-cases">
            {useCaseSuggestions.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>

          <FormField
            label="Use case position"
            name="useCaseOrder"
            type="number"
            value={form.useCaseOrder}
            onChange={onChange}
            hint="Where this use case sits within its topic. Use the same number on every prompt in it; lowest wins."
          />
          <FormField
            label="AI tool"
            name="tool"
            as="select"
            options={TOOL_OPTIONS}
            value={form.tool}
            onChange={onChange}
            required
            hint="The assistant this prompt was written and tested for. Shown as a tag on the card."
          />
          <FormField
            label="Prompt title"
            name="title"
            value={form.title}
            onChange={onChange}
            required
            hint="What the prompt does, in a few words. This is what a visitor scans."
          />
          <FormField
            label="The prompt"
            name="body"
            as="textarea"
            rows={10}
            value={form.body}
            onChange={onChange}
            required
            hint="Exactly what the copy button puts on the clipboard. Line breaks and placeholders are preserved as typed, so keep them."
          />
          <FormField
            label="Notes"
            name="notes"
            as="textarea"
            rows={3}
            value={form.notes}
            onChange={onChange}
            hint="Optional guidance shown under the prompt: what to swap in, what to expect. Never copied, so it can’t end up pasted into the tool."
          />
          <FormField
            label="Position within use case"
            name="order"
            type="number"
            value={form.order}
            onChange={onChange}
            hint="Lowest first; ties fall back to the title."
          />
          <FormField
            label="Status"
            name="status"
            as="select"
            options={STATUS_OPTS}
            value={form.status}
            onChange={onChange}
            hint="Only Published prompts are visible to the public. Drafts are visible to you on the page while signed in."
          />
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete prompt"
        message="Delete this prompt? It disappears from the Prompt Library. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
