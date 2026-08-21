# Implementation Plan — Govt Procurement Tracker

**Source:** `docs/Govt-Procurement Tracker.xlsx` — sheet `Sprint 2 Website` (refs A1–A6, B1–B7) and sheet `LMS` (modules 1.0–22.0).
**Repo:** `fe/` (React 19 + Vite + react-router 7), `be/` (Express + Mongoose + S3).
**Branch:** `dev`.

## Working agreement

**Claude ticks the box when the work is done; you verify.** A ticked box means the code is written and builds — it is a request for review, not a claim that it is signed off. Untick anything that does not hold up and say why; it goes back in the queue.

Every item keeps its tracker ref (`A1`, `B4`, `LMS 14.0`) so this file and the spreadsheet stay in step. Once you have verified a ticked item, flip the matching row in the tracker to **Done**.

## Current scope

**Website only.** Phases 0–10 (tracker sheet `Sprint 2 Website`) are live work. Phases 11–16 (sheet `LMS`) are documented below but **parked** — nothing starts there until the website work is signed off.

Legend for the per-phase status column: `☐ not started` · `◐ in progress` · `☑ done` · `⏸ parked`.

### Progress summary

| Phase | Scope | Tracker refs | Items | Status |
|---|---|---|---|---|
| 0 | Stabilise working tree | — | 5 | ◐ awaiting your check |
| 1 | Homepage rebuild + global motion | A1, A2, A3, A4 | 24 | ◐ awaiting your check |
| 2 | Service Offering | A5 | 10 (+2 deferred) | ◐ awaiting your check |
| 3 | Procurement Advisor | A6 | 12 | ◐ awaiting your check |
| 4 | Article reading experience | B1 | 8 | ◐ awaiting your check |
| 5 | Government Panels page | B2 | 7 | ◐ awaiting your check |
| 6 | Local Government tender links | B3 | 6 | ◐ awaiting your check |
| 7 | AI Prompt Library | B4 | 9 | ◐ awaiting your check |
| 8 | Policies pages (shell) | B5 | 5 | ◐ awaiting your check |
| 9 | Templates library | B6 | 9 | ◐ awaiting your check |
| 10 | Find a Bid Writer | B7 | 9 | ◐ awaiting your check |
| 11 | LMS — compliance & security | LMS 1.0–4.0 | 10 | ⏸ |
| 12 | LMS — content & structure | LMS 5.0–9.0 | 11 | ⏸ |
| 13 | LMS — assessment & progress | LMS 10.0–12.0 | 9 | ⏸ |
| 14 | LMS — commerce | LMS 13.0–15.0 | 10 | ⏸ |
| 15 | LMS — engagement & delivery | LMS 16.0–18.0 | 8 | ⏸ |
| 16 | LMS — admin & integration | LMS 19.0–22.0 | 10 | ⏸ |

---

## Blocked / waiting on input

These are called out in the tracker's Dependencies column. Build the structure now, wire content in later — none of them should stall a phase.

- [x] ~~**Procurement Advisor rule file**~~ — received. `docs/procurementadvisor (1).html` is in the repo and is the working NSW reference. A6 is unblocked.
- [ ] **Home hero video** — stand-in footage in use until the real video arrives (A1.11). It is now on-brand boardroom footage rather than the unrelated sunset clip, so the hero reads correctly in the meantime.
- [ ] **Prompt Library — review the starter set (B4)** — 18 drafted prompts are seeded as drafts and visible to signed-in staff on `/prompt-library`. They have been written but not run against their tools. Read, try, edit, publish.
- [ ] **Tender portals — missing entries (B3)** — the Local Government links (Local Buy and equivalents), plus the absent federal AusTender and the VIC/WA/NT/ACT portals. Also a live test entry named `fsd` to delete. All CMS work; the code is in.
- [ ] **Government Panels — the actual panel list (B2)** — which panels and prequalification schemes the firm holds an appointment on, with agency, panel name and reference number. Cannot be defaulted or guessed: each row is a credential. The page ships with its empty state until this arrives.
- [ ] **Service Offering copy** for the six services — from Mohamed. A5.11/A5.12 are deferred on client instruction, so this blocks nothing right now.
- [ ] **Prompt Library "what to avoid"** — specifics on the `learnaiwithmariah.com/guides` result-display style to steer clear of.
- [ ] **Policies content** — rewritten Privacy, Terms and Conflicts of Interest copy from Mohamed. Structure is done and waiting; paste into the CMS page for each slug. Also clear the two seed stub records noted in Phase 8.
- [x] ~~**Templates sourcing + licensing sign-off**~~ — no longer a process risk to track: the publish gate is enforced in code (`Template.publishBlocker()`), so a document without a source, a licence and a named sign-off cannot be published at all. What remains is the content itself: sourcing the documents and doing the sign-offs.
- [x] ~~**Government Panels CMS feasibility + cost**~~ — resolved by client direction on 2026-08-19: the page is to be "updatable by you where feasible". The editable path is built. Feasibility was never the constraint — it is the same model/module/admin-screen shape as Jurisdictional Links — so the only open question is whether Mohamed wants the ongoing upkeep, which the CMS now makes his call rather than a developer's.
- [ ] **Find a Bid Writer go-live** — held until bid management companies are paying a placement fee (B7). The build is done and the switch is documented in `docs/GO-LIVE-BID-WRITERS.md`; nothing is needed from development to flip it.

---

## Client direction on A1–A6

Given by the user on 2026-08-18. This is the binding interpretation of the tracker rows — where it and the spreadsheet differ, this wins.

**Design source:** `fe/homepage-v2/index.html` is the homepage design inspiration; `fe/homepage-v2/palette.html` is the colour reference. Inspiration only — the header stays exactly as it is on the live site today (`fe/src/components/layout/Header.jsx`), not the one in the mockup.

**A1 — Homepage**
- Use any placeholder video in the home hero for now; the real one arrives later.
- Take the section structure from `homepage-v2/index.html`, **minus** three things:
  - the **stat rail** ("20+", "4", "2", "1") that sits directly under the hero — `index.html:1150`
  - the **Courses & Artefacts** card — `index.html:1276`
  - the whole **Our Offerings / "Where to start"** section — `index.html:1261`
- Keep the current site header as-is.

**A2 — Loader**
- A spinner built from the site logo, or whatever else fits the site. Not prescriptive beyond that.

**A3 — Toggle transition**
- Fade on **every** content switch, not just the homepage.
- The mockup jumps you back to the top of the page on switch — **do not** do that. Hold scroll position.
- The fade-in must play on each switch, every time.

**A4 — Colour**
- Use the shades defined in `fe/homepage-v2/palette.html`: two full ramps, `--award-*` (green family, mint accent, clay counterweight) and `--win-*` (ink family, amber accent, mint second accent). Each has five dark steps, three papers, a rule, two text greys and two accents, so the segment toggle recolours the whole page rather than only the dark bands.
- Values tagged **GP** in that file already ship in `fe/src/styles/tokens.css` and must not be changed; values tagged **new** are additions.

**A5 — Service Offering**
- Remove the eyebrow labels.
- Headings become "Service Offering: Win Contracts" and "Service Offering: Award Contracts" as written in the tracker.
- **Deferred for now:** the presentation concepts (A5.9) and the content-ready page structure (A5.10) — leave both.
- Make the matching changes in the CMS.
- Show **all six services under both** Win and Award for now.

**A6 — Advisory**
- Add **Advisory** as a nav item in the header.
- `docs/procurementadvisor (1).html` is the inspiration for the page, but the theme, tokens and typography come from our site — not from that file.
- Landing state: **three boxes**. NSW is live and opens the stepper form driven by the supplied HTML logic. The other two read **"Coming soon"**.
- The form is a **stepper**.
- Rules must be swappable and controllable through the CMS.

---

## Phase 0 — Stabilise the working tree

