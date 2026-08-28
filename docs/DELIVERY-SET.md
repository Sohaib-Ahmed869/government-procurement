# Government Procurement — Staging Delivery Set

| | |
|---|---|
| **Scope reference** | CAL-GP-2026-SCOPE-004 |
| **Environment** | Staging — https://staging.govprocurement.com.au |
| **Prepared** | 28 August 2026 |
| **Branch** | `feature/lms-sign-off` |

> ⚠️ **This document contains live sign-in credentials.** They work on the staging site
> right now. Share it only with people who should have access, and rotate every password
> below before any of these accounts are used in production.

Everything needed to sign in to the staging environment and walk the learning platform
end to end — three accounts, a fully built course, and the flows worth testing before
this goes to production.

Every link below was opened and confirmed to render on 28 August 2026.

---

## 1. Where everything lives

One deployment serves the public site, the learning platform and the CMS. Which one you
land in is decided by the role on your account, not by the address you sign in at.

| Surface | Link | Who it is for |
|---|---|---|
| Public site | https://staging.govprocurement.com.au/ | Anyone. Marketing pages. |
| Public course listing | https://staging.govprocurement.com.au/courses | Anyone. The marketing view of the catalogue. |
| **Learner sign-in** | **https://staging.govprocurement.com.au/learn/login** | Students and instructors. Staff may also use this — they are redirected to the CMS. |
| **CMS sign-in** | **https://staging.govprocurement.com.au/admin/login** | Administrators. The direct route into the back office. |
| Create an account | https://staging.govprocurement.com.au/learn/signup | New students and instructors. |
| Course catalogue (in-app) | https://staging.govprocurement.com.au/learn/courses | Courses and bundles, with prices. |

---

## 2. Accounts

Three accounts, one per role. Each was signed in on the staging site on 28 August to
confirm it works and lands where it should.

### 2.1 Administrator

| | |
|---|---|
| **Sign in at** | https://staging.govprocurement.com.au/admin/login |
| **Email** | `admin@govprocurement.com.au` |
| **Password** | `GPadmin!Delivery26` |
| **Lands on** | https://staging.govprocurement.com.au/admin |

Can do everything: approve courses, manage users and roles, edit the public site, view orders.

Useful destinations:

- Dashboard — https://staging.govprocurement.com.au/admin
- Courses (including the approval queue) — https://staging.govprocurement.com.au/admin/courses
- Users & roles — https://staging.govprocurement.com.au/admin/users
- Media library — https://staging.govprocurement.com.au/admin/media

### 2.2 Instructor

| | |
|---|---|
| **Sign in at** | https://staging.govprocurement.com.au/learn/login |
| **Email** | `instructor@govprocurement.com.au` |
| **Password** | `GPteach!Delivery26` |
| **Lands on** | https://staging.govprocurement.com.au/learn/instructor |

Builds courses, uploads video, writes quizzes, schedules live sessions, and sees
enrolments and progress. **This account owns the demo course in section 3.**

Useful destinations:

- Teaching dashboard — https://staging.govprocurement.com.au/learn/instructor
- My courses (the course builder) — https://staging.govprocurement.com.au/learn/instructor/courses
- Live sessions — https://staging.govprocurement.com.au/learn/instructor/live
- Enrolments — https://staging.govprocurement.com.au/learn/instructor/students
- Student progress — https://staging.govprocurement.com.au/learn/instructor/progress

### 2.3 Student

| | |
|---|---|
| **Sign in at** | https://staging.govprocurement.com.au/learn/login |
| **Email** | `student@govprocurement.com.au` |
| **Password** | `GPlearn!Delivery26` |
| **Lands on** | https://staging.govprocurement.com.au/learn |

Browses, buys, learns, sits quizzes and earns a certificate. This account owns nothing
yet, so the purchase flow in section 4 can be walked from the very start.

Useful destinations:

- Dashboard — https://staging.govprocurement.com.au/learn
- Browse catalogue — https://staging.govprocurement.com.au/learn/courses
- My courses — https://staging.govprocurement.com.au/learn/my-courses
- Orders and receipts — https://staging.govprocurement.com.au/learn/orders
- Certificates — https://staging.govprocurement.com.au/learn/certificates
- Live sessions — https://staging.govprocurement.com.au/learn/live

### 2.4 A note on the names

These accounts are titled by role — *Site Administrator*, *Lead Instructor*,
*Sample Student* — rather than given invented personal names. The instructor's name is
published as the byline on the course page, and a made-up person credited with teaching
government procurement is a claim the system should not make on anyone's behalf.

Rename them from **Profile** when real staff take them over:
https://staging.govprocurement.com.au/learn/profile

---

## 3. The demo course

Built from the source material supplied, and published live on staging. It is assigned to
the instructor account above, so signing in as that instructor shows the authoring side of
the same course a student sees.

| | |
|---|---|
| **Title** | Procurement Business Partnering: Ownership, Accountability and Value for Money |
| **Public page** | https://staging.govprocurement.com.au/courses/procurement-business-partnering-ownership-accountability-and-value-for-money |
| **In-app page** | https://staging.govprocurement.com.au/learn/courses/procurement-business-partnering-ownership-accountability-and-value-for-money |
| **Price** | **$249.00 AUD**, inclusive of GST — $226.36 net + $22.64 GST |
| **Level** | Intermediate · 22 minutes of content |
| **State** | Published and open for enrolment |
| **Instructor** | Lead Instructor *(reassigned from the Azka test account)* |
| **Also includes** | 6 learning outcomes, 2 prerequisites, 4 "what's included" points, and a certificate of completion |

