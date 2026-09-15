# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Monorepo for the Government Procurement website: `fe/` (Vite + React 19 SPA — public
site, admin/CMS, and student LMS in one app) and `be/` (Express + MongoDB/Mongoose +
AWS S3 CMS API). `docs/` has client-facing deliverables and planning docs.

## Commands

**Frontend** (`cd fe`):
```bash
npm run dev      # Vite dev server
npm run build    # production build → fe/dist
npm run lint      # oxlint
npm test          # currently a no-op placeholder (no test suite yet); CI runs this on every PR into dev/review/qa/live
```

**Backend** (`cd be`):
```bash
npm run dev       # nodemon src/server.js, http://localhost:5000
npm run check     # node --check src/server.js — quick syntax sanity check
npm run seed      # creates the first super-admin (from .env SEED_ADMIN_*)
npm run seed:<name>   # seed:team, seed:careers, seed:tenders, seed:panels, seed:engage-services,
                       # seed:prompts, seed:templates, seed:capabilities, seed:demo-articles
```
No backend test suite exists. Both apps need their own env file copied from
`.env.example` before running (`be/.env` needs `MONGO_URI` + AWS keys at minimum;
without S3 keys, upload routes 503 but everything else works).

## Architecture

### Backend (`be/src`)

Strict one-module-per-resource layout: `modules/<name>/` = `<name>.controller.js` +
`<name>.routes.js`, auto-mounted under `/api` by `routes/index.js`. **Read
`be/CONVENTIONS.md` before adding or editing a module** — it defines the required
imports, the `{ success, data, meta }` / `{ success, message, errors }` response
envelope (via `ok`/`created`/`noContent` and thrown `ApiError`), pagination
(`parsePaging`/`paginate`), the public-vs-admin auth pattern (`optionalAuth` vs
`protect` + `authorize(...)`), slug/publishedAt/audit-log handling on publish, and
S3 upload conventions. Full architecture + API surface + role model
(superadmin/editor/moderator) is documented in `be/README.md`.

### Frontend (`fe/src`)

One SPA, three independent route trees mounted in `App.jsx`: `/admin/*`
(`AdminRoutes.jsx`, CMS), `/learn/*` (`LmsRoutes.jsx`, student/instructor LMS), and
`/*` (public site). Each tree has its own auth session — **not** just one login:
- `src/api/client.js` keeps two separate JWTs in localStorage keyed by scope
  (`gp.admin.token` / `gp.learn.token`), derived from the current URL path, not a
  mutable global — so signing into one session can never silently clobber the
  other. Staff roles (superadmin/editor/moderator, matching `be/src/constants/roles.js`
  `STAFF_ROLES`) land in the admin scope; everyone else in the learn scope. A
  super admin browsing `/learn` falls back to reading their admin token (so staff
  can view instructor screens without a second account) but a real learner token
  in that slot always wins.
- `src/api/resource.js`'s `createResource(base)` generates the standard
  list/page/get/getBySlug/create/update/remove/uploadTo client for a REST
  resource; feature modules under `src/features/<name>/` extend it with
  resource-specific calls, wired up in `src/api/index.js`.
- Build-time feature flags live in `src/config/features.js` (e.g.
  `VITE_FEATURE_BID_WRITERS`, mirrored on the backend as `FEATURE_BID_WRITERS` —
  both sides must be flipped together, see `docs/GO-LIVE-BID-WRITERS.md`).

`src/features/<name>/` holds page-specific logic per site area (articles, courses,
tenders, forum, panels, prompts, templates, etc.); `src/pages/public/` and
`src/pages/system/` are route-level page components; `src/admin/` and `src/lms/`
have their own layout/components/pages trees parallel to the public site's.

Ad hoc Playwright scripts at the `fe/` root (`perf.mjs`, `isolate.mjs`,
`cross.mjs`, `.cx.mjs`) are manual profiling/screenshot tools, not part of the
build or CI — run individually with `node <script>.mjs` against a running dev
server, not part of the normal workflow.

## Branching & CI

`dev` → `review` → `qa` → `live`. Feature branches PR into `dev`. `ci.yml` runs
`fe` install + `npm test` on every PR targeting `dev`/`review`/`qa`/`live`.
`deploy.yml` fires on push to those same branches, one per GitHub Environment
(`live` requires a manual reviewer approval) — the actual deploy step is still a
placeholder (`TODO(deploy)`).
