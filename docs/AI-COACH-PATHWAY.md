# Pathway: Course coach (LMS 18.0), if it is AI

Phase 15's last item. The plan says *"define the scope first"* and *"confirm with
Mohamed before building"*, and both are load-bearing — this is the one item in
the phase where building the obvious thing creates a **contractual** problem
rather than a technical one.

This document assumes the answer to "is it AI?" comes back **yes**. If it comes
back no — a scripted study helper, a FAQ, a nudge — most of this does not apply
and the item is much smaller.

---

## 1. Read this before anything else

**The Procurement Advisor (A6) is contractually not AI, and it says so on
screen.** In `fe/src/features/advisor/components/AdvisorDisclaimer.jsx`, in the
tracker's own words:

> This tool is not AI-powered. No data is stored or used for training.

The engine behind it is deliberately built to make that claim true —
`fe/src/features/advisor/engine.js` opens with *"Pure functions only… No network
calls, no randomness, no model inference."* Every result it emits carries a
`basis` (source keys from the rule pack) and a `confidence`.

An AI coach in the same product is not automatically a problem. An AI coach that
**answers procurement questions** is, because that is the exact claim A6 makes
about itself. The failure is easy to picture and hard to walk back:

> A learner opens the coach inside a course and types *"can I direct-negotiate at
> $150k in NSW?"* — the same question A6 answers deterministically from a rule
> pack. The coach answers from a language model. The company has now given an AI
> answer to a procurement question, on the same site that advertises it does not.

So the dividing line is not a tone-of-voice note. **It has to be enforced in the
code**, and it is the first thing to build, not the last.

### The separations, concretely

| Rule | How it is enforced |
|---|---|
| Never on an advisor route | The coach mounts under `/learn/*` only. `/advisory` and `/advisory/:jurisdiction` must not import it. Assert it in routing, not by convention. |
| Never called "Advisor" | Name it **Course Coach** or **Study help**. The word "advisor" belongs to A6 and should stay there. |
| Grounded only in course content | It answers **from the enrolled course's own material and nothing else** (§3). With no course content on a topic, it has nothing to answer from — the limit is structural, not a prompt instruction. |
| Refuses procurement advice | An explicit refusal path with a handoff: *"That's a procurement question rather than a course one — the Procurement Advisor covers it."* Link to `/advisory`. |
| Its own disclaimer, inverted | A6 says "not AI". The coach must say the opposite plainly: *this is AI, it answers from this course's material, it can be wrong, check the lesson.* |
| Enrolment-gated | Same server-side gate as every other lesson asset (Phase 11 / 4.0). A coach answering about a course you have not bought is a content leak. |

> **A prompt instruction is not one of these.** "Do not give procurement advice"
> in a system prompt is worth having and is not a control. The control is that
> the model is only ever handed this course's lessons, and that the feature
> cannot render on an A6 route.

---

## 2. Scope — what it should actually do

The defensible version is narrow, and is also the useful one. A coach that
answers *about the course* is genuinely valuable and structurally safe.

**In scope**

- *"What did this lesson mean?"* — explained against the lesson's own text.
- *"Why was my quiz answer wrong?"* — `Question.explanation` already exists on
  the model, and `reviewFor()` already decides what a learner may see after
  marking. The coach explains what the learner is already entitled to see.
- *"Summarise this module"* / *"give me practice questions on this."*
- *"Where is X covered?"* — pointing at a module and lesson.

**Out of scope, and refused**

- Real procurement advice, in any jurisdiction. → hand off to A6.
- Anything about a live tender the learner is working on. → refuse and say why.
- Marking, grading, or anything that changes a record. The coach reads; it never
  writes progress, never passes a quiz, never issues a certificate.

