// LMS API surface.
//
// Kept separate from api/index.js on purpose: that file is the CMS + public
// site's contract and is not modified by LMS work. This one imports the same
// client, so behaviour (auth header, the { success, data, meta } envelope,
// ApiError) is identical.
//
// Paths here mirror be/src/modules/lms/lms.routes.js exactly.
import { api } from './client.js';

// ---- L6 · Accounts ----------------------------------------------------------
// Self-service signup. Separate from /auth/register, which is admin-only staff
// provisioning. See be/src/modules/accounts.
export const accountsApi = {
  signup: (body) => api.post('/accounts/signup', body, { auth: false }),
  me: () => api.get('/accounts/me'),
  updateInstructorProfile: (body) => api.patch('/accounts/instructor-profile', body),
};

// ---- R1 · Instructor authoring ----------------------------------------------
// Every write is ownership-checked server-side; the ids below are course ids,
// not slugs, because that is what the authoring routes take.
export const authoringApi = {
  myCourses: () => api.get('/lms/authoring/courses'),
  // A card per course: how many are enrolled, how many finished, how far the
  // rest have got. The roster itself is a second call, made once a course is
  // picked — a course with 800 learners shouldn't be loaded to count them.
  enrolments: () => api.get('/lms/authoring/enrollments'),
  courseEnrolments: (courseId) => api.get(`/lms/authoring/courses/${courseId}/enrollments`),
  // The rollup behind the instructor's own profile: courses, reach and rating.
  // One request rather than reducing the three pages' payloads client-side.
  profileSummary: () => api.get('/lms/authoring/profile'),

  // Learning paths (LMS 8.0). A path curates existing courses, so these only
  // ever move references around; nothing here creates lesson content.
  programs: () => api.get('/lms/authoring/programs'),
  createProgram: (body) => api.post('/lms/authoring/programs', body),
  getProgram: (programId) => api.get(`/lms/authoring/programs/${programId}`),
  updateProgram: (programId, body) => api.patch(`/lms/authoring/programs/${programId}`, body),
  removeProgram: (programId) => api.del(`/lms/authoring/programs/${programId}`),
  submitProgram: (programId) => api.post(`/lms/authoring/programs/${programId}/submit`),
  withdrawProgram: (programId) => api.post(`/lms/authoring/programs/${programId}/withdraw`),

  // Cohort analytics: how the assessments are performing, and who has stopped.
  // The per-quiz call takes a LESSON id — a quiz is a lesson of kind 'quiz'.
  analytics: () => api.get('/lms/authoring/analytics'),
  quizAnalytics: (lessonId) => api.get(`/lms/authoring/analytics/quizzes/${lessonId}`),
  get: (courseId) => api.get(`/lms/authoring/courses/${courseId}`),
  create: (body) => api.post('/lms/authoring/courses', body),
  update: (courseId, body) => api.patch(`/lms/authoring/courses/${courseId}`, body),
  remove: (courseId) => api.del(`/lms/authoring/courses/${courseId}`),

  submit: (courseId) => api.post(`/lms/authoring/courses/${courseId}/submit`),
  withdraw: (courseId) => api.post(`/lms/authoring/courses/${courseId}/withdraw`),

  addModule: (courseId, body) => api.post(`/lms/authoring/courses/${courseId}/modules`, body),
  updateModule: (courseId, moduleId, body) =>
    api.patch(`/lms/authoring/courses/${courseId}/modules/${moduleId}`, body),
  removeModule: (courseId, moduleId) =>
    api.del(`/lms/authoring/courses/${courseId}/modules/${moduleId}`),
  reorderModules: (courseId, order) =>
    api.patch(`/lms/authoring/courses/${courseId}/modules/reorder`, { order }),

  // Returns { key, uploadUrl }. The browser PUTs the file to uploadUrl itself
  // and saves `key` on the lesson. The file never passes through the API.
  // `kind` is 'video', 'document' or 'resource', and decides the folder and the
  // accepted content types.
  uploadUrl: (courseId, filename, mimeType, kind = 'video') =>
    api.post(`/lms/authoring/courses/${courseId}/upload-url`, { filename, mimeType, kind }),

  // The cover image, which goes through the API rather than straight to S3:
  // it's small, and the URL the website renders has to be one the server
  // derived from the key it stored. Both return the updated course.
  uploadImage: (courseId, file) =>
    api.upload(`/lms/authoring/courses/${courseId}/image`, file),
  removeImage: (courseId) => api.del(`/lms/authoring/courses/${courseId}/image`),

  addLesson: (courseId, moduleId, body) =>
    api.post(`/lms/authoring/courses/${courseId}/modules/${moduleId}/lessons`, body),
  updateLesson: (courseId, lessonId, body) =>
    api.patch(`/lms/authoring/courses/${courseId}/lessons/${lessonId}`, body),
  removeLesson: (courseId, lessonId) =>
    api.del(`/lms/authoring/courses/${courseId}/lessons/${lessonId}`),
  reorderLessons: (courseId, order) =>
    api.patch(`/lms/authoring/courses/${courseId}/lessons/reorder`, { order }),
};

