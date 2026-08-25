# Pathway: Live sessions (LMS 17.0)

Phase 15's third item, and the only one in it that cannot be started by reading
this repo alone: **17.0a is a decision, not a build.** Which platform, and what
it costs, is Mohamed's call.

This document exists so that the decision is the *only* thing waiting. Most of
17.0b can be built before anyone signs anything, and 17.0c turns out to need
almost no new code at all. What follows is the order to do it in and the two or
three choices that are hard to reverse.

---

## 1. What is actually being asked for

| Ref | The item | Blocked on |
|---|---|---|
| **17.0a** | Choose the platform (Zoom vs. an embedded provider) and confirm cost | **Client decision** |
| **17.0b** | Scheduling, enrolment-gated join links, calendar invite | Only the adapter needs 17.0a |
| **17.0c** | Recordings published back into the course, honouring the Phase 11 streaming rules | Nothing — the pipeline already exists |

**Exit criteria (from the plan):** a live session runs, and its recording lands
in the course.

---

## 2. The decision (17.0a)

### The real fork

It is not "Zoom or not". It is **who hosts the meeting UI**:

**A. Hand off to a provider's own client** — Zoom, Teams, Google Meet. The
learner leaves our site and joins in the provider's app or web client.

- Cheapest to build. The provider does the hard parts: NAT traversal, echo
  cancellation, "can you hear me", phone dial-in, the participant's own
  bandwidth problems.
- Everyone already knows how to use it, which for a public-sector audience on
  managed laptops matters more than it sounds.
- The session does not look like ours, and we control very little about it.

**B. Embed the session in the LMS** — Daily, LiveKit, 100ms, Whereby and similar
sell an SDK you render inside your own page.

- It stays on our site, inside the enrolment gate, styled as ours.
- Attendance is ours to measure precisely, because we are rendering the room.
- Materially more to build and to keep working, and the failure modes land on
  us. Priced per participant-minute, so the cost scales with success.

**Recommendation, to be confirmed rather than assumed: start with (A).** The
exit criteria say "a live session runs with its recording landing in the
course". (A) meets that. (B) is a better product and a much larger commitment,
and nothing in the tracker asks for it yet. The adapter boundary in §4 is what
keeps (B) open later without a rewrite.

### What to confirm before choosing

Prices and packaging change, and nothing in this repo should be trusted as a
quote — **get current figures from the vendor**. What to actually ask:

1. **Per what?** Per host/licence per month (Zoom-style), or per
   participant-minute (embedded SDKs)? The second scales with attendance, which
   is the thing we are hoping goes up.
2. **Attendee ceiling**, and the price step when a cohort crosses it. A webinar
   add-on is often a separate product from a meeting licence.
3. **Cloud recording**: included or extra, storage cap, retention period, and
   **how long after a session the file is fetchable**. §6 depends on this.
4. **API access on the plan being bought.** Some tiers cannot create meetings
   programmatically, which would make 17.0b manual data entry.
5. **Per-registrant join links** — supported, and on which tier? This is what
   makes attendance attributable to a learner rather than a display name.
6. **Data residency.** Recordings and participant lists are personal
   information about named public servants. Where they are stored is a Phase 11
   (Privacy Act / APP) question, not a preference — see §8.

### Sizing questions for Mohamed

The answers change the shortlist, so they are worth getting first:

- How many people in a typical session — 10, 50, 500?
- Is it taught live to a cohort, or is it a webinar with an audience?
- Are sessions part of a paid course, or sold separately?
- Must attendance be recorded for CPD or accreditation? (If yes, per-registrant
  links stop being optional.)
- Are recordings public marketing, or enrolled-learners-only?

---

## 3. What to build before the decision

All of this is provider-agnostic and none of it is wasted whichever way 17.0a
goes.

**A `LiveSession` model.** Roughly:

```
course / program   what it belongs to (mirrors Certificate: one of the two)
title, description
startsAt, endsAt   UTC instants
timezone           IANA name — see the note below
status             scheduled | live | ended | cancelled
provider           'zoom' | 'daily' | … whatever 17.0a picks
providerRef        { meetingId, hostUrl, joinUrl }  ← NEVER serialised to a learner
recording          { lesson: ref Lesson, status, error }
```