**Undecided, and for Mohamed** — see §8. The single biggest scope question is
whether the coach is course-scoped (safe, useful) or site-wide (a support bot,
which drifts toward A6's territory immediately).

---

## 3. Grounding — and why this needs no vector database yet

The content is already in the database and already structured:

| Source | Field | Note |
|---|---|---|
| Text lessons | `Lesson.body` | The lesson as written. |
| Video lessons | `Lesson.transcript` | A cue array of `{ t, text }` — **already timecoded** (L2). |
| Structure | Course → Module → Lesson titles | Gives the coach somewhere to point. |
| Quiz feedback | `Question.explanation` | Already written by the instructor. |

**Start by putting the whole course in the prompt.** Claude Opus 5 has a 1M-token
context window; a substantial course is a small fraction of that. That means:

- no embedding pipeline, no vector store, no chunking strategy, no re-index on
  every lesson edit — none of which this codebase has, and each of which is a
  standing maintenance cost;
- the coach sees the course *in order*, so "this builds on Module 2" is something
  it can actually observe rather than infer from three retrieved fragments;
- **prompt caching** makes the repeat cost small: the course is a stable prefix,
  the learner's question is the volatile part and goes last.

Retrieval is what you add *if* a course outgrows the window — so keep the
"assemble the context" step behind one function, the way the live-session
adapter isolates its provider. Swapping stuffing for retrieval should be one
file.

> Caching is a **prefix match**: any byte change anywhere in the prefix
> invalidates everything after it. Put the frozen system prompt and the course
> content first and the question last, and confirm it is working by reading
> `usage.cache_read_input_tokens` — if that is zero across repeated questions,
> something in the prefix is varying and the cache is doing nothing.

---

## 4. Citations are the feature, not a nicety

The Messages API can return **citations**: set `citations: { enabled: true }` on
each `document` content block, and the response comes back split into text
blocks where cited ones carry a `citations` array — `cited_text`,
`document_title`, and a `char_location` with start/end offsets.

Pass each lesson as its own titled `document` block and every claim the coach
makes is traceable to a lesson, by name, with the sentence it came from.

That matters here more than it would elsewhere:

- It is the honest answer to *"can we trust this?"* — the learner checks the
  source rather than the model.
- The UI can deep-link the citation straight to the lesson. For video lessons,
  the transcript cues are timecoded, so a citation can land on **the second of
  the video where it was said**.
- It gives the coach the same shape A6 already has. A6 emits `basis` and
  `confidence` on every item; a cited coach answer is the same promise kept a
  different way. That parallel is worth making deliberately — it is what stops
  the coach reading as a lesser, hand-wavier version of the advisor.

Two practical notes: citations are all-or-nothing across the document blocks in a
request, and they are **incompatible with `output_config.format`** — so don't
plan on structured output and citations in the same call.

---

## 5. Where the code goes

```
be/
  src/modules/lms/coach.controller.js   the endpoint, the gate, the refusal path
  src/modules/lms/coach.js              context assembly + the Anthropic call
  src/models/CoachThread.js             only if conversations are kept (§6)
```

- `npm i @anthropic-ai/sdk` in `be/`. **Server-side only.** The key goes in
  `env.js` alongside the others and never reaches the browser — the same rule
  14.0a states for Stripe.
- Model: **`claude-opus-5`**. Leave adaptive thinking on; for routine lesson Q&A
  `output_config: { effort: "low" }` or `"medium"` is the cost lever, not a
  cheaper model.
- **Stream the answer.** A grounded reply over a large cached prefix is not
  instant, and a spinner for eight seconds reads as broken. This codebase has no
  SSE endpoint yet, so that is genuinely new plumbing — budget for it.
- **Rate-limit per learner.** `express-rate-limit` is already a dependency and
  already used on signup; an unmetered LLM endpoint behind a login is a bill
  waiting to happen.

The frontend belongs under `fe/src/lms/` with the rest of the learner surface —
a panel in the lesson player, not a floating site-wide bubble. Where it lives on
screen *is* part of the A6 separation.

---

## 6. Privacy — this is a Phase 11 item wearing a different hat

**A learner's questions are personal information**, and unusually revealing:
they are a record of what a named public servant did not understand. Worse, the
plausible failure is a learner pasting details of a live tender their agency is
running into a text box.

Before this carries real traffic:

- Decide **whether conversations are kept at all**. Not keeping them is a
  legitimate and much simpler answer, and it makes 1.0c (export/deletion) a
  non-event. If they are kept, they are in scope for the collection notice
  (1.0b), export and deletion (1.0c), and a retention period decided *before*
  there are two hundred thousand of them.
- **Say what happens to the text**, next to the box, in the coach's own
  disclaimer. A6 gets to say "no data is stored"; the coach must say something
  accurate rather than nothing.
- **Warn against pasting live tender detail**, and mean it — this is the most
  likely way confidential agency information ends up somewhere it should not be.
- Confirm the commercial terms on training use and retention for the account
  being used, and write the answer down here rather than assuming it.

---

## 7. Order of work

```
1.  Confirm scope with Mohamed (§8). Nothing starts before this.
2.  The separation: route boundary, naming, disclaimer, refusal + A6 handoff.
    Build and test this FIRST, against a stubbed model call.
3.  Context assembly from Lesson.body / transcript, behind one function.
4.  The Anthropic call: cached prefix, citations on, streamed out.
5.  The lesson-player panel, with citations rendered as deep links.
6.  Rate limiting, cost telemetry, and the privacy decisions from §6.
```

Step 2 before step 4 is the point of the whole ordering. The guardrail is the
feature; the model call is the easy part.

---

## 8. What Mohamed has to decide

1. **Is it AI at all?** The plan does not assume it. A scripted study helper is
   a different, much smaller item.
2. **Course-scoped, or site-wide?** Course-scoped is safe and is what §1–§4
   describe. A site-wide support bot walks into A6's territory on day one.
3. **Does he accept AI anywhere in the product**, given how prominently A6
   advertises that it is not? This is a positioning question, not an engineering
   one, and it is the real gate.
4. **Are conversations kept?** Drives §6 entirely.
5. **What does it refuse?** The refusal list above is a proposal, not a
   requirement — he may want it wider.
6. **Who is accountable for a wrong answer?** A learner acting on a bad coach
   answer in a real procurement is the risk that matters. The refusal path, the
   citations and the disclaimer all exist to keep that from happening quietly.

---

*Related: `docs/IMPLEMENTATION_PLAN.md` Phase 15 (18.0) and Phase 3 (A6). The
Phase 11 items this leans on are 1.0b–1.0d (collection notice, export/deletion,
data at rest) and 4.0 (server-side enrolment checks).*