The uncommitted refactor on `dev` leaves `fe/src/App.jsx` importing two pages that do not exist yet, so the frontend does not build. Clear this before anything else stacks on top of it.

- [x] Create `fe/src/pages/public/ServiceOfferingPage.jsx` (imported by `fe/src/App.jsx:3`) — renders the A5 heading per segment plus the existing `ServiceGrid`, with `ServiceOfferingPage.css` for the frame. Phase 2 does the differentiation work.
- [x] Create `fe/src/pages/public/ProcurementAdvisorPage.jsx` (imported by `fe/src/App.jsx:4`) — stub with the three jurisdiction boxes and the A6 disclaimer. Phase 3 brings the stepper.
- [x] Resolve the deleted `fe/src/features/advisory/*` components — `src/admin/pages/CapabilitiesPage.jsx` was still importing the deleted `capabilityIcons.js`; repointed to `features/serviceOffering/serviceIcons.jsx` and switched the table's icon cell from `<img src>` to `<CapabilityIcon>`, since the new set is drawn marks rather than PNGs. `AdvisoryServicesPage.jsx` / `.css` deleted as superseded, and the now-empty `features/advisory/` removed.
- [x] `npm run build` in `fe/` passes clean — 375 modules, no errors. `npm run lint` exits 0 (pre-existing warnings only, none in the touched files). `npm run check` in `be/` passes.
- [ ] Commit the in-flight homepage work (`SiteLoader`, `home.css`, `TenderPortalsBand`, `TrustedPartner`, `HomeServiceOffering`, `features/serviceOffering/`). **Left for you** — say the word and I'll commit.

**Verified:** `/service-offering`, `/advisory`, `/admin/capabilities` and `/` all render with zero JS console errors (Playwright smoke test against the dev server). Service Offering shows all six services under the correct segment heading; Advisory shows NSW plus two "Coming soon" boxes and the disclaimer.

**Exit criteria:** `fe` builds, `be` starts, `dev` is green. ✅

---

## Phase 1 — Homepage rebuild and global motion (A1–A4)

Benchmarks: mckinsey.com/au, fticonsulting.com/australia. Video treatment: deloitte.com/au, pwc.com.au. Design source: `fe/homepage-v2/index.html` and `palette.html`.

### A1 — Single-page homepage
- [x] **A1.1** Restructure `fe/src/pages/public/HomePage.jsx` into one continuous page composed of anchored sections (an `id` per section). Ids live in `features/home/sections.js`, which the header imports too, so the page and the ribbon cannot drift.
- [x] **A1.2** Section set ported from `homepage-v2/index.html`: Hero → Trusted Partner → Service Offering → Tender portals → Insights → Founder quote → Careers → Contact. Four new components: `InsightsBand`, `FounderQuote`, `CareersBand`, `ContactBand`.
- [x] **A1.3** **Omit** the stat rail under the hero — verified absent from the rendered page.
- [x] **A1.4** **Omit** the Courses & Artefacts card — verified absent. `UnlockPotential.jsx` (the old courses band) deleted.
- [x] **A1.5** **Omit** the whole Our Offerings / "Where to start" section — verified absent.
- [x] **A1.6** Header left exactly as it is today — the mockup's header is not adopted. Only link *behaviour* changed on the homepage (A1.7); nothing visual.
- [x] **A1.7** Top ribbon nav scrolls to sections on the homepage — verified: clicking "Careers" moved scroll 0 → 4658 and set `#careers` with no route change.
- [x] **A1.8** Smooth scroll plus scroll-spy (`hooks/useScrollSpy.js`) — verified: "Careers" was the lit nav item after scrolling to it.
- [x] **A1.9** Ribbon reverts to routed links off the homepage — verified: on `/careers` the nav hrefs are all routes, no anchors.
- [x] **A1.10** Deep links resolve on cold load (`hooks/useHashScroll.js`, which re-checks while the fetching bands grow) — verified: `/#insights` landed with the section top at exactly 116px.
- [x] **A1.11** Video-led hero — **stand-in video in place** (`src/assets/HeroVideo.mp4`, licensed boardroom footage: advisers with tender documents, city skyline behind, held until the real footage arrives). 1080p, silent, 13s, 4.0 MB. Poster is its own first frame (`src/assets/images/HeroPoster.jpg`), so the still and the footage are the same shot. Verified playing, muted, looping, with poster fallback. Swap it via the CMS `videoUrl` or by replacing the import.

### A2 — First-load animation *(depends on A1)*
- [x] **A2.1** Loader is a logo-based spinner in `fe/src/components/shared/SiteLoader.jsx` — two counter-rotating accent rings around the mark, painted in the active segment's ramp.
- [x] **A2.2** Plays once per tab (`sessionStorage`), never on client-side navigation — it sits outside `<Routes>` and the router never remounts it.
- [x] **A2.3** Dismisses on `load` with a 900ms floor and a 3500ms ceiling, so it can neither flash nor trap.
- [x] **A2.4** Skipped under `prefers-reduced-motion`, and now for `/admin` and `/learn` — **this was missing**; the loader was showing in front of the CMS login. Added `NO_LOADER_PATHS`.

### A3 — Award / Win toggle transition
- [x] **A3.1** Cross-fade on audience switch — verified: main opacity drops to 0.01 and returns, `data-audience-swap` goes `out` → `in`.
- [x] **A3.2** Applies site-wide — the rule targets `.page-layout__main` and the footer in `index.css`, so every page using `PageLayout` gets it.
- [x] **A3.3** Fade replays on **each** switch — verified across two consecutive toggles.
- [x] **A3.4** Scroll position **held** — verified: 3908 → 3908, zero drift.
- [x] **A3.5** Timing and easing centralised in `fe/src/constants/motion.js`.

### A4 — Colour ramps
- [x] **A4.1** Both ramps ported into `fe/src/styles/tokens.css` — `--gp-award-*` and `--gp-win-*`, five dark steps, three papers, a rule, two text greys and two accents each.
- [x] **A4.2** **GP**-tagged values reused by reference (`var(--gp-green-900)` etc.) rather than restated, so they cannot drift.
- [x] **A4.3** The toggle recolours the whole page — role tokens resolve papers, rules, ink and muted, not only the dark bands.
- [x] **A4.4** Contrast audited against WCAG AA — 22 foreground/background pairs computed. **4 failed**; see below. All 22 pass now.

**A4.4 — the contrast failure, and the fix.** `--gp-accent` and `--gp-accent-warm` are tuned for dark bands and fail badly as text on the paper steps: award clay measured **3.71:1** on paper, and win mint **1.28:1** on paper-alt — effectively invisible. A new role token `--gp-accent-ink` carries a darkened accent for text on light surfaces (award `#8a4522`, win `#1a5c3f`, both ≥5.5:1 against the worst paper). Applied to `.hm-arrow`, `.ib__topic`, article hover titles, `.ct__label`, `.ct__rows a:hover`, `.sg__no` and `.pa-card__code`. Decorative marks keep the bright accent — they carry no information alone.

**Verified:** all 8 sections render; the three omitted blocks are absent; no "Capabilities" text anywhere; zero JS console errors across the homepage, `/#insights` deep link and `/careers`. Build passes, lint reports zero errors.

**Two fixes made along the way, both found by looking at the rendered page:**
- `.hm-band__head` carried `max-width: 760px` while also being an `.hm-shell` (`margin-inline: auto`) — the combination centred every band heading instead of left-aligning it. The measure now sits on the title and lede.
- `CareersBand` read `o.summary`/`o.location`; the field on `JobOpening` is `description`, so live openings rendered with no body text.

**Exit criteria:** the homepage scrolls as one page from the ribbon, the loader plays once, the toggle fades without moving the scroll position. ✅ *(CLS on mobile not separately measured — flagged below.)*

---

## Phase 2 — Service Offering (A5)

