# LMS screen conventions

Read this before building any LMS screen. The LMS is a **third sub-application**
alongside the public site and the admin CMS. It shares the same backend API
(`fe/src/api/client.js`), the same design tokens (`styles/tokens.css`) and the
same UI primitives (`components/ui/*`). It does **not** share `admin.css` or
the admin chrome.

```
/            public marketing site   (App.jsx → PublicSite)
/admin/*     CMS for staff           (routes/AdminRoutes.jsx → admin/)
/learn/*     LMS for students        (routes/LmsRoutes.jsx  → lms/)
```

## Where things live

```
fe/src/lms/
├── lms.css                 the LMS design layer. Imported once by LmsLayout
├── layout/                 the persistent chrome (student + player + instructor)
├── context/                session, enrolment, player and cart state
├── constants/              enums shared across screens
├── hooks/                  data-fetching + behaviour, one concern per file
├── utils/                  pure helpers (no React)
├── components/<area>/      reusable pieces, grouped by requirement area
└── pages/<area>/           routed screens, grouped by requirement area
```

Wired centrally (outside `lms/`, do not edit from a screen task):

| File | Role |
| --- | --- |
| `fe/src/routes/LmsRoutes.jsx` | mounts every `/learn/*` route |
| `fe/src/routes/StudentRoute.jsx` | guard. Signed in + enrolled (L6) |
| `fe/src/routes/InstructorRoute.jsx` | guard. Instructor/admin role (R1) |
| `fe/src/api/lms.js` | every LMS endpoint, re-exported from `api/index.js` |
| `fe/src/App.jsx` | adds `<Route path="/learn/*" element={<LmsRoutes />} />` |

## What you get (import these)

```js
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/ui/Button.jsx';   // shared primitives
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';
import { useCourseOutline } from '../../hooks/useCourseOutline.js';
import { enrollmentsApi, lessonsApi } from '../../../api/lms.js';
```

### API shape
Identical to the admin CMS. `lms.js` builds on the same `createResource()`
helper, so every resource has `list / page / get / create / update / remove`,
responses are unwrapped from the `{ success, data, meta }` envelope, failures
throw an `ApiError` with `.message` and `.status`, and Mongo ids are on
`item._id` (fallback `item.id`).

Student calls use the **student** token, not the admin one. `client.js` reads a
single token key, so `StudentAuthContext` owns sign-in for `/learn/*` and the
admin `AuthContext` is never mounted here.

## Requirement → file map

### L1 · Courses, modules and lessons
| Requirement | Files |
| --- | --- |
| Structured courses → modules → lessons | `components/curriculum/OutlineTree.jsx`, `ModuleAccordion.jsx`, `LessonRow.jsx`, `hooks/useCourseOutline.js`, `pages/catalog/CourseOverviewPage.jsx` |
| The learner's enrolled courses | `pages/dashboard/MyCoursesPage.jsx`, `components/catalog/EnrolledCourseCard.jsx`, `CatalogFilters.jsx`, `hooks/useMyCourses.js`. **built** |
| Text lessons + downloadable resources | `components/lesson/LessonBody.jsx`, `ResourceList.jsx`, `ResourceItem.jsx`, `pages/learn/LessonPage.jsx`, `pages/learn/ResourcesPage.jsx` |
| Free preview lessons before purchase | `components/catalog/PreviewBadge.jsx`, `components/lesson/PreviewGate.jsx`, `pages/catalog/PreviewLessonPage.jsx` |

### L2 · Secure video
| Requirement | Files |
| --- | --- |
| Protected, expiring links | `hooks/useSecureVideo.js` (fetches a short-lived signed URL and refreshes it before expiry), `components/player/SecureVideoPlayer.jsx` |
| No easy download or copy | `components/player/VideoGuard.jsx`, `WatermarkOverlay.jsx`, `PlaybackBar.jsx` |
| Transcripts synced to video | `components/player/TranscriptPanel.jsx`, `TranscriptCue.jsx`, `hooks/useTranscript.js`, `utils/transcript.js` |

Player chrome: `layout/PlayerLayout.jsx` + `layout/PlayerSidebar.jsx`. A
distraction-free shell with the curriculum tree beside the video.