// ---- CMS · Review -----------------------------------------------------------
// Read is staff; the decisions are super-admin only.
export const reviewApi = {
  courses: (params) => api.get('/lms/review/courses', params),
  queue: () => api.get('/lms/review/queue'),
  detail: (courseId) => api.get(`/lms/review/${courseId}`),
  approve: (courseId, note) => api.post(`/lms/review/${courseId}/approve`, { note }),
  // Sent back to be fixed, versus refused outright. Both require a reason.
  reject: (courseId, note) => api.post(`/lms/review/${courseId}/reject`, { note }),
  decline: (courseId, note) => api.post(`/lms/review/${courseId}/decline`, { note }),
  unpublish: (courseId) => api.post(`/lms/review/${courseId}/unpublish`),
  setFeatured: (courseId, featured) =>
    api.patch(`/lms/review/${courseId}/featured`, { featured }),

  // Learning paths go through the same queue, so the admin screen speaks to
  // one API shaped the same way for both kinds of submission.
  programs: (params) => api.get('/lms/review/programs', params),
  programDetail: (programId) => api.get(`/lms/review/programs/${programId}`),
  approveProgram: (programId, note) =>
    api.post(`/lms/review/programs/${programId}/approve`, { note }),
  rejectProgram: (programId, note) =>
    api.post(`/lms/review/programs/${programId}/reject`, { note }),
  declineProgram: (programId, note) =>
    api.post(`/lms/review/programs/${programId}/decline`, { note }),
  unpublishProgram: (programId) => api.post(`/lms/review/programs/${programId}/unpublish`),
};

// ---- L4 · Learning paths, learner-facing -------------------------------------
// Public like the course catalogue: anyone may browse them, and a signed-in
// learner additionally gets every step resolved against what they have already
// finished. That resolution is the SERVER's, not the client's.
export const pathsApi = {
  list: () => api.get('/lms/programs'),
  get: (slug) => api.get(`/lms/programs/${slug}`),
};

// ---- L1 · Catalogue and outline ---------------------------------------------
// The catalogue itself is the site's existing published-courses endpoint,
// there was never a reason for the LMS to have a second one.
export const catalogApi = {
  list: (params) => api.get('/courses', params, { auth: false }),
  // Outline is optional-auth: anyone sees the structure, a signed-in learner
  // additionally gets their progress and each lesson's gate resolved.
  outline: (slug) => api.get(`/lms/courses/${slug}/outline`),
  lesson: (slug, lessonId) => api.get(`/lms/courses/${slug}/lessons/${lessonId}`),
};