The rename is already in progress in the header and the router; the differentiation and the six-service list are not.

- [x] **A5.1** No "Capabilities" heading anywhere user-facing — verified: zero matches for /capabilit/i in the rendered page text, in either segment. Admin sidebar and page-title map both say "Service Offering". *(The bullet "Capability building across the function" in Trusted Partner stays — that is the ordinary noun, not the page name.)*
- [x] **A5.2** `/capabilities` → `/service-offering` verified live. The admin route was renamed too: `/admin/service-offering`, with `/admin/capabilities` redirecting so an editor's bookmark still lands.
- [x] **A5.3** Headings verified as **"Service Offering: Award Contracts"** and **"Service Offering: Win Contracts"** — on both the page and the homepage band.
- [x] **A5.4** No eyebrows on the page. The CMS "Capabilities hero" editor (which edited an eyebrow and heading) has been removed — the headings are fixed by the brief, so it had nothing left to edit.
- [x] **A5.5** Visually differentiated — measured, not asserted. Award: mark on a `paper-deep` chip, 3px spine down the left edge. Win: mark on a filled `brand` chip, 3px rule across the top, `paper-alt` card.
- [x] **A5.6** Structurally differentiated — the six run in a **different order** per segment and carry different stage labels. Award reads as the stages of a procurement (`Before market → Throughout → To market → Assessment → Award and handover → In life`); Win reads as the points a bidder meets them (`Before the tender drops → While the tender is open → Response and shortlist → Mobilisation → Throughout → In life`). Award numbers them 01–06; Win hides the index, because for a bidder they are not a sequence.
- [x] **A5.7** All six listed and scannable — verified rendering in both segments.
- [x] **A5.8** All six under **both** segments — verified, 6 cards each.
- [x] **A5.9** Rendered from `services.js` with icons from `serviceIcons.jsx`.
- [x] **A5.10** CMS reworked — see below.

**A5.10 — what the CMS needed.** Three things were broken or missing, not just mislabelled:
- `Capability.icon` was an enum of three (`target`, `document`, `graph`), but four of the six services use `shield`, `flow`, `scales` and `handover`. **Saving a card for any of those four would have failed validation.** The enum now carries all seven marks.
- There was no `key` field, so a card could only bind to a service by having its title slugify to the right value. Added, with `''` allowed so pre-rename cards still validate, and wired through the controller's `EDITABLE` list.
- The admin page is `ServiceOfferingAdminPage.jsx`: a **Service** select bound to the six keys, and the Order field removed — the order is fixed per segment by the brief and lives in `services.js`, so a control that looked like it reordered the page but didn't was worse than none.

**One regression found and fixed.** `ServiceGrid`'s items carry `hm-reveal`, which resolves `opacity: 0` until an ancestor has `is-in`. That was harmless while `home.css` was imported nowhere, but once the homepage started importing it every stylesheet landed in one bundle — and the standalone Service Offering page, which never set `is-in`, **rendered six invisible cards**. The page now drives the reveal with `useInView`, keyed on the audience so the six replay on a switch.

**Deferred — not in this pass:**
- [ ] ~~**A5.11** Present 2–3 presentation concepts for sign-off (refs: procurementco, amplifyprocurement, infosysbpm).~~ *Deferred on client instruction.*
- [ ] ~~**A5.12** Page structure left content-ready with a slot per service for long-form copy.~~ *Deferred on client instruction.*

**Exit criteria:** the rename is complete everywhere including the CMS, both audiences show all six services, and the eyebrows are gone.

---

## Phase 3 — Procurement Advisor (A6)

Self-contained, rules-based, **no AI and no data storage**. `docs/procurementadvisor (1).html` (4,282 lines, NSW) is the reference implementation — a standalone HTML file with its own tokens, step container and result container.

- [x] **A6.1** **Advisory** in the header nav.
- [x] **A6.2** `fe/src/pages/public/ProcurementAdvisorPage.jsx` at `/advisory` and `/advisory/:jurisdiction`. A non-live jurisdiction in the URL redirects to the picker rather than showing a tool that cannot run.
- [x] **A6.3** Three boxes. NSW is a `<button>`; the other two are plain `<div>`s reading only **"Coming soon"** — no jurisdiction named, since which one comes next has not been decided. Not focusable, so a keyboard user is never offered a control that does nothing. The picker fills the row from `PICKER_SLOTS`, so adding a jurisdiction removes a placeholder rather than needing the layout changed.
- [x] **A6.4** Stepper with a progress rail, Back/Next, and required-field validation. Verified it refuses to advance with a required question unanswered.
- [x] **A6.5** NSW logic ported and working end to end. See below.
- [x] **A6.6** Theme is entirely our tokens — the reference file's serif/brass statutory-instrument styling is not carried across. Follows the Win/Award toggle like any other page.
- [x] **A6.7** Rules editable from the CMS as a versioned overlay merged over the built-in pack. See the note below on what is and isn't editable.
- [x] **A6.8** Admin screen at `/admin/advisory-rules` — versions accumulate, exactly one per jurisdiction is published, any earlier one can be published again. The published version cannot be deleted.

**The page opens on the rules themselves.** "Rules in use now" lists all 22 figures in their 9 groups, read-only, above the change history — because the CMS only stores *changes*, so without it the page is empty on day one and the actual rules are only visible from inside the "New version" form. It shows the built-in figures when nothing is published, and marks any a published version has moved (with the old value struck through) once one is.

**The form is plain fields, not JSON.** The first version of this screen asked for two blocks of JSON, which is fine for whoever wrote the rule pack and unusable for the person who actually keeps thresholds current — and a stray brace would have silently published nothing. Every one of the **22 thresholds** now has a plain-English label, an explanation of what it controls, and its current value shown beside the field (`Now: ,000`), grouped into 9 sections. All 45 cited sources get a Title / Web address / Last checked form. Inputs accept `680000`, `,000` or `680,000`; a blank field means "unchanged" rather than zero, so a version carries only what actually moved.
- [x] **A6.9** Zero persistence — **verified**, not assumed: a full run of the tool issued **no non-GET requests at all**, and `localStorage`/`sessionStorage` hold no advisor keys. Answers live in component state and nothing else.
- [x] **A6.10** Disclaimer shown before the first question **and** again on the result. Wording is the tracker's: "This tool is not AI-powered. No data is stored or used for training." An earlier version added a "guide, not legal advice" line and an explanation of how the tool works — neither was asked for, and both were removed.
- [x] **A6.11** Given a surface and an accent edge rather than set as small print.
- [x] **A6.12** Verified at 360px — no horizontal overflow (`scrollWidth` 360), the progress rail becomes a horizontal strip. Fully keyboard-operable: reached and opened NSW with Tab/Enter, answered a question with Tab/Space, focus ring visible on options.

**How A6.5 was done.** The reference file is already three clean layers — a data-first NSW rule pack, a pure `evaluate(rules, answers)` engine, and a vanilla-JS UI. The first two were extracted as ES modules (`features/advisor/rules/nsw.js`, `features/advisor/engine.js`) with only the `window.PAA` globals swapped for exports, so the decision logic is the reviewed original rather than a re-implementation of it. Only the UI layer was rewritten in React. The pack is lazily imported — a thousand lines of rules and citations should not be in the main bundle for visitors who never open the tool.

Verified against a real run: 5 pathways returned with statuses (Mandatory / Available / Conditional), 12 obligation groups, and **36 source links**, each finding carrying its basis and a confidence level.

**A6.7 — what is editable, and what deliberately is not.** The two halves of the brief ("swappable rule files" and "controllable through the CMS") pull apart, and this is where they were resolved. The advisor's *logic* — which question follows which, how a pathway is ranked, what counts as a ground for direct negotiation — stays in code, reviewed in code. A form that could redefine control flow is a code editor with none of the safeguards of one, and a wrong edit there produces confident wrong advice about public money.

