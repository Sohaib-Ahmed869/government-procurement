import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { loadCourse, ownsCourse, loadProgram, ownsProgram } from '../../middleware/ownership.js';
import { uploadImage } from '../../middleware/upload.js';
import { ADMIN_ONLY, CONTENT_ROLES, TEACHING_ROLES } from '../../constants/roles.js';
import * as authoring from './authoring.controller.js';
import * as learning from './learning.controller.js';
import * as analytics from './analytics.controller.js';
import * as discussions from './discussions.controller.js';
import * as notifications from './notifications.controller.js';
import * as coach from './coach.controller.js';
import * as reviews from './reviews.controller.js';
import * as gamification from './gamification.controller.js';
import * as programs from './programs.controller.js';
import * as study from './study.controller.js';
import * as live from './liveSessions.controller.js';

const router = Router();

/* ---- Public ---------------------------------------------------------------
   optionalAuth, not protect: the outline and free previews are readable by
   anyone, but a signed-in learner sees their own progress and gates resolved. */
router.get('/certificates/verify/:credentialId', learning.verifyCertificate);
router.get('/courses/:slug/outline', optionalAuth, learning.outline);
// Public like the course page it belongs on: a rating only enrolled learners
// could read would not help anyone decide whether to enrol.
router.get('/courses/:slug/reviews', optionalAuth, reviews.courseReviews);
router.get('/courses/:slug/lessons/:lessonId', optionalAuth, loadCourse, learning.getLesson);

/* ---- Learner --------------------------------------------------------------- */
router.post('/enrollments', protect, learning.enrol);
router.get('/enrollments', protect, learning.myEnrollments);

router.get('/progress', protect, learning.myProgress);

/* ---- Live sessions (LMS 17.0b) --------------------------------------------
   `/join` is the gate, and the only way a join URL ever leaves the server. The
   listing above it carries no link at all — see forLearner() on the model. */
router.get('/live/status', protect, live.status);
router.get('/live-sessions', protect, live.myUpcoming);
router.get('/live-sessions/:id/join', protect, live.join);

/* ---- A learner's own study record ----------------------------------------
   Notes, bookmarks and the day-by-day activity the dashboard and My Progress
   chart. All three were browser-only until now — see study.controller.js. */
router.get('/activity', protect, study.myActivity);

router.get('/notes', protect, study.listNotes);
router.post('/notes', protect, study.createNote);
router.patch('/notes/:id', protect, study.updateNote);
router.delete('/notes/:id', protect, study.removeNote);

router.get('/bookmarks', protect, study.listBookmarks);
router.post('/bookmarks', protect, study.createBookmark);
router.delete('/bookmarks/:id', protect, study.removeBookmark);

router.post('/progress/lessons/:lessonId/complete', protect, learning.completeLesson);
router.patch('/progress/lessons/:lessonId/position', protect, learning.setPosition);

// Lesson media is optional-auth, not protected (LMS 9.0b). A free preview has
// to play for somebody who has not signed up, or it is not a preview. The
// enrolment check has NOT moved: every one of these still runs gateFor(), which
// returns `preview` only for a lesson the instructor flagged as one and
// `locked-enrolment` for the rest, signed in or not.
router.get('/lessons/:lessonId/video-url', optionalAuth, learning.videoUrl);
router.get('/lessons/:lessonId/document-url', optionalAuth, learning.documentUrl);
router.get('/lessons/:lessonId/resources/:resourceId/url', optionalAuth, learning.resourceUrl);
router.get('/lessons/:lessonId/transcript', optionalAuth, learning.transcript);

// Encrypted HLS (LMS 3.0). Optional-auth for the same reason the rest of the
// lesson media is: a free preview has to play without an account. Both run the
// enrolment gate, and the key endpoint runs it again on every request, so
// revoking access stops playback rather than waiting for a page load.
router.get('/lessons/:lessonId/hls', optionalAuth, learning.hlsTicket);
router.get('/lessons/:lessonId/hls/index.m3u8', optionalAuth, learning.hlsPlaylist);
router.get('/lessons/:lessonId/hls/key/:group', optionalAuth, learning.hlsKey);

// Declared before /:lessonId so "attempts" isn't read as a lesson id.
router.get('/quizzes/attempts', protect, learning.allMyAttempts);
router.get('/quizzes/attempts/:attemptId', protect, learning.getAttemptById);
router.get('/quizzes/:lessonId', protect, learning.getQuiz);
router.post('/quizzes/:lessonId/submit', protect, learning.submitQuiz);
router.get('/quizzes/:lessonId/attempts', protect, learning.myAttempts);