### L3 · Assessment and progress
| Requirement | Files |
| --- | --- |
| Auto-marked quizzes | `components/assessment/QuizRunner.jsx`, `QuestionCard.jsx`, `ChoiceInput.jsx`, `TextAnswerInput.jsx`, `QuizTimer.jsx`, `QuizResult.jsx`, `AttemptHistory.jsx`, `hooks/useQuizAttempt.js`, `utils/grading.js`, `pages/assessment/*` |
| Progress + completion tracking | `components/progress/ProgressBar.jsx`, `ProgressRing.jsx`, `CompletionSummary.jsx`, `hooks/useLessonProgress.js`, `utils/progress.js`, `pages/progress/ProgressPage.jsx` |
| Notes and bookmarks | `components/progress/NoteEditor.jsx`, `NoteList.jsx`, `BookmarkButton.jsx`, `BookmarkList.jsx`, `hooks/useNotes.js`, `useBookmarks.js`, `pages/progress/NotesPage.jsx`, `BookmarksPage.jsx` |

### L4 · Certificates and paths
| Requirement | Files |
| --- | --- |
| Programs + customisable certificates | `components/certificates/CertificateCard.jsx`, `CertificatePreview.jsx`, `CertificateDownload.jsx`, `hooks/useCertificate.js`, `pages/certificates/*`, `pages/paths/ProgramPage.jsx`; authoring in `components/instructor/CertificateDesigner.jsx` |
| Learning paths + prerequisites | `components/paths/PathCard.jsx`, `PathStepper.jsx`, `ProgramSummary.jsx`, `components/curriculum/PrerequisiteNotice.jsx`, `pages/paths/PathsPage.jsx`, `PathDetailPage.jsx` |
| Drip content scheduling | `components/curriculum/DripNotice.jsx`, `LockBadge.jsx`, `hooks/useGating.js`, `utils/gating.js`; authoring in `components/instructor/DripScheduler.jsx` |

`utils/gating.js` is the single place that decides whether a lesson is open. It
takes enrolment + drip schedule + prerequisites + preview flag and returns one
reason: `open | locked-drip | locked-prereq | locked-enrolment | preview`.
Never re-derive that inline in a screen.

### L5 · Community
| Requirement | Files |
| --- | --- |
| Q&A + discussion linked to courses | `components/community/DiscussionThread.jsx`, `DiscussionComposer.jsx`, `AnswerCard.jsx`, `VoteButtons.jsx`, `hooks/useDiscussion.js`, `pages/community/CourseDiscussionPage.jsx`, `DiscussionThreadPage.jsx` |
| Reviews and ratings | `components/community/ReviewForm.jsx`, `ReviewList.jsx`, `RatingStars.jsx`, `hooks/useReviews.js`, `pages/community/ReviewsPage.jsx` |
| Badges and gamification | `components/community/BadgeChip.jsx`, `BadgeGrid.jsx`, `LeaderboardTable.jsx`, `constants/badgeTiers.js`, `pages/community/BadgesPage.jsx` |

Discussion reuses the existing `/questions` moderation pipeline where possible,
check `be/src/modules/questions` before adding a parallel one.