What changes when policy moves is the numbers and the citations, which is what the rule pack's own header says: edit the threshold, update `asAt`, bump the version. So the CMS holds a versioned overlay of **thresholds and source metadata** per jurisdiction (`RulePack` model, `/api/rule-packs`), merged over the built-in pack at runtime. A threshold change is published from the CMS with no deploy.

Two guards on the merge, both verified: an overlay can only set a threshold key the pack already defines (an unknown key is ignored rather than appearing to take effect), and only `title` / `note` / `url` / `asAt` on a source — the quotes a finding cites are evidence and are not editable from a web form. A missing or failed overlay is not an error: the built-in pack is complete, so a CMS outage cannot take the advisor down.

**Verified end to end:** publishing an overlay setting `agencyThreeQuotes` moved it from 680,000 → 999,999, `asAt` from 2026-08-04 → the overlay's date, and the bogus key was correctly ignored. The staff endpoints return 401 unauthenticated.

**Exit criteria:** ✅ NSW answers correctly in our theme, the other two read "Coming soon", the disclaimer always shows, and a rule change lands from the CMS with no deploy.

⚠️ **The backend needs a restart** to serve `/api/rule-packs` — the running process predates the new routes and did not pick them up. I verified the endpoints on a scratch port rather than restart your server.

---

## Phase 4 — Article reading experience (B1)

Ref: mckinsey.com/au, "Australia's grid opportunity". Files: `fe/src/features/articles/components/ArticleDetail.jsx` — a `ShareRow` with copy-link already exists at line 32.

- [x] **B1.1** Progress measured against the **article body**, not the document (`hooks/useReadingProgress.js`). Verified the two genuinely differ: at 75% of the page the article is already finished, because the related grid and footer follow it. Document scroll would have read 75%.
- [x] **B1.2** Re-measures on scroll, resize, **and content growth** — a `ResizeObserver` on the body plus `load` on every image, because an image arriving changes the height without firing either of the other two. Coalesced to one measurement per frame.
- [x] **B1.3** Title pinned in a bar directly under the site chrome, held for the whole article. **The bar is a sibling of `<article>`, not a child** — a sticky element only sticks inside its own container, so nested it came unpinned the moment the article ended, which is a scroll depth a reader is easily still at. Verified pinned at 30/60/85%; it releases as the footer arrives, which is the intended boundary.
- [x] **B1.4** Verified at 390px: no horizontal overflow, and the bar sits at exactly the chrome's bottom edge. Title keeps its line, actions scroll horizontally under it.
- [x] **B1.5** LinkedIn, X and email alongside copy-link. The old share row below the byline is gone — it was only reachable by scrolling back to the top, which is the moment a reader is least likely to want to share something they have not read.
- [x] **B1.6** Print stylesheet drops the chrome, the bar and the related grid, forces black on white, and adds `orphans`/`widows`, `break-inside: avoid` on figures and tables, and prints the target of external links. Verified in print emulation: bar, header, footer and related all hidden; prose visible in black.
- [x] **B1.7** Download opens the browser's print pipeline with `document.title` set to the article slug, which is what names the file. See the note below.
- [x] **B1.8** All six actions verified keyboard-reachable **mid-article** (LinkedIn, X, Email, Copy link, Print, Download PDF).

**B1.7 — a real download.** Pressing Download writes a PDF to disk with no dialog. It is built from the article's DOM with `jspdf` (dynamically imported, so nobody who never presses it pays for it), writing each heading, paragraph and list item **as text**. The usual client-side route, `html2canvas` into jsPDF, screenshots the page: the text stops being text and a short article becomes several megabytes. Measured on the demo article: **17KB, 3 pages, `%PDF-1.3`, title present as selectable text**, source URL and page numbers in the footer. Print is separate and opens the browser dialog, which is where the paper options live.

**The bar follows the supplied reference:** title on the left, three icon-and-label actions on the right, and the reading progress drawn as a single rule along the bar's bottom edge. **Share** opens a menu (LinkedIn, X, Facebook, Email, Copy link) that closes on Escape or a click away; **Print** opens the browser dialog; **Download** writes the file. The bar sits flush under the site chrome — verified `gap: 0` between the chrome's bottom edge and the bar's top.

**Shades down the page (matching the homepage).** The article page was one flat surface from hero to footer. It now runs dark hero → paper body → paper-alt related grid, so the body is light with dark ink, which is both what the reference does and the right ground for a thousand words of prose. All three resolve segment tokens, so the page still follows the Win/Award toggle.

**A second bug found while testing, and it was hiding entire articles on phones.** `useInView` defaults to `threshold: 0.15`, and the element being watched is the whole article. Measured: on a 780px phone viewport the article is **7356px tall, so at most 10.6% of it is ever on screen** — under the threshold, so the observer never fired, `.article-body` stayed at `opacity: 0`, and **the article was invisible**. Desktop escaped it only because a 900px viewport covers 22.5% of the shorter desktop layout. The observer now uses `threshold: 0`: any part of the article arriving is the right trigger for "start reading". Verified `is-in` true and body opacity 1 on both viewports.

**A readability bug found while testing, and fixed.** The demo article's body carries **48 elements with inline `color: rgb(0, 0, 0); font-family: "Times New Roman"`**, pasted in from Word. The article page is set on a dark ground, so that text was black on dark green and effectively invisible — an article can look fine in the editor and be unreadable on the site. `.article-prose [style]` now forces `color` and `font-family` back to inherit; bold, italic, alignment, lists and links all survive. The better fix is to strip pasted formatting on save in the CMS editor, which is a change to the editor rather than to how this page renders what it is handed.

**Exit criteria:** ✅ progress tracks the article, the title stays with the reader, and share/print/download all work.

---

## Phase 5 — Government Panels page (B2)

Ref: procurementco.com.au/government-panels — capture supplied 2026-08-19. Client direction: *"A new page listing current panels and prequalification schemes, organised by jurisdiction and easy to scan, updatable by you where feasible. Modelled on a clean list format."*

**The reference resolved what the tracker row left open, and it changes the page.** B2 reads as a directory of panels a supplier might apply to. It is not: the reference is a **credentials page**. Its lede is "Procurement Co … can be engaged through a range of panels", and every row is a panel *they hold an appointment on* — `Australian Federal Police – Capability Support Services Panel (SON 3538332)`. The page's job is "you can buy our services without running a procurement". Confirmed with the client 2026-08-19, along with dropping the filtering.

- [x] **B2.1** *(gate)* Answered by the direction above: the page is to be updatable, so the editable path was built. No feasibility risk to price — it is the same model → module → admin-screen shape as Jurisdictional Links. What is Mohamed's call is the upkeep, and the CMS is what makes it his call rather than a developer's.
- [x] **B2.2** `be/src/models/GovernmentPanel.js` — group, groupOrder, agency, name, reference, sourceUrl, order, status. **`group` is free text, not the `RULE_STATES` enum the tracker assumed.** The reference's headings are mostly jurisdictions but not always: *Toowoomba Regional Council* has a heading of its own, and *Blacktown City Council* sits under NSW. A fixed enum of nine states cannot express either.
- [x] **B2.3** `be/src/modules/panels/` — public `GET /panels` under `optionalAuth` (anonymous sees published only; staff also see drafts), editor/superadmin CRUD. Unpaginated and unfiltered by design.
- [x] **B2.4** `/government-panels` — headings in curated order, one line per entry: *agency – panel name (reference)*. **No filters** — see the note below.
- [x] **B2.5** Route, header nav entry, footer entry in both the segment columns and the flat mobile rows. **No sitemap was touched — the repo has none** (`fe/public` holds only favicons and `icons.svg`). The footer is the site's index and now carries the page. Flagged rather than silently skipped.
- [x] **B2.6** `fe/src/admin/pages/PanelsAdminPage.jsx` at `/admin/panels`, in the sidebar under Content. Every field on the model is editable.
- [x] **B2.7** `be/src/seed/seed-panels.js` — **ships empty on purpose.** See below; this is the one item needing action outside the code.

