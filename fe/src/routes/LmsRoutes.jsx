import { Navigate, Routes, Route, useParams } from 'react-router-dom';
import { StudentAuthProvider, useStudentAuth } from '../lms/context/StudentAuthContext.jsx';
import { CartProvider } from '../lms/context/CartContext.jsx';
import { ToastProvider } from '../lms/context/ToastContext.jsx';
import Toasts from '../lms/components/Toasts.jsx';
import InstructorRoute from './InstructorRoute.jsx';
import StudentRoute from './StudentRoute.jsx';
import AuthLayout from '../lms/layout/AuthLayout.jsx';
import SignUpPage from '../lms/pages/auth/SignUpPage.jsx';
import LoginPage from '../lms/pages/auth/LoginPage.jsx';
import ForgotPasswordPage from '../lms/pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../lms/pages/auth/ResetPasswordPage.jsx';
import AuthCallbackPage from '../lms/pages/auth/AuthCallbackPage.jsx';
import InstructorDashboardPage from '../lms/pages/instructor/InstructorDashboardPage.jsx';
import InstructorCoursesPage from '../lms/pages/instructor/InstructorCoursesPage.jsx';
import InstructorPathsPage from '../lms/pages/instructor/InstructorPathsPage.jsx';
import PathBuilderPage from '../lms/pages/instructor/PathBuilderPage.jsx';
import NewCoursePage from '../lms/pages/instructor/NewCoursePage.jsx';
import CourseBuilderPage from '../lms/pages/instructor/CourseBuilderPage.jsx';
import QuizzesPage from '../lms/pages/instructor/QuizzesPage.jsx';
import EnrolmentsPage from '../lms/pages/instructor/EnrolmentsPage.jsx';
import CohortProgressPage from '../lms/pages/instructor/CohortProgressPage.jsx';
import QuestionsPage from '../lms/pages/instructor/QuestionsPage.jsx';
import InstructorReviewsPage from '../lms/pages/instructor/InstructorReviewsPage.jsx';
import InstructorLiveSessionsPage from '../lms/pages/instructor/InstructorLiveSessionsPage.jsx';
import QuizAnalyticsPage from '../lms/pages/instructor/QuizAnalyticsPage.jsx';
import StudentRosterPage from '../lms/pages/instructor/StudentRosterPage.jsx';
import LmsLayout from '../lms/layout/LmsLayout.jsx';
import DashboardPage from '../lms/pages/dashboard/DashboardPage.jsx';
import CoachPage from '../lms/pages/coach/CoachPage.jsx';
import LiveSessionsPage from '../lms/pages/growth/LiveSessionsPage.jsx';
import MyCoursesPage from '../lms/pages/dashboard/MyCoursesPage.jsx';
import CatalogPage from '../lms/pages/catalog/CatalogPage.jsx';
import CourseOverviewPage from '../lms/pages/catalog/CourseOverviewPage.jsx';
import PlayerLayout from '../lms/layout/PlayerLayout.jsx';
import LessonPage from '../lms/pages/learn/LessonPage.jsx';
import VideoLessonPage from '../lms/pages/learn/VideoLessonPage.jsx';
import DocLessonPage from '../lms/pages/learn/DocLessonPage.jsx';
import QuizPage from '../lms/pages/assessment/QuizPage.jsx';
import QuizResultPage from '../lms/pages/assessment/QuizResultPage.jsx';
import PathsPage from '../lms/pages/paths/PathsPage.jsx';
import PathDetailPage from '../lms/pages/paths/PathDetailPage.jsx';
import CertificatesPage from '../lms/pages/certificates/CertificatesPage.jsx';
import CertificateViewPage from '../lms/pages/certificates/CertificateViewPage.jsx';
import CourseDiscussionPage from '../lms/pages/community/CourseDiscussionPage.jsx';
import DiscussionThreadPage from '../lms/pages/community/DiscussionThreadPage.jsx';
import ReviewsPage from '../lms/pages/community/ReviewsPage.jsx';
import BadgesPage from '../lms/pages/community/BadgesPage.jsx';
import OrdersPage from '../lms/pages/commerce/OrdersPage.jsx';
import InvoicePage from '../lms/pages/commerce/InvoicePage.jsx';
import CheckoutPage from '../lms/pages/commerce/CheckoutPage.jsx';
import OrderConfirmationPage from '../lms/pages/commerce/OrderConfirmationPage.jsx';
import ProfilePage from '../lms/pages/dashboard/ProfilePage.jsx';
import InstructorProfilePage from '../lms/pages/dashboard/InstructorProfilePage.jsx';
import AccountSettingsPage from '../lms/pages/dashboard/AccountSettingsPage.jsx';
import ProgressPage from '../lms/pages/progress/ProgressPage.jsx';
import NotesPage from '../lms/pages/progress/NotesPage.jsx';
import BookmarksPage from '../lms/pages/progress/BookmarksPage.jsx';

