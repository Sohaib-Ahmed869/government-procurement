import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { loadCourse, ownsCourse } from '../../middleware/ownership.js';
import { uploadImage } from '../../middleware/upload.js';
import { ADMIN_ONLY, CONTENT_ROLES, TEACHING_ROLES } from '../../constants/roles.js';
import * as authoring from './authoring.controller.js';
import * as learning from './learning.controller.js';
import * as analytics from './analytics.controller.js';
import * as discussions from './discussions.controller.js';
import * as reviews from './reviews.controller.js';

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
router.post('/progress/lessons/:lessonId/complete', protect, learning.completeLesson);
router.patch('/progress/lessons/:lessonId/position', protect, learning.setPosition);

router.get('/lessons/:lessonId/video-url', protect, learning.videoUrl);
router.get('/lessons/:lessonId/document-url', protect, learning.documentUrl);
router.get('/lessons/:lessonId/resources/:resourceId/url', protect, learning.resourceUrl);
router.get('/lessons/:lessonId/transcript', protect, learning.transcript);

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

/* Course reviews (L5). Same records the instructor's Reviews page reads.
   Enrolment and progress are checked on write, in the controller. */
router.get('/reviews/mine', protect, reviews.myReviews);
router.post('/reviews', protect, reviews.saveReview);
router.delete('/reviews/:id', protect, reviews.removeReview);

router.get('/certificates', protect, learning.myCertificates);
router.get('/certificates/:id', protect, learning.getCertificate);

/* ---- Instructor authoring -------------------------------------------------
   Two guards on every write, and both are needed. `authorize` answers "is this
   an instructor?"; `ownsCourse` answers "is this THEIR course?", without the
   second, any instructor could edit anyone's course by changing the id. */
const teach = [protect, authorize(TEACHING_ROLES)];
const owns = [...teach, loadCourse, ownsCourse];

router.get('/authoring/courses', ...teach, authoring.myCourses);
router.post('/authoring/courses', ...teach, authoring.createCourse);

// Enrolments, for the teaching side. The summary is scoped to the signed-in
// instructor's own courses; the roster additionally goes through `owns`, so a
// course id from somebody else's course reads as not found.
router.get('/authoring/enrollments', ...teach, authoring.enrolmentSummary);

// Cohort analytics. Scoped to the instructor's own courses by what each query
// loads; the per-quiz route takes a LESSON id, so it checks ownership itself
// rather than going through `owns`, which works on a course id.
// The questions inbox: the same threads, filtered to the courses they wrote.
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
// Declared before /:courseId so the static segments aren't swallowed by it.
router.get('/review/:courseId', ...staffRead, authoring.reviewDetail);

router.post('/review/:courseId/approve', ...admin, authoring.approveCourse);
router.post('/review/:courseId/reject', ...admin, authoring.rejectCourse);
// Refused outright, as opposed to sent back to be fixed. Both need a reason.
router.post('/review/:courseId/decline', ...admin, authoring.declineCourse);
router.post('/review/:courseId/unpublish', ...admin, authoring.unpublishCourse);
router.patch('/review/:courseId/featured', ...admin, authoring.setFeatured);

export default router;