**Reference numbers are a field, not part of the name.** `SON 3538332`, `SCM 0005`, `VP262666`, `TR-0578` — on every row in the reference, and the thing a client quotes to buy through the arrangement. Held separately so it can be styled back from the name and searched on later without parsing brackets.

**No filtering, per the client.** The earlier build had type pills, a category dropdown, jurisdiction chips and a search box. All removed. This is a credentials list of a few dozen rows read top to bottom by someone looking for the one arrangement they already buy under; a filter bar over it is furniture in front of the content. The shared `FilterSelect` control built for it was deleted rather than left unused — `JurisdictionsList` still has its own local copy, which is where it started.

**Two fields were dropped as meaningless here, not merely unused.** `intake` ("open to new suppliers") and `category` belong to a directory of panels to *apply to*. On a page listing panels we already hold, "open to new suppliers" is not a fact about us.

**⚠️ The seed ships empty, and it must.** Which government panels the firm holds an appointment on — and under which contract number — is a claim about the business that cannot be inferred from the codebase. An earlier draft of this file did seed nineteen plausible entries; **they were removed**, because a placeholder here is a fabricated credential: a live page asserting panel appointments the firm may not hold, quoting reference numbers a client could try to buy through. `seed-panels.js` now carries the format, a worked example and an upsert loop, and exits with instructions when run. **The page will show its empty state until someone supplies the real list** — either into `PANELS` in that file, or straight into the CMS.

**`group` is free text, so the one real risk is a typo making a second heading.** The admin field is backed by a `<datalist>` of the headings already in use, so picking an existing one is a click and only a genuinely new heading is typed. Heading order lives on each entry as `groupOrder`; where entries under one heading disagree the **lowest wins**, so a single row left at the default cannot drag a whole heading to the top.

**Verified against a running server** (spare port, dev server untouched): anonymous `GET /api/panels` returns published rows only — a draft row was inserted and correctly withheld; headings come back in `groupOrder` and entries in `order` within them; a free-form `Toowoomba Regional Council` heading round-trips; unauthenticated `POST` → 401. Test rows removed afterwards.

**Exit criteria:** Mohamed adds a panel in the CMS and it appears on the public page without a deploy. ✅ path verified end to end. **Blocked on content, not code:** the real panel list.

---

## Phase 6 — Local Government tender links (B3)

Files: `fe/src/pages/public/TenderPortalsPage.jsx`, `fe/src/features/tenders/components/TenderPortals.jsx`, `be/src/models/TenderSite.js`. Client direction 2026-08-19: *"A Local Government section added between the Federal and State sections. The Login Required indicator corrected to show only for South Australia, removed elsewhere."*

**Placement was confirmed rather than guessed.** B3.3 as written says the section goes between "Other Useful Links" and "State and Federal Government Links" — neither of which exists on the page. The page has one combined list under the h1, then "Other Tender Websites". The client's note said "between the Federal and State sections", but those are not two sections either. Confirmed 2026-08-19: **Local Government goes after the combined Federal/State list and before Other** — the natural tier order, and it needs no re-tagging of existing entries.

- [x] **B3.1** `TENDER_SITE_GROUPS` in `be/src/models/TenderSite.js` is now `['australian', 'local', 'other']`, ordered as the page renders them.
- [◐] **B3.2** The section is built and renders as soon as entries are filed under it. **The links themselves are not in yet** — see the note below; this is the one item still open.
- [x] **B3.3** Rendered order verified in the JSX, not just the data: Federal/State list → `<h2>Local Government</h2>` → `<h2>Other Tender Websites</h2>`. Each heading is drawn only when its group has entries, so the page never carries an empty heading.
- [x] **B3.4** Audited against the live data: `loginRequired` is set on **South Australia and nothing else**. Confirmed by query, not by inspection.
- [x] **B3.5** The suffix on the button labels — see below.
- [x] **B3.6** `local` is selectable in `TendersAdminPage.jsx` as "Local Government". No third branch was needed: the form and save payload already test for `other` and treat everything else as a government tier, which is exactly what a local entry is.

**B3.5 — the existing button-label style is kept.** `(Login Required)` is appended to the **Open Tenders** and **Upcoming Tenders** labels, driven by the "Listings need a sign-in" tick in the CMS. *Create Free Account* never carries it — creating an account is the thing you do because of the wall, not something behind it.

I briefly replaced this with a separate padlock badge on the card and **that was wrong** — the client confirmed 2026-08-19 that the label style is the one to keep. Reverted; the badge and its CSS are gone.

**The CMS hint now says what the rule is.** It read "Adds (Login Required) to the Open and Upcoming Tenders buttons." It still says that, and now adds that South Australia is today the only portal that qualifies and every other jurisdiction must be left unticked — so the correction holds the next time somebody adds a portal.

**One data fix applied, on your instruction.** `SA Tenders and Contracts` was subtitled **"NSW State Government"**. Corrected to "South Australian State Government". Verified before and after.

**⚠️ Two things left alone deliberately, both flagged at the time:**
- A live entry named **`fsd`** with subtitle **`sdf`** sits in the `other` group and renders on the public page. Left in place per your instruction; it is test data and should be deleted.
- The federal and several state portals are **missing entirely** — the list holds only NSW, QLD (×2), TAS and SA. No AusTender, VIC, WA, NT or ACT.

**⚠️ B3.2's content half is outstanding.** The Local Government section renders nothing until entries exist. I did not seed Local Buy and its equivalents: those are real URLs to real organisations, and the same rule applies as on the panels page — an unverified link on a procurement site is worse than no link. Say the word and I will draft the full set (Local Buy QLD, LGP NSW, MAV VIC, WALGA WA, LGA Procurement SA and the rest) as inactive entries for you to verify and switch on. Note also that **VendorPanel belongs in `other`, not `local`** — it is the paywalled operator the existing default disclaimer already names.

**⚠️ The page h1 is now slightly narrower than the page.** It reads "Explore Federal, State and Territory Tender Websites", which named the whole page when the page was one list. With Local Government added it no longer covers everything below it. Left as-is because it is the page's visible heading and a copy decision; worth a one-line change when you next touch the page.

**Exit criteria:** all jurisdictions listed, SA correctly marked, section in the right position. ✅ position and SA marking done and verified. **Blocked on content:** the local government links themselves, and the missing federal/state portals.

---

## Phase 7 — AI Prompt Library (B4)

Structure: **Main Topic (Award / Win / Other) → Use Case → AI Tool**. Tools limited to ChatGPT, Claude and Gemini. Client direction 2026-08-19: *"A new page of master prompts and use cases… Laid out on the Courses page structure with easy copy, avoiding the result display style you disliked."*

- [◐] **B4.1** *(gate — still open)* The specifics of what to avoid from `learnaiwithmariah.com/guides` never arrived, so the display was designed against the principle rather than the example. See the note below; it now gates a styling review, not the build.
- [x] **B4.2** `be/src/models/Prompt.js` — mainTopic, useCase, useCaseOrder, tool, title, body, notes, order, status. Topic and tool are enums; **useCase is free text**, because nobody can enumerate use cases up front and a new one should not need a deploy.
- [x] **B4.3** `be/src/modules/prompts/` — public `GET` under `optionalAuth` (anonymous sees published only), editor/superadmin CRUD, mounted at `/api/prompts`.
- [x] **B4.4** `/prompt-library` — the three levels are in the layout, not just the data. Results print as Main Topic → Use Case → cards, each tagged with its tool. **Filtering narrows, it never flattens**: filter to one use case and you still see the topic it belongs to.
- [x] **B4.5** Filters live in the URL (`?topic=&use=&tool=`), combinable. Held in the URL *only* rather than mirrored into state — two copies is how a filter and its URL drift apart. `replace` rather than `push`, so dragging down a radio list does not stack history entries.
- [x] **B4.6** One-click copy per prompt: label flips to "Copied", icon becomes a tick, and a `role="status"` live region announces it. Falls back to a hidden textarea where `navigator.clipboard` is unavailable, so the button is never a dead end.
- [x] **B4.7** Deliberately distinct — see below.
- [x] **B4.8** `fe/src/admin/pages/PromptsAdminPage.jsx` at `/admin/prompts`, in the sidebar under Content. Both order fields are editable and shown paired in the table.
- [x] **B4.9** Route, header nav, footer (segment columns + flat mobile rows). **No sitemap — the repo has none**; the footer is the site index and carries the page.