/* Course discussion (L5). One dataset: what a learner asks here is what their
   instructor sees on the teaching side. Reading and posting both require an
   enrolment, which the controller checks per course. */
router.get('/discussions', protect, discussions.listDiscussions);
router.post('/discussions', protect, discussions.askQuestion);
router.get('/discussions/:id', protect, discussions.getDiscussion);
router.post('/discussions/:id/replies', protect, discussions.addReply);
router.post('/discussions/:id/vote', protect, discussions.toggleVote);
router.post('/discussions/:id/replies/:replyId/vote', protect, discussions.toggleVote);
router.post('/discussions/:id/replies/:replyId/accept', protect, discussions.acceptReply);

/* The bell (R2). Read state is per account, not per browser, so dismissing a
   notification on a laptop settles it on a phone too. */
router.get('/notifications', protect, notifications.myNotifications);
router.post('/notifications/read', protect, notifications.markNotificationsRead);

/* Course Coach (LMS 18.0). Course-scoped AI study help.

   Every question names a course and the controller checks the enrolment, so
   there is deliberately no "ask anything" route: the coach answers from one
   course's lessons or it does not answer. That boundary is what keeps it clear
   of the Procurement Advisor (A6), which is contractually not AI. */
router.get('/coach/status', protect, coach.status);
router.post('/coach/ask', protect, coach.ask);

/* Course reviews (L5). Same records the instructor's Reviews page reads.
   Enrolment and progress are checked on write, in the controller. */
router.get('/reviews/mine', protect, reviews.myReviews);

/* Cohort standings for the badges page. `protect` because the ranking is scoped
   to the signed-in learner's own courses — there is no anonymous view of it. */
router.get('/badges/leaderboard', protect, gamification.leaderboard);
router.post('/reviews', protect, reviews.saveReview);
router.delete('/reviews/:id', protect, reviews.removeReview);

/* ---- Learning paths (LMS 8.0) ---------------------------------------------
   optionalAuth for the same reason the course outline uses it: the paths are a
   shop window, and a signed-in learner additionally gets every step resolved
   against courses they have already finished. */
router.get('/programs', optionalAuth, programs.listPrograms);
router.get('/programs/:slug', optionalAuth, programs.getProgramBySlug);

router.get('/certificates', protect, learning.myCertificates);
router.get('/certificates/:id', protect, learning.getCertificate);

/* ---- Instructor authoring -------------------------------------------------
   Two guards on every write, and both are needed. `authorize` answers "is this
   an instructor?"; `ownsCourse` answers "is this THEIR course?", without the
   second, any instructor could edit anyone's course by changing the id. */
const teach = [protect, authorize(TEACHING_ROLES)];
const owns = [...teach, loadCourse, ownsCourse];
// The same pair for a learning path: an instructor may only touch their own.
const ownsPath = [...teach, loadProgram, ownsProgram];

router.get('/authoring/programs', ...teach, programs.myPrograms);
router.post('/authoring/programs', ...teach, programs.createProgram);
router.get('/authoring/programs/:programId', ...ownsPath, programs.getProgram);
router.patch('/authoring/programs/:programId', ...ownsPath, programs.updateProgram);
router.delete('/authoring/programs/:programId', ...ownsPath, programs.deleteProgram);
router.post('/authoring/programs/:programId/submit', ...ownsPath, programs.submitProgramForReview);
router.post('/authoring/programs/:programId/withdraw', ...ownsPath, programs.withdrawProgram);

router.get('/authoring/courses', ...teach, authoring.myCourses);
router.post('/authoring/courses', ...teach, authoring.createCourse);

// Enrolments, for the teaching side. The summary is scoped to the signed-in
// instructor's own courses; the roster additionally goes through `owns`, so a
// course id from somebody else's course reads as not found.
router.get('/authoring/enrollments', ...teach, authoring.enrolmentSummary);

// The instructor's own profile rollup: courses, reach and rating.
router.get('/authoring/profile', ...teach, authoring.instructorProfileSummary);

// Cohort analytics. Scoped to the instructor's own courses by what each query
// loads; the per-quiz route takes a LESSON id, so it checks ownership itself
// rather than going through `owns`, which works on a course id.
// The questions inbox: the same threads, filtered to the courses they wrote.
/* Live sessions. Ownership is checked inside the controller rather than by
   `owns`, because the id in the path is a SESSION's, not a course's — the
   course it belongs to is looked up first and its author is the test. */
router.get('/authoring/live-sessions', ...teach, live.mySessions);
router.post('/authoring/live-sessions', ...teach, live.createSession);
router.patch('/authoring/live-sessions/:id', ...teach, live.updateSession);
router.delete('/authoring/live-sessions/:id', ...teach, live.cancelSession);
router.post('/authoring/live-sessions/:id/retry', ...teach, live.retryMeeting);
router.get('/authoring/live-sessions/:id/host', ...teach, live.hostUrl);