// ---- L2 · Secure video ------------------------------------------------------
export const videoApi = {
  // { url, expiresAt }. Short-lived and reissued before it lapses.
  signedUrl: (lessonId) => api.get(`/lms/lessons/${lessonId}/video-url`),
  // Encrypted HLS (LMS 3.0). Returns { url, expiresAt } like signedUrl above,
  // except the url is a PLAYLIST carrying a short-lived playback token — the
  // player fetches its own keys from it, and each key request re-checks the
  // enrolment server-side.
  hlsUrl: (lessonId) => api.get(`/lms/lessons/${lessonId}/hls`),
  transcript: (lessonId) => api.get(`/lms/lessons/${lessonId}/transcript`),
  // An uploaded document, on the same short-lived terms as video. A document
  // lesson holding an external link never calls this.
  documentUrl: (lessonId) => api.get(`/lms/lessons/${lessonId}/document-url`),
  // A lesson handout, gated the same way. Resources that are external links
  // never call this; their URL was public before we stored it.
  resourceUrl: (lessonId, resourceId) =>
    api.get(`/lms/lessons/${lessonId}/resources/${resourceId}/url`),
};

// ---- L3 · Progress and assessment -------------------------------------------
// The learner's own clock, sent with anything that lands on a calendar day.
// The server records activity against the LEARNER's day, not its own — a lesson
// finished at 9pm in Sydney is already tomorrow in UTC, and the streak would
// land on a day they were asleep for. See localDay() in study.controller.js.
const tzOffset = () => new Date().getTimezoneOffset();

export const progressApi = {
  mine: () => api.get('/lms/progress'),
  completeLesson: (lessonId) =>
    api.post(`/lms/progress/lessons/${lessonId}/complete`, { tzOffset: tzOffset() }),
  setPosition: (lessonId, seconds) =>
    api.patch(`/lms/progress/lessons/${lessonId}/position`, { seconds }),
};

// Day-by-day study history, zero-filled and ending on the learner's today, for
// the dashboard's week strip and the My Progress chart. Both used to run on a
// hardcoded fortnight that was the same for everyone.
export const activityApi = {
  mine: (days = 7) => api.get('/lms/activity', { days, tzOffset: tzOffset() }),
};

// Notes and bookmarks. Both were localStorage until now, so they stayed on one
// browser and did not survive clearing it.
export const notesApi = {
  list: () => api.get('/lms/notes'),
  create: (body) => api.post('/lms/notes', body),
  update: (id, body) => api.patch(`/lms/notes/${id}`, body),
  remove: (id) => api.del(`/lms/notes/${id}`),
};

export const bookmarksApi = {
  list: () => api.get('/lms/bookmarks'),
  create: (body) => api.post('/lms/bookmarks', body),
  remove: (id) => api.del(`/lms/bookmarks/${id}`),
};

export const quizzesApi = {
  // Returned WITHOUT the answer key. See Lesson.forLearner() on the server.
  get: (lessonId) => api.get(`/lms/quizzes/${lessonId}`),
  // Only answers are sent. The server marks and returns the score; a score in
  // this body would be ignored.
  submit: (lessonId, answers, durationSeconds) =>
    api.post(`/lms/quizzes/${lessonId}/submit`, {
      answers,
      durationSeconds,
      tzOffset: tzOffset(),
    }),
  attempts: (lessonId) => api.get(`/lms/quizzes/${lessonId}/attempts`),
  // Every quiz sat across every course, one row each, holding the best result
  // and how many goes it took. What the progress page summarises.
  allAttempts: () => api.get('/lms/quizzes/attempts'),
  // One marked attempt with its per-question review. The submit response
  // already carries this; this is for the second visit — a refresh, a
  // bookmark, or "Review" from the attempt history.
  attempt: (attemptId) => api.get(`/lms/quizzes/attempts/${attemptId}`),
};