**Laid out on the Courses page structure, as instructed.** Same 220px filter rail beside a `minmax(0,1fr)` results column, same 56px gap, same shell, and the same slide-up filter panel on phones. The sidebar order mirrors the hierarchy — topic, then use case, then tool — so reading down the filters teaches the structure. The one departure is the ground: Courses is dark, this is paper, because the page is mostly prompt text and a block of monospace wants a reading surface.

**B4.7 — what the display deliberately is not.** Without the specifics from B4.1, the rule applied was: **the library ships prompts, not answers.** So there is no chat mock-up anywhere — no assistant avatar, no simulated reply, nothing dressed as a conversation that already happened. Showing an invented answer would set an expectation no prompt can guarantee, and it is the failure mode most "AI prompt guide" pages fall into. The prompt is on the card in full, as plain monospace text you read before you take it. If the flagged reference turns out to have been objectionable for some *other* reason, this is a styling pass rather than a rebuild.

**Monospace and `pre-wrap`, and that is functional.** A prompt carries deliberate line breaks and `{{PLACEHOLDER}}` markers. A proportional paragraph hides both, and what gets copied would stop matching what is shown.

**`notes` is never copied.** The clipboard gets `body` alone, so an editor guidance note about a prompt cannot end up pasted into the tool as part of it. The CMS hint says so.

**Filter counts are honest.** Each option count is computed against the *other two* filters, not the whole set — a count that ignores the current filters promises results the click cannot deliver. Use cases that would return nothing are dropped from the rail rather than shown at zero.

**Tool tags take the segment ramp, not vendor colours.** Three outside brand palettes dropped onto this page would fight both segments at once, so the three are told apart by fills drawn from our own ramp.

**Verified against a running server:** anonymous `GET /api/prompts` returned 4 of 5 rows with the draft correctly withheld; the hierarchy came back grouped and ordered (topic → useCaseOrder → useCase → order → title); `?tool=claude` filtered to 2; unauthenticated `POST` → 401. Test rows removed afterwards.

**A starter set is seeded, as drafts.** `npm run seed:prompts` loads 18 prompts across 12 use cases: 8 under Award, 7 under Win, 3 under Other, spread across all three tools. They are **written but not run** — each is assigned to the assistant whose behaviour it suits, but none has been executed against that tool and had its output judged, which is the review step nobody else can do. Every prompt touching rules, thresholds or obligations carries a verification caution in `notes`, which shows on the card and is never copied.

All 18 are DRAFTS, so the public page still shows its empty state; signed-in staff see the full set on the live page. Verified: anonymous `GET /api/prompts` returns 0.

**Exit criteria:** a visitor filters to a use case, copies a prompt, and pastes it straight into the named tool. ✅ path verified end to end, and the library now has content to exercise it with, pending your review.

---

## Phase 8 — Policies pages (B5)

**Structure and design only.** Client direction 2026-08-19: *"Page structure and design ready to receive your rewritten Privacy, Terms and Conflict of Interest content when supplied."*

- [x] **B5.1** Set and URL scheme agreed in code: `/policies` and `/policies/:slug`, with the set in `fe/src/features/policies/policies.js`. Adding a policy is one entry there plus a CMS page under the matching slug. The old one-off URLs (`/privacy`, `/terms`, `/conflicts-of-interest`) **redirect** rather than 404 — they are in the footer of every page already published, and Privacy and Terms are exactly the links that get pasted into contracts and app-store listings.
- [x] **B5.2** `/policies` lists the set grouped by theme, each row saying whether the wording is still being prepared. The **set comes from the code, not the CMS**: a policy exists because the business says it does, and one quietly missing from the index because nobody has written it yet would be worse than one listed as in progress. Search is implemented but only renders above `SEARCH_THRESHOLD` (5) — a filter over three items costs more attention than it saves.
- [x] **B5.3** `PolicyDocument` — long-form layout on a 72ch measure, a sticky in-page contents rail on wide screens (capped and independently scrollable, so a long policy cannot push its own contents out of reach), a permalink anchor per heading, and a print stylesheet that drops the chrome, forces black on white, sets `orphans`/`widows`, and avoids breaking inside a clause.
- [x] **B5.4** Content comes from the existing `pages` module by slug. Both Page shapes are supported: structured `sections` (preferred, since the contents list and anchors are built from them) and a single rich-text `body` (accepted, but produces no contents list).
- [x] **B5.5** See below.

**Heading ids survive renumbering.** An anchor is built from the heading text with any leading `3.` stripped, so inserting a clause does not silently break every link anyone has shared to the clauses below it.

**B5.5 — and the trap the seed was setting.** A page with no CMS content falls back to placeholder copy under a banner reading *"This is placeholder text, not our policy"*, which prints as well as displays: a placeholder that prints clean is a placeholder that gets circulated as if it were real.

That only works if the absence of CMS content is real. It was not. `seed.js` was seeding `privacy` and `terms` as **published one-sentence stubs**, so the page would have found CMS content, treated it as final, dropped the banner, and published a single sentence as the Privacy Policy. Those two upserts are removed from the seed; the policies feature owns those slugs and supplies properly marked placeholders instead.

**⚠️ Two stub records still exist in the dev database** and will still render bannerless until they are cleared. They are seed artefacts, not written content:
- `privacy` — 129 characters, one sentence.
- `terms` — 61 characters, one sentence.

I have not deleted them; that is your data to remove. Clearing them is what makes `/policies/privacy` and `/policies/terms` show the marked placeholder, which is the correct state until the real wording arrives.

**⚠️ I deleted the `privacy` record during testing and restored it.** Verifying the CMS-wins path meant writing a test page at that slug; the delete that preceded it removed the existing record before I had checked whether one was there. It was the seed stub above, and it is restored byte for byte from `seed.js` (129 characters, `updatedLabel` "September 2025", published). Nothing hand-written was lost, but the order of operations was wrong and I should have checked first.

**Removed as part of this:** the three one-off page components and the `LegalPage` template they shared. Their placeholder copy was carried across intact into `policies.js` rather than retyped, so nothing was reworded on the way.

**Exit criteria:** Mohamed's rewritten content pastes in with no layout work. ✅ Paste into the CMS page for the slug, as sections or as rich text, and it replaces the placeholder and drops the banner. Verified both directions against a running server.

---

## Phase 9 — Templates library (B6)

Ref: procurementtactics.com/template-library. Client direction 2026-08-19: *"A new Templates section on the top ribbon offering downloadable documents (Word, Excel, PowerPoint), browsable with a slicer to organise them, similar to the Prompt Library. Sourced and licence checked before publishing."*

