# Backend module conventions

Read this before building any module. Every module lives at
`src/modules/<name>/` and has exactly two files:

- `<name>.controller.js` — named exports, each an Express handler wrapped in `asyncHandler`.
- `<name>.routes.js` — **default-exports** an `express.Router()` wiring paths to controller handlers.

`src/routes/index.js` already imports every `<name>.routes.js` and mounts it (do not edit it).

## Imports you should use (do not reinvent)

```js
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate, pageMeta } from '../../utils/pagination.js';
import { uniqueSlug, toSlug } from '../../utils/slugify.js';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ROLES, CONTENT_ROLES, MODERATION_ROLES, ADMIN_ONLY } from '../../constants/roles.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { recordAudit } from '../../models/AuditLog.js';
// S3 (only in modules that upload):
import { uploadImage, uploadVideo, uploadMedia } from '../../middleware/upload.js';
import { uploadBuffer, deleteObject, publicUrl, presignPut } from '../../config/s3.js';
```
Models import from `../../models/<Model>.js` (named export, e.g. `import { Article } from '../../models/Article.js'`).

## Response shape
- Success: `ok(res, data, meta?)` → `{ success, data, meta? }`; `created(res, data)` → 201; `noContent(res)` → 204.
- Errors: `throw ApiError.notFound('...')`, `.badRequest`, `.forbidden`, `.conflict`. Never `res.status().json()` an error yourself — throw and let the central handler format it.

## List endpoints (pagination + filtering)
```js
const { page, limit, skip } = parsePaging(req.query);
const filter = {};
if (req.query.q) filter.$text = { $search: req.query.q }; // for text-indexed models
// content models: non-staff only see published
const isStaff = Boolean(req.user);
if (!isStaff) filter.status = CONTENT_STATUS.PUBLISHED;
else if (req.query.status) filter.status = req.query.status;
const { items, meta } = await paginate(Model, filter, { page, limit, skip, sort: req.query.sort || '-createdAt' });
return ok(res, items, meta);
```

## Public vs admin access
- **Public content modules** (articles, videos, courses, faqs, pages, testimonials, questions, links, announcements, homepage-rails): list + read-by-slug use `optionalAuth` so anonymous users get only `status: 'published'` while signed-in staff see everything. Create/update/delete use `protect, authorize(CONTENT_ROLES)`.
- **Submission modules** (contact, consultations, register-interest, subscribers): `POST /` is PUBLIC (no auth) — that's the website form. All list/read/update/delete are `protect, authorize(...)` (admin only).
- **Admin-only modules** (users, settings, dashboard, media, audit): everything `protect`; `users` + `settings` are `authorize(ADMIN_ONLY)`.

## Content lifecycle
- On create/update, generate `slug` via `await uniqueSlug(Model, req.body.title, existingId?)` when the model has a slug.
- When `status` becomes `'published'` and `publishedAt` is empty, set `publishedAt = new Date()`.
- Call `recordAudit({ req, action: '<entity>.<verb>', entity: '<Model>', entityId: doc._id, summary })` after create/update/delete/publish.

## Routes ordering
Put static paths (e.g. `/slug/:slug`) before param paths (`/:id`) to avoid capture. Keep `/:id` last.

## S3 uploads
- Image/media uploads: `router.post('/', protect, authorize(CONTENT_ROLES), uploadImage.single('file'), handler)`. In the handler, `req.file` is a buffer; call `await uploadBuffer({ buffer: req.file.buffer, mimeType: req.file.mimetype, folder: '<folder>', originalName: req.file.originalname })` → `{ key, url }`.
- Video uploads use `uploadVideo.single('file')` and folder `'videos'`.
- On delete of a record that owns S3 objects, best-effort `await deleteObject(key)` (ignore failures).
- If `req.file` is missing where required, `throw ApiError.badRequest('File is required')`.

## Style
- ESM, 2-space indent, semicolons, single quotes. Match the tone of the already-written files in `src/config`, `src/utils`, `src/models`. Add brief comments explaining non-obvious choices.