Store `startsAt` as a UTC instant **and** the IANA timezone name separately.
Not an offset — an offset is wrong twice a year. `study.controller.js` already
carries a note about this for streaks; the same reasoning applies harder here,
because a session at the wrong hour is a missed session.

`providerRef.hostUrl` is a start-the-meeting-as-host credential. It is as
sensitive as a password and must never leave the server. The same rule the
Lesson model already follows for `video.key`: store the reference, serve a
derived thing.

**The instructor's scheduling screen**, under `fe/src/lms/pages/instructor/`.
Create, edit, cancel. Ownership checked server-side, using the existing
`ownsCourse` middleware rather than a new check.

**The learner's view** — an upcoming session on the course page and the
dashboard, with a join button that is disabled until a few minutes before.

**The `.ics` invite.** RFC 5545 is a text format; this needs no dependency and
should not acquire one. Two things that are easy to get wrong:

- Keep a stable `UID` per session and increment `SEQUENCE` on every change.
  Without it, a rescheduled session appears in the calendar *twice* instead of
  moving.
- Put the **redirect** URL from §5 in it, never a real provider join URL. An
  `.ics` gets forwarded, and a raw join URL in one is a session anybody can
  walk into.

Attach it with the existing `sendMail` in `be/src/utils/mailer.js`.

**Notifications.** `be/src/modules/lms/notify.js` is the hook point and already
does the fan-out, consent and email work. A session that is scheduled, moved,
cancelled or starting soon is the same shape as a discussion reply. It will need
its own preference keys — add them to `AccountSettingsPage.jsx` at the same
time, because a toggle that does not exist reads as consent that was never
given.

> "Starting in 15 minutes" is the one notification here that needs a scheduler,
> since nothing triggers it. There is no job runner in this codebase. Either add
> one deliberately or drop that notification — do not fake it with a poll from
> the browser.

---

## 4. The adapter boundary

This is the part that makes 17.0a cheap to revisit. One file per provider,
implementing one small interface:

```
createMeeting({ title, startsAt, endsAt, timezone })  → { meetingId, joinUrl, hostUrl }
updateMeeting(meetingId, { … })                       → void
cancelMeeting(meetingId)                              → void
joinUrlFor(meetingId, user)                           → string   // per-registrant where supported
listRecordings(meetingId)                             → [{ downloadUrl, bytes, durationSeconds }]
```

Everything else — the model, the screens, the gate, the invite, the ingest —
talks to that and never to a vendor SDK. Switching from (A) to (B) later, or
from one vendor to another on a price rise, becomes one new file rather than a
migration.

`joinUrlFor` taking `user` is the load-bearing part. Providers that support
per-registrant links let it return a distinct URL per learner; those that don't
return the same one for everybody. Either way **the call site is already
per-user**, so gaining that capability later costs nothing.

---

## 5. The join gate (17.0b)

**The rule: a join URL is never stored on the client and never sent in a payload
a learner can read.**

Instead, one endpoint:

```
GET /lms/sessions/:id/join   →   302 to the provider
```

which, on every click:

1. Re-checks the enrolment **server-side** — the Phase 11 / 4.0 rule. Use
   whatever `learning.controller.js` settles on (`grantsAccess` / `enrolmentFor`
   today), not a copy. The plan's own sequencing note warns about writing the
   enrolment check twice.
2. Refuses outside a sensible window (say, from 15 minutes before to the end).
3. Asks the adapter for `joinUrlFor(meetingId, user)`.
4. Redirects, and records the attempt for attendance.

This is the same shape as the existing `hlsTicket` → `hlsPlaylist` → `hlsKey`
chain: the ticket is not the authorisation, the gate re-runs every time.

**Be honest about what this buys.** `hlsKeys.js` sets the precedent and its
candour is worth copying. A redirect does not stop a determined learner from
reading the `Location` header and pasting the URL into a group chat. What it
buys is narrower and still worth having: there is no join URL sitting in a JSON
response or an email to be forwarded by accident, a revoked enrolment stops
working immediately rather than at the next page load, and with per-registrant
links a shared URL is traceable to whoever shared it. Say that to the client
plainly rather than describing sessions as sealed.