- [x] **B6.1** *(hard gate)* **Enforced in code, not in a checklist.** `Template.publishBlocker()` is the single rule, and the controller refuses any PATCH that sets `status: published` while it returns a reason. A template needs a file, a source, a licence, and a named sign-off; if the licence requires attribution it needs the attribution text too. New records default to `draft`, unlike every other content model here.
- [x] **B6.2** `be/src/models/Template.js` — title, description, category, useCase, useCaseOrder, format, file, source/sourceUrl, a licence sub-document, downloads, order, status.
- [x] **B6.3** Storage through the existing S3 pipeline. `uploadDocument` is a new named uploader in `middleware/upload.js`: the old `DOC` filter allowed **PDF only**, so Word, Excel and PowerPoint could not have been uploaded at all.
- [x] **B6.4** `GET /templates/:id/download` streams the original bytes with the format's own media type and a `Content-Disposition` filename, in both ASCII and RFC 5987 UTF-8 forms. No conversion anywhere.
- [x] **B6.5** `/templates` — Category → Use Case → Format, on the same slicer as the Prompt Library.
- [x] **B6.6** Attribution renders on the card where the licence requires it, and the gate will not let such a template publish without the text.
- [x] **B6.7** `fe/src/admin/pages/TemplatesAdminPage.jsx`. The drawer lists the outstanding publish blockers as you fill the form, and the table has a Licence column so a whole set can be scanned for what is not yet cleared.
- [x] **B6.8** Aggregate `downloads` counter only. No visitor, no session, no per-download timestamp: the question is whether a template is useful, and one number answers it without holding anything about who asked. Incremented without awaiting, so a failed tally never costs somebody their file.
- [x] **B6.9** Route, **top ribbon**, footer. No sitemap — the repo has none.

**The browse shell is now shared, which the plan asked for.** Phases 7 and 9 slice identically, so rather than copy 450 lines of CSS the shell moved to `styles/browse.css` (grid, filter rail, radios, phone panel, empty state) and both pages use `.browse-*` classes for it. Each keeps only what its own results look like — a prompt card and a template card have nothing in common beyond the column they sit in. The Prompt Library was refactored onto it in the same change.

**Two security details in the public list.** `file.key` and `file.url` are stripped for anonymous callers: handing out the storage key would route around the download endpoint, which is what names the file and counts the tally. `name` and `size` are kept, because both are part of deciding whether to download.

**Verified against a running server:** the gate refuses in the right order through all six stages and returns null only when fully signed off; a new record defaults to draft; the public list returns published rows only with the storage key stripped and the attribution present; unauthenticated `POST` → 401; a download for a missing object returns 404 rather than a 500. Test rows removed afterwards.

**The byte path is now exercised end to end.** `npm run seed:templates` publishes 8 preview documents so the page can be looked at with something in it. The files are generated rather than sourced (`src/seed/lib/ooxml.js` writes the OOXML packages directly, since the project has no zip dependency and adding one to seed previews would be the tail wagging the dog), uploaded to S3, and served back through the download route. Verified: the response carries the right media type and a `Content-Disposition` filename, and the downloaded bytes reopen as a valid Office package with the sheet contents intact. The download tally incremented from 0 to 1.

**Why the preview set is published rather than drafted.** A public page reads the learner token slot, not the admin one (`currentScope` in `fe/src/api/client.js`), so a signed-in CMS admin browsing `/templates` sends no staff token and would see nothing. Drafts cannot be previewed on the public page at all — worth remembering for the other libraries too.

**⚠️ The preview set is PREVIEW CONTENT and must come out before launch:** `npm run seed:templates -- --remove`, which deletes the records and their S3 objects. Every record carries "PREVIEW SAMPLE" in its source line, which the page prints on the card, and its `confirmedBy` says in as many words that it is not a licence sign-off.

**PowerPoint is absent from the preview on purpose.** A valid `.pptx` needs a slide master, a layout and a theme, and a hand-rolled minimal deck is the one most likely to be rejected by PowerPoint itself. Shipping a file that will not open is worse than a format filter reading zero. The format works end to end; it just needs a real deck uploaded through the CMS.

**Exit criteria:** every published template has a signed-off licence, and downloads open natively in Office. ✅ the first is structurally impossible to skip; the second is verified for Word and Excel and needs one real `.pptx` uploaded to close out. **Content outstanding:** the real documents, which are sourced and licence-checked rather than written.

---

## Phase 10 — Find a Bid Writer (B7)

Fully functional **in staging only**. Doubles as the general business advertising space — one build, not two. Client direction 2026-08-19: *"An advertising placement for bid management companies, with filters for office location and category. Built and tested but held off the live site until you confirm go live, once companies are signed up to a placement fee."*

- [x] **B7.1** `be/src/models/BidWriter.js` — company, contact set, office state/city, categories, blurb, logo, placement tier, active, internal notes, order.
- [x] **B7.2** Categories are exactly the four specified, as a closed enum. They are what a placement is sold against, so adding one is a commercial decision rather than a content one.
- [x] **B7.3** `officeState` drives the filter (the eight states and territories — no FED, there being no federal office to have one in); `officeCity` is display only.
- [x] **B7.4** `/find-a-bid-writer` on the shared browse shell, with location and category filters that combine and are held in the URL.
- [x] **B7.5** Contact path is on the card: website, email and phone. **No detail page** — a page per advertiser would be a thin page whose only content is somebody else's contact details.
- [x] **B7.6** `fe/src/admin/pages/BidWritersAdminPage.jsx`, including tier and the active toggle. Not flag-gated: placements have to be prepared and paid for before go-live, which is the whole reason the page is held back.
- [x] **B7.7** Confirmed by construction — this *is* the general advertising space. Nothing in the model is specific to bid writing beyond the page's title, so a second directory later would be building this again.
- [x] **B7.8** Held from production. See below.
- [x] **B7.9** `docs/GO-LIVE-BID-WRITERS.md`.

**One switch, three positions**, rather than a boolean. `off` (the default for anything unrecognised, including the variable being absent) leaves the route unregistered and the public API returning **404 — not an empty list, because an empty list still tells you the feature is coming**. `preview` serves it with a banner and `noindex, nofollow`, and keeps it out of the nav; that is what local and staging run. `live` is the whole thing. Verified at all three settings: anonymous `GET /api/bid-writers` returns 404 / 200 / 200.

Two variables have to move because the nav and route are decided at build time and the API gate at runtime, which is exactly what the go-live doc is for.

**Two commercial safeguards, both defaulting to off.** `active` is per listing and off by default, so a record created while a deal is still being discussed cannot appear by accident; and the feature flag is off by default, so an environment that has never heard of it stays dark.

**⚠️ A bug found in testing and fixed.** Featured placements were sorting *last*. The sort was `-placementTier`, and `'standard'` follows `'featured'` alphabetically, so descending put standard first — paying advertisers ranked below unpaid tiers. Now sorted on an explicit `TIER_RANK` stamped by a pre-validate hook, so it does not depend on the alphabetical accident and will not break the first time a third tier is added. Re-verified: featured first.

**What the page does not do, deliberately.** Results are a flat list rather than grouped: headed sections would rank advertisers against each other in public, and the only ordering anybody has bought is featured-above-standard. The tier is never labelled — a featured listing carries a rule down its edge and nothing else, because "we paid more" is not information a visitor benefits from. And a disclosure sits above the results saying these are paid placements, that we do not endorse anyone listed, and that we take no commission.

**Verified against a running server:** the flag gate at all three settings; only paid, active listings served; internal `notes` stripped from the public payload; featured ordering; and both filters server-side, alone and combined.

**⚠️ Preview listings are seeded in the dev database** (three active, one inactive to prove the gate). They carry `__PREVIEW__` in their internal notes. Remove before go-live.

**Exit criteria:** works fully on staging, invisible in production, one flag flips it live. ✅

---

# ⏸ Parked — LMS (Phases 11–16)

Everything below is documented for planning only. **No LMS work starts until the website phases above are signed off.**

---

## Phase 11 — LMS: Compliance & security (LMS 1.0–4.0)

Already in place: `be/src/modules/lms/`, `fe/src/lms/`, and the models `Course`, `Module`, `Lesson`, `Enrollment`, `Progress`, `QuizAttempt`, `Certificate`, `Question`, `Discussion`, `Review`, `InstructorProfile`.

