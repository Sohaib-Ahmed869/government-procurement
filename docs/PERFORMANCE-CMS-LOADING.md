# Cutting the "Loading…" wait on CMS-driven pages

Findings from an audit of `fe/` and `be/` on 2026-09-01, ordered by how much
time each one buys against how much work it is. Every item names the file it
applies to, so none of this has to be re-found.

Two separate problems get confused with each other, and it is worth keeping
them apart:

* **How long the wait is** — everything below.
* **How the wait ENDS** — the content used to appear in one frame at full
  opacity. That is fixed (see the note at the bottom); it is a rendering bug,
  not a speed one, and no amount of the work below would have fixed it.

---

## 1. The API is on Render and may be cold — check this first

`fe/.env` points production at `https://government-procurement.onrender.com`.
An idle instance on Render's free and starter tiers is **spun down**, and the
first request after that pays for a full container start — commonly 30–60
seconds, during which every page on the site sits on "Loading…".

Nothing else in this document matters if this is what is being seen. Confirm it
with a cold request:

```
curl -s -o /dev/null -w '%{time_total}\n' https://government-procurement.onrender.com/health
```

Run it after an hour of no traffic, then again immediately. A first number in
the tens of seconds and a second under one second is a cold start, and the fix
is a paid always-on instance (or a scheduled ping every 10 minutes, which is a
workaround, not a fix — it keeps one instance warm and costs a request a
minute).

## 2. Compress the API responses — one line, biggest single win

`be/src/app.js` installs helmet, cors, morgan and a rate limiter, and **no
compression**. Every JSON body goes over the wire raw. Article and prompt
payloads are mostly prose, which gzips to roughly a fifth of its size.

```js
import compression from 'compression';   // npm i compression
app.use(compression());
```

## 3. Stop shipping full article bodies in list responses

`be/src/models/Article.js` stores `body` as rich HTML, and
`be/src/utils/pagination.js` selects no fields — so **every list response
carries the complete text of every article**.

The site then asks for a hundred of them at a time:

| Caller | Request |
| --- | --- |
| `fe/src/features/insights/components/InsightsGrid.jsx` | `articlesApi.list({ limit: 100 })` |
| `fe/src/features/articles/components/ArticleDetail.jsx` | `teamApi.list({ limit: 100 })` |
| `fe/src/features/team/components/TeamMemberDetail.jsx` | `articlesApi.list({ author, limit: 100 })` |

A cards grid needs `title, slug, overview, heroImage, category, publishedAt,
readingMinutes` and nothing else. Add a projection to the public list branch in
`be/src/modules/articles/articles.controller.js`.

One catch: `InsightsGrid.jsx` computes the reading time from `body` on the
client (`readingMinutes()`, line 91) and only falls back to the stored
`readingMinutes` field. Make the server keep that field accurate on save, then
delete the client-side counter — otherwise dropping `body` silently drops the
"4 min read" line from every card.

## 4. Let the browser cache public reads

Only `/files` sets a caching header today
(`be/src/modules/files/files.controller.js`: `public, max-age=86400`). Public
API reads set none, so a visitor moving between pages re-fetches the same team
roster and the same prompt library every time.

Published content changes a few times a week, so it can be cached hard and
revalidated in the background:

```js
// on public GET responses only — never on an authenticated read
res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
```

The second visit to a page then paints from cache with no request at all.

## 5. Give the frontend a request cache — DONE for the public lists

`fe/src/api/index.js` already had the right idea in `createCopyCache()`, used by
`heroCopyCache` and `capabilityCardsCache` — a module-level value that survives
navigation, so the second visit renders on the first paint and the network call
happens behind it. It is also the whole reason the Service Offering page never
flashed while every other page did.

`fe/src/api/cache.js` is that idea with a key on it, and the public listings now
seed their state from it: Team, Insights (page and homepage rail), Courses,
Q&A, Prompt Library, Templates, Jurisdictional Links, Panels, Tender Websites,
Find a Bid Writer, How to Engage Us and Careers. Measured against a 900ms API,
navigating between pages in one tab:

| | before | after |
|---|---|---|
| team, 2nd visit | content at 1058ms, empty space held | **95ms, none** |
| insights, 2nd visit | ~1200ms | **150ms** |
| courses, 2nd visit | ~1070ms | **94ms** |
| q-and-a, 2nd visit | ~1080ms | **95ms** |
| service-offering (was already cached) | 99ms | 110ms |

The first visit still waits for the network — items 1–4 and 7 are what shorten
that. Detail pages (an article, a course, one prompt) are deliberately NOT
cached: each is a distinct item, so the map would grow with every one opened
and the win is limited to re-opening the same one.

It is opt-in per read rather than wired into `client.js`, because a blanket
cache under every GET would also cache the CMS's own reads, where a list has to
be correct the instant after a save.

Still worth doing on top: sharing a request already in flight for the same key
(the Insights grid and the homepage rail both call `/articles`).

## 6. Split the bundle by route