### 3.1 Structure

**Module 1 — Ownership and Accountability**

| Lesson | Type | Detail |
|---|---|---|
| Lecture: Ownership and Accountability | Video | 1 min |
| Lecture Quiz: Ownership and Accountability | Quiz | 3 questions · 67% to pass |

**Module 2 — Value for Money**

| Lesson | Type | Detail |
|---|---|---|
| Lecture: Value for Money | Video | 1 min |
| Lecture Quiz: Value for Money | Quiz | 3 questions · 67% to pass |

> ⚠️ **The two lecture videos are placeholders.** They are one-minute clips uploaded
> during testing, not the real lectures. Everything around them — playback, progress
> tracking, the quiz gate, the certificate — works on them, but the teaching content still
> has to be recorded and swapped in.

### 3.2 Bundle

A bundle named **Course Bundles** is also published, at **$300.00**, containing this
course ($249) and *Introduction to Government Procurement* ($100) — a $49 saving. It
appears in the catalogue and can be bought in one transaction, which is worth testing
separately from a single-course purchase.

Catalogue: https://staging.govprocurement.com.au/learn/courses

---

## 4. What to walk through

In this order. Each step depends on the one before it, and together they cover the whole
path a paying learner takes.

| # | Step | What should happen |
|---|---|---|
| 1 | **Browse as a visitor** — https://staging.govprocurement.com.au/learn/courses | Courses *and* the bundle are both listed, with prices marked inclusive of GST. |
| 2 | **Click a course while signed out** | You are sent to sign-in, and after signing in you land on that course — not dumped on the dashboard. |
| 3 | **Buy the course as the student** | Use test card `4242 4242 4242 4242`, any future expiry, any CVC, any postcode. Payments are in test mode, so no money moves. |
| 4 | **Check the receipt** — https://staging.govprocurement.com.au/learn/orders | Shows the reference, $249.00 total, and GST of $22.64 broken out as inclusive. |
| 5 | **Watch a lecture** | Progress advances and survives a page reload. |
| 6 | **Sit a quiz and fail it deliberately** | Answer one of three correctly. It refuses the pass at 67% and lets you retake. |
| 7 | **Finish the course** — https://staging.govprocurement.com.au/learn/certificates | Both quizzes passed unlocks a downloadable certificate. |
| 8 | **Sign in as the instructor** — https://staging.govprocurement.com.au/learn/instructor/courses | The course appears under My Courses with the enrolment and the student's progress visible. |
| 9 | **Schedule a live session** — https://staging.govprocurement.com.au/learn/instructor/live | Creating one generates a Zoom meeting. The student's Join button stays disabled until 15 minutes before the start — or the moment the instructor opens the room. |
| 10 | **Sign in as the administrator** — https://staging.govprocurement.com.au/admin | Course approvals, users and orders are all reachable from the CMS. |

---

## 5. Before this goes to production

Verified on 28 August 2026. None of these stop staging testing; all of them stop a real
customer transacting safely.

### 5.1 Blockers

**Payments are in Stripe test mode.**
The live environment reports `mode: test`. Real cards are not charged and no money is
collected. Live keys must replace the test keys before launch.

**The default administrator password still works.**
The seeded account `admin@example.com` still accepts its shipped default password. It
should be disabled or have its password rotated — anyone who has seen the codebase can
sign in as a super administrator.

**No ABN on invoices, and placeholder legal text.**
A tax invoice for a GST-inclusive sale must carry the supplier's ABN. The privacy policy
and terms are still placeholder stubs of a few lines each.

### 5.2 Still needed

- **Outbound email.** No SMTP credentials are configured, so password resets, receipts and
  enrolment confirmations cannot be sent. Accounts currently work by password only.
- **Real lecture video.** Both lectures in the demo course are placeholder clips — see 3.1.
- **Clear test data from the production database.** Duplicate courses, probe accounts and
  abandoned orders from development are still present, and should be removed before the
  catalogue is shown to customers.

### 5.3 Confirmed working

Tested on 28 August 2026 and passing:

- GST arithmetic — inclusive, checked exhaustively across every cent from $0 to $1,000;
  `net + GST` equals the total in every case.
- Purchase through to enrolment, including bundles — every paid order on record granted
  exactly the courses it should have.
- Webhook signature enforcement (unsigned, wrong-secret and tampered payloads are all
  rejected) and replay safety — a repeated payment event does not double-grant.
- The live-session join gate, across all twelve window boundaries, including a host
  starting early and cancelled sessions.
- Zoom provisioning — reports ready on the live environment.

### 5.4 Explicitly out of scope

Single sign-on, memberships, coupons, and affiliate tracking were placed out of scope for
this delivery and are not built.

---

*Government Procurement — staging delivery set, prepared 28 August 2026 for
CAL-GP-2026-SCOPE-004. Credentials in this document are live on staging and should be
rotated after handover.*
