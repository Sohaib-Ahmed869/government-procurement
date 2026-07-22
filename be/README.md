# be — Government Procurement CMS API

Node + Express + MongoDB (Mongoose) backend for the Government Procurement site.
Media and video files are stored on **AWS S3**. Auth is JWT with role-based
access control (Super Admin / Editor / Moderator).

## Quick start

```bash
cd be
cp .env.example .env      # then fill in MONGO_URI + AWS S3 keys
npm install
npm run seed              # creates the first super-admin (from .env)
npm run dev               # starts the API on http://localhost:5000
```

Health check: `GET http://localhost:5000/health` → reports whether S3 and mail
are configured yet.

## What you need to paste into `.env`

| Var | What |
|-----|------|
| `MONGO_URI` | MongoDB connection string (Atlas or local) |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` | S3 media/video storage |
| `JWT_SECRET`, `JWT_RESET_SECRET` | long random strings |
| `SMTP_*` | *optional* — without them, emails print to the console |
| `SEED_ADMIN_*` | the first super-admin `npm run seed` creates |

Nothing else is required to boot. Until S3 keys are present, upload routes return
a clear `503` and everything else works.

## Architecture

```
src/
  server.js            boot: connect Mongo → create app → listen
  app.js               express app (helmet, cors, rate-limit, routes, errors)
  config/              env, db (mongoose), s3 (AWS SDK v3)
  middleware/          auth (JWT), rbac (roles), error handler, upload (multer→S3)
  utils/               ApiError, asyncHandler, apiResponse, pagination, slugify, token, mailer
  models/              18 Mongoose models
  modules/<name>/      <name>.controller.js + <name>.routes.js per resource
  routes/index.js      mounts every module under /api
  seed/seed.js         first super-admin + starter content
```

Response envelope: `{ success, data, meta? }`. Errors: `{ success, message, errors? }`.

## API surface (all under `/api`)

**Public (no auth):** `GET` published content — `articles`, `videos`, `courses`,
`faqs`, `pages`, `testimonials`, `questions`, `links`, `announcements/active`,
`homepage-rails/resolved`, `settings/public`, `search`. `POST` website forms —
`contact`, `consultations`, `register-interest`, `subscribers`, `questions`.
Double opt-in: `GET subscribers/confirm`, `POST subscribers/unsubscribe`.

**Auth:** `POST auth/login`, `GET auth/me`, `POST auth/forgot-password`,
`POST auth/reset-password`.

**Admin (JWT):** full CRUD for every content type; `questions/:id/status` &
`/:id/answer` (moderation workflow); `media` uploads; `subscribers|contact|
consultations|register-interest` management + CSV export; `users` & `settings`
(super-admin only); `dashboard`.

### Roles
- **superadmin** — everything, incl. users & settings.
- **editor** — all content + submissions.
- **moderator** — forum Q&A workflow.

## Videos

Videos are **plain files on S3** (mp4/webm), not embeds. Two upload paths:
- Small files: `POST /api/videos/:id/file` (multipart, server proxies to S3).
- Large files: `POST /api/videos/upload-url` returns a presigned S3 `PUT` URL so
  the browser uploads directly, then `PATCH /api/videos/:id` with the returned key/url.

## Notes

- CORS allows the origins in `CLIENT_ORIGINS` (default `http://localhost:5173`).
- Rate limit: 1000 req / 15 min per IP on `/api`.
- Audit log records admin mutations (`GET` via a future admin screen / DB).