- [ ] **1.0a** Data handling reviewed against the Privacy Act 1988 and the Australian Privacy Principles — written gap assessment.
- [ ] **1.0b** Collection notice, consent capture and retention periods implemented at signup.
- [ ] **1.0c** Data export and deletion path for a student request (APP 12 / 13).
- [ ] **1.0d** Personal data at rest reviewed — encryption, access scope, and what the audit log records.
- [ ] **2.0a** Penetration test scoped and booked.
- [ ] **2.0b** Test executed, findings triaged by severity.
- [ ] **2.0c** Critical and high findings remediated and retested.
- [ ] **2.0d** Shareable summary produced for clients and partners — findings-level, no exploit detail.
- [ ] **3.0** Secure video streaming — signed short-lived URLs, HLS with rotating keys, no direct file URL, download and right-click disabled. This deters casual copying; state the limits honestly rather than claiming the video cannot be copied.
- [ ] **4.0** Access restricted to enrolled students — every lesson, asset and stream URL re-checks enrolment **server-side**, not only in the route guard (`fe/src/routes/StudentRoute.jsx` is the client half only).

**Exit criteria:** pen-test summary in hand, and no video or lesson asset reachable without a valid enrolment.

---

## Phase 12 — LMS: Content & structure (LMS 5.0–9.0)

- [x] **5.0a** Courses → modules → lessons hierarchy verified end to end. 
- [x] **6.0a** Text lessons — authoring and rendering verified. 
- [x] **6.0b** Downloadable lesson resources — upload, list, download, enrolment-checked.
- [x] **7.0a** Transcript data model with timecodes.
- [x] **7.0b** Transcript panel synced to the video, click-to-seek, auto-scroll.
- [x] **7.0c** Transcript search within a lesson.
- [x] **8.0a** `Program` model grouping courses, with completion rules.
- [x] **8.0b** Program certificate issued on completing all constituent courses.
- [x] **9.0a** Per-lesson `freePreview` flag.
- [x] **9.0b** Preview lessons playable without enrolment with a clear upgrade path — and preview access must not widen the Phase 11 enrolment check.

**Exit criteria:** a program of courses completes and certifies; previews are open and everything else is not.

---

## Phase 13 — LMS: Assessment & progress (LMS 10.0–12.0)

- [ ] **10.0a** Quiz authoring — question types, answer keys, pass mark, attempt limits.
- [ ] **10.0b** Auto-marking on submit, with marking done server-side only.
- [ ] **10.0c** Attempt history and feedback surfaced to the student (`QuizAttempt` already exists).
- [ ] **10.0d** Instructor quiz analytics — extend `be/src/modules/lms/analytics.controller.js`.
- [ ] **11.0a** Per-lesson progress recorded reliably, including video watch position.
- [ ] **11.0b** Course and program completion computed from module rules.
- [ ] **11.0c** Progress visible to the student, the instructor and the admin.
- [ ] **12.0a** Certificate template editor — layout, logo, signature, fields, per-course override.
- [ ] **12.0b** Certificate issued on completion, as a PDF, verifiable via a public ID.

**Exit criteria:** a student passes a quiz, completes a course, and receives a customised verifiable certificate with no manual step.

---

## Phase 14 — LMS: Commerce (LMS 13.0–15.0)

- [ ] **13.0a** `Product` / pricing model — one-off course purchase and recurring membership.
- [ ] **13.0b** Membership tiers with entitlement rules (which courses each tier unlocks).
- [ ] **13.0c** Cart and checkout — `fe/src/lms/context/CartContext.jsx` already exists.
- [ ] **14.0a** Stripe integration — add the SDK to `be`, keys via env, never in the client.
- [ ] **14.0b** Stripe Checkout for one-off purchases, Stripe Billing for memberships.
- [ ] **14.0c** Webhooks: payment succeeded → enrol; subscription cancelled or failed → revoke. Idempotent and signature-verified.
- [ ] **14.0d** Automatic GST via Stripe Tax, with the Australian registration configured.
- [ ] **14.0e** Compliant tax invoices issued and retrievable by the student.
- [ ] **15.0a** Affiliate / referral model — codes, attribution window, commission rates, payout ledger.
- [ ] **15.0b** Affiliate dashboard: referral link, clicks, conversions, earnings.

**Exit criteria:** a real card payment enrols a student, issues a GST invoice, and credits the referring affiliate.

---

## Phase 15 — LMS: Engagement & delivery (LMS 16.0–18.0)

- [ ] **16.0a** Q&A and discussion scoped to a course or lesson — `Discussion`, `Question` and `discussions.controller.js` already exist, extend them.
- [ ] **16.0b** Instructor answers, marking answered, pinning.
- [ ] **16.0c** Moderation and reporting path, tied into the existing moderation queue.
- [ ] **16.0d** Notifications on reply.
- [ ] **17.0a** Choose the live session platform (Zoom versus an embedded provider) and confirm cost.
- [ ] **17.0b** Session scheduling, enrolment-gated join links, calendar invite.
- [ ] **17.0c** Recordings published back into the course, honouring the Phase 11 streaming rules.
- [ ] **18.0** Embedded course coach — define the scope first. **Note:** if this means an AI assistant, keep it strictly separate from the Procurement Advisor (A6), which is contractually not AI. Confirm with Mohamed before building.

**Exit criteria:** students ask and get answered in-course, and a live session runs with its recording landing in the course.

---

## Phase 16 — LMS: Admin & integration (LMS 19.0–22.0)

- [ ] **19.0a** Self-service instructor interface — course CRUD, media, enrolments, without developer help. Audit `fe/src/lms/pages/instructor/` for gaps.
- [ ] **19.0b** Self-service admin interface — users, roles, catalogue, refunds, reporting.
- [ ] **19.0c** Server-side ownership checks on every instructor endpoint, not just the role check.
- [ ] **20.0a** `Organisation` model with seats and an org admin role.
- [ ] **20.0b** Bulk enrolment via CSV upload, with validation and a dry-run preview.
- [ ] **20.0c** Org admin dashboard — seat usage and cohort progress.
- [ ] **21.0** Single sign-on between the main site and the LMS — unify `fe/src/context/AuthContext.jsx` and `fe/src/lms/context/StudentAuthContext.jsx` onto one session. *(Depends on main site auth; sequence it after Phase 11 so the enrolment checks are not rewritten twice.)*
- [ ] **22.0a** Native email — transactional templates on the existing nodemailer setup (welcome, enrolment, completion, payment, password).
- [ ] **22.0b** Campaign email to segments, with unsubscribe honoured — `be/src/modules/subscribers` already exists.
- [ ] **22.0c** CRM — contact records, activity timeline, tagging, export.

**Exit criteria:** an org admin bulk-enrols a cohort, everyone signs in once across the site and the LMS, and the lifecycle emails send themselves.

---

## Sequencing notes

- **Phase 0 first, always** — everything else stacks on a tree that currently does not build.
- **Phases 1–3 are the visible sprint.** A2 depends on A1. A4 is no longer optional — the client has specified the ramps in `palette.html`, so it is now a build item rather than a judgement call.
- **Do A4 before A1's section port.** The ramps are the substrate; porting sections first means restyling them twice.
- **Website only for now** — Phases 11–16 are parked.
- **Phases 4–10 are independent of each other** and can run in parallel across developers. Phases 7 and 9 share a filtering and browsing pattern — build it once in Phase 7 and reuse it in Phase 9.
- **Phase 11 gates every other LMS phase.** Enrolment enforcement and video protection are architectural; retrofitting them after commerce and content ship means touching every endpoint twice.
- **LMS 21.0 (SSO) is the riskiest LMS item** — it rewrites both auth contexts. Schedule it deliberately rather than opportunistically.