### L6 · Access control
| Requirement | Files |
| --- | --- |
| Content gated to enrolled students | `context/EnrollmentContext.jsx`, `hooks/useEnrollment.js`, `routes/StudentRoute.jsx` |
| SSO with the website | `context/StudentAuthContext.jsx`, `pages/auth/LoginPage.jsx`, `SsoCallbackPage.jsx`, `RegisterPage.jsx`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx` |
| Student dashboard and profiles | `layout/LmsLayout.jsx`, `LmsHeader.jsx`, `LmsSidebar.jsx`, `pages/dashboard/*`, `components/account/*` |

### C1 · Payments
`components/commerce/CheckoutForm.jsx`, `StripePaymentElement.jsx`,
`GstBreakdown.jsx`, `hooks/useCheckout.js`, `utils/money.js`,
`pages/commerce/CheckoutPage.jsx`, `OrderConfirmationPage.jsx`, `InvoicePage.jsx`.
GST is computed server-side and echoed by `GstBreakdown`. The client never
calculates tax it then sends to Stripe.

### C2 · Products
`components/commerce/CartSummary.jsx`, `CartLineItem.jsx`, `CouponField.jsx`,
`MembershipCard.jsx`, `BundleCard.jsx`, `PriceTag.jsx`, `context/CartContext.jsx`,
`hooks/useCart.js`, `constants/orderStatuses.js`, `pages/commerce/PricingPage.jsx`,
`CartPage.jsx`, `MembershipPage.jsx`, `OrdersPage.jsx`.

### C3 · Organisations
`components/org/OrgSwitcher.jsx`, `SeatTable.jsx`, `InviteMembersForm.jsx`,
`BulkEnrolUpload.jsx`, `GroupReportChart.jsx`, `hooks/useSeats.js`,
`pages/org/OrgDashboardPage.jsx`, `SeatsPage.jsx`, `BulkEnrolPage.jsx`,
`GroupReportsPage.jsx`.

### R1 · Administration
Teacher-facing tooling lives here, **not** in `admin/`. `admin/` stays the
staff CMS for the marketing site. Shell: `layout/InstructorLayout.jsx`, guard:
`routes/InstructorRoute.jsx`.

| Requirement | Files |
| --- | --- |
| Self-service teacher/admin interfaces | `pages/instructor/InstructorDashboardPage.jsx`, `InstructorCoursesPage.jsx`, `StudentRosterPage.jsx` |
| Multi-instructor management | `components/instructor/InstructorAssignment.jsx`, `RosterTable.jsx`, `pages/instructor/InstructorsPage.jsx` |
| Catalogue + content management | `components/instructor/CourseBuilder.jsx`, `ModuleEditor.jsx`, `LessonEditor.jsx`, `QuizBuilder.jsx`, `MediaUploader.jsx`, `pages/instructor/CourseBuilderPage.jsx`, `LessonBuilderPage.jsx`, `QuizBuilderPage.jsx`, `CatalogueManagerPage.jsx` |

### R2 · Communications
`hooks/useNotifications.js`, `pages/comms/NotificationsPage.jsx`,
`EmailTemplatesPage.jsx`, `AnalyticsPage.jsx`. Email sending reuses
`be/src/utils/mailer.js`; charts follow the `dataviz` conventions.

### R3 · Growth
`components/growth/AffiliateLinkCard.jsx`, `ReferralInviteForm.jsx`,
`LiveSessionCard.jsx`, `LiveSessionRoom.jsx`, `CourseCoachWidget.jsx`,
`pages/growth/AffiliatePage.jsx`, `ReferralsPage.jsx`, `LiveSessionsPage.jsx`,
`LiveSessionRoomPage.jsx`.

## Route map (`/learn` prefix)

```
/learn/login            /learn/sso/callback     /learn/register
/learn                                          dashboard
/learn/courses                                  catalog
/learn/courses/:slug                            course overview + outline
/learn/courses/:slug/preview/:lessonId          free preview          (L1)
/learn/courses/:slug/lessons/:lessonId          text lesson           (L1)
/learn/courses/:slug/watch/:lessonId            secure video + transcript (L2)
/learn/courses/:slug/resources                  downloads             (L1)
/learn/courses/:slug/quiz/:quizId               quiz runner           (L3)
/learn/courses/:slug/quiz/:quizId/result        marked result         (L3)
/learn/courses/:slug/discussion                 course Q&A            (L5)
/learn/courses/:slug/discussion/:threadId       thread                (L5)
/learn/courses/:slug/reviews                    reviews + ratings     (L5)
/learn/progress   /learn/notes   /learn/bookmarks                     (L3)
/learn/paths      /learn/paths/:slug     /learn/programs/:slug        (L4)
/learn/certificates       /learn/certificates/:id                     (L4)
/learn/badges                                                         (L5)
/learn/my-courses  /learn/profile  /learn/settings                    (L6)
/learn/pricing  /learn/cart  /learn/checkout  /learn/orders  …         (C1,C2)
/learn/org/*                                                          (C3)
/learn/instructor/*                                                   (R1)
/learn/notifications  /learn/analytics                                (R2)
/learn/affiliate  /learn/referrals  /learn/live/*                     (R3)
```

## Rules
- Only create/modify the files named in your task. Do **not** touch
  `LmsRoutes.jsx`, `App.jsx`, `api/lms.js`, `lms.css` or the shared
  `components/ui/*`. Those are wired centrally.
- Every file listed above already exists but is **EMPTY**. Read first (it warns
  "empty"), then Write.
- Screens render **inside** `LmsLayout` (or `PlayerLayout` / `InstructorLayout`),
  so `lms.css` is already loaded. Do not import it, and do not add your own
  header/sidebar.
- Prefix LMS classes `lms-` so they never collide with `admin-` or public-site
  styles.
- Plain JSX, no TypeScript, no new dependencies without asking (Stripe.js for C1
  is the expected exception).
- After writing, run `cd fe && npx oxlint <your files>` and fix errors in your
  files.