---

## 6. Recordings (17.0c) — mostly already built

**A recording is not a new subsystem. It is an MP4 that arrived from a provider
instead of from an instructor's Upload button.**

`be/src/modules/lms/hlsTranscode.js` states its own contract in its header:
everything downstream "only cares that `video.hls.status` reaches `'ready'` with
a playlist whose key URIs are `key:N`". So:

```
provider webhook / poll  →  download the file  →  put in S3
    →  packageLessonVideo()  →  a Lesson of kind 'video' in the course
```

It honours the Phase 11 streaming rules **because it is the Phase 11 path** —
encrypted HLS, rotating keys, expiring segment URLs, enrolment re-checked per
key request. Nothing new to secure, and nothing new to get wrong.

Four things to get right:

1. **Fetch promptly.** Providers expire recording download links, sometimes in
   days. Pull the file to our S3 on notification; do not keep a link and hope.
2. **ffmpeg is not wired into the API process, deliberately** — read the warning
   in `hlsTranscode.js`. A 90-minute session will starve the instance or be
   OOM-killed. Either run the packaging as a worker or a one-off script (which
   is what `npm run hls:package` is for), or hand the job to MediaConvert / Mux
   / Cloudflare Stream. The transcode module's header already says this is a
   supported swap.
3. **Default the new lesson to unpublished, `preview: false`.** A live session
   is a room where learners ask questions using real procurement examples from
   their own agency. Publishing that automatically is a privacy incident with an
   audit trail. Let the instructor review, then publish.
4. **The recording lesson counts toward course duration.** `minutes` feeds the
   certificate — see the taught-time note in `learning.controller.js`. Set it
   from the actual duration.

---

## 7. Order of work

```
now ──┬─ LiveSession model + instructor scheduling screens
      ├─ .ics invite + notification wiring (notify.js)
      └─ join-gate endpoint, against a stub adapter
                                    │
17.0a decision ─────────────────────┤
                                    │
                                    ├─ the real adapter (one file)
                                    └─ recording ingest → packageLessonVideo
```

Everything left of the decision is real, shippable work with a stub adapter that
returns a hardcoded meeting link. A session can be scheduled, invited to,
notified about and gated **before anyone signs a contract** — at which point
17.0a becomes one file and a set of API credentials.

### Dependency worth respecting

Phase 11 is not done. 17.0b's join gate and 17.0c's recordings both sit on the
server-side enrolment check that **4.0 is supposed to establish**. The plan's
sequencing note already says to do Phase 11 first so the enrolment checks are
not written twice; that applies here specifically. If 17.0 is built before 11,
build the gate by *calling* the existing helpers so there is one place to change
when 4.0 hardens them.

---

## 8. Before it carries real sessions

- **Recordings are personal information.** A session recording contains named
  public servants discussing their agency's procurement. Retention, consent to
  being recorded, and where the file is stored are APP obligations (Phase 11,
  1.0a–1.0d), not preferences. At minimum: tell participants they are being
  recorded before the recording starts, and decide a retention period before the
  first one exists rather than after there are two hundred.
- **Attendance data is personal information too.** If it is kept for CPD, it is
  a record about a person and falls under the same export/deletion path 1.0c
  builds.
- **Do not promise "secure" sessions.** See §5.

---

## 9. Open questions for the client

Collect these with the 17.0a answer; each one changes the build:

1. Typical and maximum attendance.
2. Taught cohort, or webinar with an audience?
3. Is attendance needed for CPD or accreditation?
4. Are recordings enrolled-only, or public marketing?
5. How long must recordings be kept — and who decides when they are deleted?
6. Does a session belong to one course, or can it span a learning path?
7. Who hosts: the course's instructor, or a named facilitator?

---

*Related: `docs/IMPLEMENTATION_PLAN.md` Phase 15. The Phase 11 items this leans
on are 1.0a–1.0d (privacy) and 4.0 (server-side enrolment checks).*
