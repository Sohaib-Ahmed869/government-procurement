# Admin screen conventions

Read this before building any admin screen. Screens live in
`fe/src/admin/pages/<Name>.jsx`, default-export a React component, and render
**inside** `AdminLayout` (so `admin.css` is already loaded — do NOT import it,
and do NOT add a sidebar/header; just render the page body).

## What you get (import these)
```js
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormField from '../components/FormField.jsx';
// API — import only what you need:
import { articlesApi, videosApi, /* … */ } from '../../api';
```

### API shape
- `resource.list(params)` → returns the **array** of items (unwrapped).
- `resource.page(params)` → returns the **full** `{ data, meta }` (meta has `page,totalPages,total,hasNext,hasPrev`). Use for paginated tables.
- `resource.get(id)`, `resource.getBySlug(slug)`, `resource.create(body)`, `resource.update(id, body)`, `resource.remove(id)`.
- Uploads: e.g. `articlesApi.uploadHero(id, file)`, `videosApi.uploadFile(id, file)`, `videosApi.uploadThumbnail(id, file)`, `coursesApi.uploadImage(id, file)`, `mediaApi.upload(file, { folder })`.
- Errors throw an `ApiError` with `.message` and `.status` — catch and show via `admin-alert admin-alert--error`.
- Mongo ids are on `item._id` (fallback `item.id`).

## CSS classes available (from admin.css — use them, don't invent)
- Page head: `admin-page__head` > `admin-page__title` + `admin-page__actions`.
- Buttons: `admin-btn`, `admin-btn--primary`, `admin-btn--mint`, `admin-btn--danger`, `admin-btn--sm`.
- Toolbar (search/filters): `admin-toolbar`; inputs `admin-input`, `admin-select`, `admin-textarea`.
- Table: use `<DataTable columns={[{key,header,render?,width?}]} rows loading error emptyText />`.
- Card/panel: `admin-card`. Form grid: `admin-form-grid` (2-col) + `admin-form-actions`. Field: use `<FormField label name as="input|textarea|select" type value onChange error hint options={[{value,label}]} />`.
- Alerts: `admin-alert admin-alert--error|--success`. Status pills: `<StatusBadge status={item.status} />`.
- Stat tiles: `admin-stats` > `admin-stat` > `admin-stat__label` + `admin-stat__value`.

## Standard LIST screen pattern
```jsx
export default function ThingsAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading|ready|error
  const [q, setQ] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const load = () => {
    setStatus('loading');
    thingsApi.list({ q, limit: 100 })
      .then((items) => { setRows(items); setStatus('ready'); })
      .catch(() => setStatus('error'));
  };
  useEffect(load, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDelete = async () => {
    await thingsApi.remove(confirmId);
    setConfirmId(null);
    load();
  };

  const columns = [
    { key: 'title', header: 'Title' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: '', render: (r) => (
      <div className="admin-table__actions">
        <Link className="admin-btn admin-btn--sm" to={`${r._id}`}>Edit</Link>
        <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => setConfirmId(r._id)}>Delete</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="admin-page__head">
        <h2 className="admin-page__title">Things</h2>
        <div className="admin-page__actions"><Link className="admin-btn admin-btn--primary" to="new">New thing</Link></div>
      </div>
      <div className="admin-toolbar">
        <input className="admin-input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
      </div>
      <DataTable columns={columns} rows={rows} loading={status==='loading'} error={status==='error' ? 'Failed to load' : null} emptyText="No things yet." />
      <ConfirmDialog open={Boolean(confirmId)} message="Delete this item? This cannot be undone." onConfirm={onDelete} onCancel={() => setConfirmId(null)} />
    </div>
  );
}
```

## Standard EDITOR screen pattern (separate route)
- Read `const { id } = useParams();` — if present, `useEffect` loads the entity via `get(id)`; else start blank.
- Keep a `form` state object; each field: `<FormField name="title" label="Title" value={form.title} onChange={onChange} />` with a shared `onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))`.
- Submit: create or update; on success `navigate('..')` (back to the list). Show `admin-alert--error` on failure; disable the button while saving.
- For file fields (hero image, video file, thumbnail, course image): the entity must exist first, so on a NEW record `create({...})` then upload to the returned id, then navigate.

## Rules
- Only create/modify the files named in your task. Do NOT touch `AdminRoutes.jsx`, `App.jsx`, the shared components, `admin.css`, or the api layer — routing is wired centrally.
- The page stub files already exist but are EMPTY — Read first (warns "empty"), then Write.
- Plain JSX, no TypeScript, no new deps. Keep the tone/comments consistent with the foundation files.
- After writing, run `cd /d/government-procurement/fe && npx oxlint <your files>` and fix lint errors in your files.