// ---- L4/L6 · Enrolment and certificates --------------------------------------
export const enrollmentsApi = {
  mine: () => api.get('/lms/enrollments'),
  enrol: (courseId) => api.post('/lms/enrollments', { courseId }),
};

// ---- L5 · Course discussion --------------------------------------------------
// One dataset shared with the teaching side: a question asked here is the
// question the course's instructor sees in their Questions inbox. Every write
// answers with the whole updated thread, so nothing is patched together in the
// browser from a partial response.
export const discussionsApi = {
  // Across every course the learner is enrolled in, or one with `course` (slug).
  list: (params) => api.get('/lms/discussions', params),
  get: (id) => api.get(`/lms/discussions/${id}`),
  ask: (body) => api.post('/lms/discussions', body),
  reply: (id, body) => api.post(`/lms/discussions/${id}/replies`, { body }),
  // A toggle: voting again withdraws it. `replyId` omitted votes the question.
  vote: (id, replyId) =>
    api.post(replyId
      ? `/lms/discussions/${id}/replies/${replyId}/vote`
      : `/lms/discussions/${id}/vote`),
  accept: (id, replyId) => api.post(`/lms/discussions/${id}/replies/${replyId}/accept`),
  // The teaching side's inbox: every question on the courses they wrote.
  inbox: () => api.get('/lms/authoring/discussions'),
};

// ---- LMS 18.0 · Course Coach -------------------------------------------------
// AI study help, scoped to one course the learner is enrolled in. Every request
// names a course because the server answers from that course's lessons and
// nothing else — there is no general-purpose ask. That is what keeps it clear of
// the Procurement Advisor at /advisory, which is not AI.
export const coachApi = {
  status: () => api.get('/lms/coach/status'),
  // `history` is the recent conversation; the server trims it and never trusts
  // its length.
  ask: (body) => api.post('/lms/coach/ask', body),
};

// ---- R2 · Notifications ------------------------------------------------------
// The bell. Server-emitted rows only — discussion replies and new questions on
// a course you teach. Read state is per ACCOUNT, so dismissing on a laptop
// settles it on a phone; the two derived kinds the bell also shows (study
// reminders, review decisions) have no server event behind them and keep their
// read state in the browser. See fe/src/lms/hooks/useNotifications.js.
export const notificationsApi = {
  list: () => api.get('/lms/notifications'),
  // Ids, or everything. One endpoint because it is one intent, and because
  // "mark all read" as a loop over ids is a burst of writes that can half-fail.
  markRead: (ids) => api.post('/lms/notifications/read', { ids }),
  markAllRead: () => api.post('/lms/notifications/read', { all: true }),
};

// ---- L5 · Course reviews -----------------------------------------------------
// One dataset shared with the teaching side: a rating a learner leaves here is
// the rating their instructor sees. Enrolment and progress are checked on the
// server, so `save` can be refused with a message worth showing.
export const reviewsApi = {
  // The learner's own reviews, plus the courses they're far enough through to
  // review next. One request because it is one screen.
  mine: () => api.get('/lms/reviews/mine'),
  // Create or replace this learner's review of a course. There is only ever one
  // per person per course, so this is the whole operation.
  save: (body) => api.post('/lms/reviews', body),
  remove: (id) => api.del(`/lms/reviews/${id}`),
  // Everyone's reviews of one course. Public, so it works signed out — but the
  // token still goes if there is one, which is what marks the reader's own
  // review as theirs.
  forCourse: (slug) => api.get(`/lms/courses/${slug}/reviews`),
  // The teaching side: every review on the courses they wrote.
  instructor: () => api.get('/lms/authoring/reviews'),
};

export const certificatesApi = {
  mine: () => api.get('/lms/certificates'),
  get: (id) => api.get(`/lms/certificates/${id}`),
  // Public. No auth, so an employer can check a credential.
  verify: (credentialId) =>
    api.get(`/lms/certificates/verify/${credentialId}`, undefined, { auth: false }),
};