// Placeholder for the sections whose screens are still empty stubs, so every
// item in the sidebar leads somewhere legible instead of a blank page. Each one
// gets replaced by its real screen as it is built.
// /instructor/courses/:id/students used to be its own stub. A course's learners
// now live under Enrolments, so the old path forwards there rather than
// becoming a dead link.
function CourseStudentsRedirect() {
  const { courseId } = useParams();
  return <Navigate to={`/learn/instructor/students/${courseId}`} replace />;
}

// /learn/profile serves both roles, because "your profile" is one idea and one
// sidebar link. What it MEANS differs enough to be two components: a learner's
// is their progress and their public name; an instructor's is their published
// work and the byline the site prints beside it.
//
// Split here rather than branched inside ProfilePage, so each mounts its own
// hooks. A component that calls useProgress() only when the viewer is a learner
// would be calling hooks conditionally.
function ProfileForRole() {
  const { isInstructor } = useStudentAuth();
  return isInstructor ? <InstructorProfilePage /> : <ProfilePage />;
}

function Soon({ title, note }) {
  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">{title}</h1>
          <p className="lms-page__subtitle">{note}</p>
        </div>
      </div>
      <div className="lms-card">
        <p className="lms-empty">
          This screen hasn’t been built yet. The file is scaffolded and waiting.
        </p>
      </div>
    </div>
  );
}

// Signed out, `me` is the only honest answer to most of these screens. There is
// no dashboard, no progress and no certificate without a user. Wrapping them
// keeps a visitor from seeing an app shell full of nothing.
const me = (element) => <StudentRoute>{element}</StudentRoute>;