`npm run build` produces:

```
dist/assets/index-BJQno-lN.js   1,293.36 kB │ gzip: 342.40 kB
```

There is no `React.lazy` anywhere in `fe/src`, so that one file contains the
public site, the whole CMS admin **and** the LMS. A visitor reading an insight
downloads and parses the course builder.

`fe/src/App.jsx` already has the seam — `/admin/*`, `/learn/*` and `/*` are
three separate route trees:

```jsx
const AdminRoutes = lazy(() => import('./routes/AdminRoutes.jsx'));
const LmsRoutes = lazy(() => import('./routes/LmsRoutes.jsx'));
```

The public bundle should land nearer 150 kB gzipped, which is roughly a second
off first paint on a phone connection. `jspdf` and `html2canvas` (129 kB and
47 kB gzipped) are certificate-rendering dependencies and belong behind the
same split.

## 7. Query-level fixes in the API

* **`.lean()`** — `be/src/utils/pagination.js` returns full Mongoose documents
  where the API only serialises them to JSON. `.lean()` skips hydration.
* **The count on every request** — `paginate()` runs `countDocuments` alongside
  every find. Public list endpoints that render everything they get back never
  read `meta`, so the count is pure cost there.
* **Indexes for the sorts actually used** — `Article` indexes `slug`, `status`
  and a text index. The public list filters `status: 'published'` and sorts
  `-publishedAt`, which wants a compound index:
  ```js
  articleSchema.index({ status: 1, publishedAt: -1 });
  ```
  Same shape for any other collection with a published-and-ordered list.
* **Region** — check the Mongo Atlas region against the Render region. A
  cross-region hop adds 100–200 ms to *every* query on the page.

## 8. Remove the fetch waterfalls

`fe/src/features/team/components/TeamMemberDetail.jsx` loads the profile, and
only then loads that person's articles, because the filter is their name. Two
round trips in series. Either return the articles with the profile from
`/team/slug/:slug`, or filter by the slug so both calls can start at once.

`ArticleDetail.jsx` already does this correctly — `Promise.all` on the article
and the team list — and is the pattern to copy.

## 9. Prefetch on intent

A card that links to a detail page can warm the cache on hover (`onMouseEnter`)
or on `pointerdown`. On a desktop that is 200–300 ms of head start, which is
usually the whole wait once items 2–5 are in.

---

## What was actually changed (the abrupt appearance)

The reveal animation is driven by an `is-in` class the section carries, with the
children transitioning under it (`fe/src/styles/reveal.css`). A section whose
body comes from the CMS is on screen and **empty** long before it has anything
to show, so the observer fired on the empty shell: the animation played over the
"Loading…" line, and the cards arriving a second later mounted into a section
that had already finished animating — painted at their final opacity in the
frame they mounted.

`useInView` and `useMountReveal` now take a `ready` flag, and each data-driven
section passes `status !== 'loading'`. The reveal is held until the content is
in hand and then plays normally.

Two CSS bugs surfaced while verifying it, both the same mistake: a reveal's
`transition` was **replaced** by a later, equally specific rule setting
`transition: var(--gp-fade)` for the segment recolour. A `transition` does not
merge — the winning declaration is the whole list — so `.browse-filters` (the
Prompt Library, Templates and Bid Writer rails) and `.gp-cta__button` were
transitioning colour only and snapping into place. Both reveal rules now carry
one extra class of specificity and repeat the properties they displaced.

Worth watching for: **any element given a reveal in one rule and a
`transition: var(--gp-fade)` in another has this bug.** A scan of `fe/src` finds
no others today.

### The "Loading…" lines, and the space they were not holding

The visible loading lines have since gone too — the fade is the arrival, and a
sentence that has to be cleared before it can play is a second arrival in front
of the first. `fe/src/components/shared/LoadingStatus.jsx` replaces all of them
and does two things a removed line stops doing:

* **Announces the wait.** The text survives in a `role="status"` live region
  styled `.gp-sr-only`, so a screen reader is still told the page is working.
  Rendered at all times with its text changing, rather than mounted with the
  message already in it — a live region has to be in the document before its
  contents change to be announced reliably.
* **Holds the page open.** `.page-layout` is a flex column a viewport tall, so
  a section with nothing in it yet let the footer's "Remain Connected" band
  ride up to the bottom of the window — and drop out of sight the moment the
  content landed. The component reserves a viewport (`.gp-hold`, divided by
  `--gp-scale` for the big-screen `zoom` subtree) while it waits, which puts the
  footer where the loaded page will put it. Measured on `/our-team` with a
  1.5s stall: the footer sat at y=268 on a 900px viewport and jumped to 1082
  when the data arrived; it now sits at 1168 and settles at 1082, both off
  screen, so nothing visible moves.

The hold belongs on a section whose content **is** the page — the listings, the
detail pages, the service rows. It is deliberately not on `CareersContent`,
whose static copy already gives that page its height: reserving a viewport there
would trade a 133px settle for a 500px one.
