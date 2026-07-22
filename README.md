# Government Procurement

Monorepo for the Government Procurement website.

```
.
├── fe/     Frontend — Vite + React 19 SPA (public site + admin/CMS UI)
├── be/     Backend — CMS API server (scaffold pending scope sign-off)
├── docs/   Client deck, design gap analysis, workflow guide
└── .github/workflows/   CI, nightly, deploy
```

## Frontend (`fe/`)

```bash
cd fe
npm ci
npm run dev      # Vite dev server
npm run build    # production build
npm run lint     # oxlint
```

## Backend (`be/`)

Not yet scaffolded — see [`be/README.md`](be/README.md).

## Branching

`dev` → `review` → `qa` → `live`. Feature branches open PRs into `dev`; review
gatekeeper approves before merge. See `docs/workflow-guide.pdf`.