// The student LMS, mounted at /learn/* by App.jsx. StudentAuthProvider is
// scoped here so neither the public site nor the CMS carries student session
// state.
//
// Three tiers of access:
//   public      the catalogue, a course's sales page, and free preview lessons
//               (L1). These sell the course, so they must work signed out.
//   me()        anything about a particular person: their courses, progress,
//               notes, orders, certificates, and every in-course screen.
//   Instructor  the teaching side, on top of being signed in.
export default function LmsRoutes() {
  return (
    <StudentAuthProvider>
      <CartProvider>
      {/* Toasts sit above the router, so a message raised on one screen is not
          torn down by navigating away from it. */}
      <ToastProvider>
      <Toasts />
      <Routes>
        {/* Auth. Full-page, no app chrome. This is the single sign-in for
            everyone; the role decides where they land. AuthLayout carries the
            stylesheet and the `.lms` token scope these pages would otherwise
            inherit from LmsLayout. */}
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignUpPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          {/* Where the OAuth round trip lands. Public by necessity — the whole
              job of this screen is to turn the provider's redirect into a
              session, so it runs before one exists. */}
          <Route path="auth/callback" element={<AuthCallbackPage />} />
        </Route>

        {/* In-course screens use the distraction-free player shell instead of
            the app chrome, so they sit outside the LmsLayout branch. */}
        <Route element={<PlayerLayout />}>
          <Route path="courses/:slug/lessons/:lessonId" element={me(<LessonPage />)} />
          {/* Free previews: the same three screens, without the sign-in
              requirement, because a sample that needs an account is not a
              sample. One route per KIND — a single shared one sent every
              preview to the text screen, so a preview video rendered as "no
              written content yet".

              Open here, gated on the server: gateFor() answers `preview` only
              for a lesson the instructor flagged, and `locked-enrolment` for
              everything else, whichever route asks. */}
          <Route path="courses/:slug/preview/:lessonId" element={<LessonPage />} />
          <Route path="courses/:slug/preview/:lessonId/watch" element={<VideoLessonPage />} />
          <Route path="courses/:slug/preview/:lessonId/doc" element={<DocLessonPage />} />
          <Route path="courses/:slug/watch/:lessonId" element={me(<VideoLessonPage />)} />
          <Route path="courses/:slug/doc/:lessonId" element={me(<DocLessonPage />)} />
          <Route path="courses/:slug/quiz/:quizId" element={me(<QuizPage />)} />
          <Route path="courses/:slug/quiz/:quizId/result/:attemptId" element={me(<QuizResultPage />)} />
        </Route>

        <Route element={<LmsLayout />}>
          <Route index element={me(<DashboardPage />)} />

          {/* Instructor (R1). Same shell, teaching tabs. Guarded here AND on
              every endpoint the server exposes. */}
          <Route path="instructor" element={<InstructorRoute><InstructorDashboardPage /></InstructorRoute>} />
          <Route path="instructor/courses" element={<InstructorRoute><InstructorCoursesPage /></InstructorRoute>} />
          <Route path="instructor/courses/new" element={<InstructorRoute><NewCoursePage /></InstructorRoute>} />
          <Route path="instructor/courses/:courseId" element={<InstructorRoute><CourseBuilderPage /></InstructorRoute>} />
          {/* One course's learners is the enrolments page with that course
              picked, not a screen of its own. Kept as a redirect because the
              path was linked to before the page existed. */}
          <Route path="instructor/courses/:courseId/students" element={<InstructorRoute><CourseStudentsRedirect /></InstructorRoute>} />
          <Route path="instructor/quizzes" element={<InstructorRoute><QuizzesPage /></InstructorRoute>} />

          {/* Learning paths (LMS 8.0). A path curates published courses, so it
              is authored beside them rather than inside one of them. */}
          <Route path="instructor/paths" element={<InstructorRoute><InstructorPathsPage /></InstructorRoute>} />
          <Route path="instructor/paths/:programId" element={<InstructorRoute><PathBuilderPage /></InstructorRoute>} />
          <Route path="instructor/students" element={<InstructorRoute><EnrolmentsPage /></InstructorRoute>} />
          <Route path="instructor/students/:courseId" element={<InstructorRoute><StudentRosterPage /></InstructorRoute>} />
          <Route path="instructor/progress" element={<InstructorRoute><CohortProgressPage /></InstructorRoute>} />
          <Route path="instructor/progress/quizzes/:lessonId" element={<InstructorRoute><QuizAnalyticsPage /></InstructorRoute>} />
          <Route path="instructor/discussions" element={<InstructorRoute><QuestionsPage /></InstructorRoute>} />
          <Route path="instructor/reviews" element={<InstructorRoute><InstructorReviewsPage /></InstructorRoute>} />
          {/* Live sessions (LMS 17.0b). Scheduling sits with the teaching tabs;
              the learner's view of the same sessions is under Learning. */}
          <Route path="instructor/live" element={<InstructorRoute><InstructorLiveSessionsPage /></InstructorRoute>} />

          {/* Learning. The catalogue and a course's page are the shop window,
              public. "My courses" is not. */}
          <Route path="my-courses" element={me(<MyCoursesPage />)} />
          <Route path="courses" element={<CatalogPage />} />
          <Route path="courses/:slug" element={<CourseOverviewPage />} />
          <Route path="paths" element={<PathsPage />} />
          <Route path="paths/:slug" element={<PathDetailPage />} />

          {/* Progress */}
          <Route path="progress" element={me(<ProgressPage />)} />
          <Route path="notes" element={me(<NotesPage />)} />
          <Route path="bookmarks" element={me(<BookmarksPage />)} />
          <Route path="certificates" element={me(<CertificatesPage />)} />
          <Route path="certificates/:id" element={me(<CertificateViewPage />)} />

          {/* Course Coach (LMS 18.0). Mounted HERE and only here — never on
              /advisory, where the Procurement Advisor is contractually not AI
              and says so on screen. me(), because the coach answers from the
              learner's own enrolments and there is nothing to answer from
              without an account. */}
          <Route path="coach" element={me(<CoachPage />)} />

          {/* Live sessions. me(), because the list is built from the reader's
              own enrolments and there is nothing to show without them. */}
          <Route path="live" element={me(<LiveSessionsPage />)} />

          {/* Community */}
          <Route path="discussions" element={me(<CourseDiscussionPage />)} />
          <Route path="discussions/:threadId" element={me(<DiscussionThreadPage />)} />
          <Route path="reviews" element={me(<ReviewsPage />)} />
          <Route path="badges" element={me(<BadgesPage />)} />

          {/* Account */}
          <Route path="checkout" element={me(<CheckoutPage />)} />
          <Route path="checkout/confirmation/:orderId" element={me(<OrderConfirmationPage />)} />
          <Route path="orders" element={me(<OrdersPage />)} />
          <Route path="orders/:orderId/invoice" element={me(<InvoicePage />)} />
          <Route path="profile" element={me(<ProfileForRole />)} />
          <Route path="settings" element={me(<AccountSettingsPage />)} />

          <Route path="*" element={<Soon title="Not found" note="That page doesn't exist in the LMS." />} />
        </Route>
      </Routes>
      </ToastProvider>
      </CartProvider>
    </StudentAuthProvider>
  );
}