router.get('/authoring/discussions', ...teach, discussions.instructorQuestions);
// The same reviews their learners wrote, filtered to the courses they authored.
router.get('/authoring/reviews', ...teach, reviews.instructorReviews);

router.get('/authoring/analytics', ...teach, analytics.cohortAnalytics);
router.get('/authoring/analytics/quizzes/:lessonId', ...teach, analytics.quizAnalytics);

router.get('/authoring/courses/:courseId/enrollments', ...owns, authoring.courseEnrolments);
router.get('/authoring/courses/:courseId', ...owns, authoring.getCourse);
router.patch('/authoring/courses/:courseId', ...owns, authoring.updateCourse);
router.delete('/authoring/courses/:courseId', ...owns, authoring.deleteCourse);
router.post('/authoring/courses/:courseId/submit', ...owns, authoring.submitForReview);
router.post('/authoring/courses/:courseId/withdraw', ...owns, authoring.withdrawSubmission);

// Issues a presigned PUT so the browser uploads video straight to S3. `owns`
// means an instructor can only get an upload slot on their own course.
router.post('/authoring/courses/:courseId/video-upload', ...owns, authoring.videoUploadUrl);
// The same slot for any lesson attachment. `kind` in the body picks the folder
// and the accepted content types.
router.post('/authoring/courses/:courseId/upload-url', ...owns, authoring.uploadUrl);

// The cover image goes through the API rather than straight to S3. It is small,
// and the URL the website renders has to be one the SERVER derived from the key
// it stored. See the note beside AUTHOR_FIELDS.
router.post(
  '/authoring/courses/:courseId/image',
  ...owns,
  uploadImage.single('file'),
  authoring.courseImage,
);
router.delete('/authoring/courses/:courseId/image', ...owns, authoring.removeCourseImage);

router.post('/authoring/courses/:courseId/modules', ...owns, authoring.createModule);
router.patch('/authoring/courses/:courseId/modules/reorder', ...owns, authoring.reorderModules);
router.patch('/authoring/courses/:courseId/modules/:moduleId', ...owns, authoring.updateModule);
router.delete('/authoring/courses/:courseId/modules/:moduleId', ...owns, authoring.deleteModule);

router.post('/authoring/courses/:courseId/modules/:moduleId/lessons', ...owns, authoring.createLesson);
router.patch('/authoring/courses/:courseId/lessons/reorder', ...owns, authoring.reorderLessons);
router.patch('/authoring/courses/:courseId/lessons/:lessonId', ...owns, authoring.updateLesson);
router.delete('/authoring/courses/:courseId/lessons/:lessonId', ...owns, authoring.deleteLesson);

/* ---- Admin review (CMS) ---------------------------------------------------
   Approving is the only path to published, and only a super admin walks it. */
// CONTENT_ROLES rather than ADMIN_ONLY for the read-only views: an editor
// running the site should be able to see the queue. Only a super admin decides.
const staffRead = [protect, authorize(CONTENT_ROLES)];
const admin = [protect, authorize(ADMIN_ONLY)];

router.get('/review/queue', ...staffRead, authoring.reviewQueue);
router.get('/review/courses', ...staffRead, authoring.allCourses);

// Learning paths go through the same queue as courses, and these MUST be
// declared before /review/:courseId or "programs" is read as a course id.
router.get('/review/programs', ...staffRead, programs.allPrograms);
router.get('/review/programs/:programId', ...staffRead, programs.programReviewDetail);
router.post('/review/programs/:programId/approve', ...admin, programs.approveProgram);
router.post('/review/programs/:programId/reject', ...admin, programs.rejectProgram);
router.post('/review/programs/:programId/decline', ...admin, programs.declineProgram);
router.post('/review/programs/:programId/unpublish', ...admin, programs.unpublishProgram);

// Declared before /:courseId so the static segments aren't swallowed by it.
router.get('/review/:courseId', ...staffRead, authoring.reviewDetail);

router.post('/review/:courseId/approve', ...admin, authoring.approveCourse);
router.post('/review/:courseId/reject', ...admin, authoring.rejectCourse);
// Refused outright, as opposed to sent back to be fixed. Both need a reason.
router.post('/review/:courseId/decline', ...admin, authoring.declineCourse);
router.post('/review/:courseId/unpublish', ...admin, authoring.unpublishCourse);
router.patch('/review/:courseId/featured', ...admin, authoring.setFeatured);

export default router;
