import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { Course, UNSUBMITTED_INSTRUCTOR_DRAFT } from '../../models/Course.js';
import { Module } from '../../models/Module.js';
import { Lesson } from '../../models/Lesson.js';
import { Enrollment } from '../../models/Enrollment.js';
import { Progress } from '../../models/Progress.js';
import { Certificate } from '../../models/Certificate.js';
import { Review } from '../../models/Review.js';
import { presignPut, uploadBuffer, deleteObject } from '../../config/s3.js';
import { parseYouTubeId } from '../../utils/youtube.js';
import { toSlug, uniqueSlug } from '../../utils/slugify.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';
import { sanitizeRichTextFields } from '../../utils/richText.js';

// Slugs that would collide with a route segment the app already owns,
// /courses/new is the create page, so a course titled "New" became unreachable.
// The reservation belongs here as well as on the client, because the SERVER is
// what actually assigns the slug.
const RESERVED_SLUGS = new Set(['new', 'create', 'edit', 'index', 'admin', 'api']);

// Reserve first, then hand off to the shared uniqueness helper rather than
// reimplementing its -2/-3 loop.
async function makeCourseSlug(title) {
  const base = toSlug(title) || 'untitled-course';
  const safe = RESERVED_SLUGS.has(base) ? `${base}-course` : base;
  return uniqueSlug(Course, safe);
}

// Fields an instructor may write. Everything not listed is either derived
// (durationLabel), computed elsewhere, or a decision that isn't theirs:
//   status        publishing is an admin action
//   reviewStatus  moved by submit/approve, never set directly
//   featured      the CMS decides what the website promotes
//   author        set once, at creation
const AUTHOR_FIELDS = [
  'title', 'summary', 'body', 'sidebarSummary',
  'level', 'segment', 'resourceType', 'price', 'currency',
  'learnPoints', 'requirements', 'whoShouldTake', 'includes', 'access',
  'availability', 'startDate', 'category',
  // The certificate wording is the instructor's to set. `status`, `featured`
  // and `reviewStatus` are still absent from this list, and must stay so.
  'certificate',
];

// `image` is deliberately NOT in the list above and is not settable from a
// PATCH at all: the cover comes in through the upload endpoint, which puts the
// file in our bucket and derives the URL from the key it got back. Taking a URL
// from the client would let a course card point anywhere.
//
// The byline is different again. An instructor may set their own role and
// avatar, but not the NAME the site prints against the course. That is copied
// from the account at creation, and the builder shows it as a read-only field.
const BYLINE_FIELDS = ['role', 'avatarUrl'];

function pickAuthorFields(body, course) {
  const out = {};
  AUTHOR_FIELDS.forEach((f) => {
    if (body[f] !== undefined) out[f] = body[f];
  });

  // `body` is rich text and reaches the public course page as raw HTML. An
  // instructor account is open self-registration, so this is the boundary
  // between "somebody who signed up" and "script running in every visitor's
  // session". Cleaned here, on the only path an author can write it.
  sanitizeRichTextFields(out);

  if (body.instructor && typeof body.instructor === 'object') {
    const current = course?.instructor?.toObject?.() ?? course?.instructor ?? {};
    const byline = { ...current };
    BYLINE_FIELDS.forEach((f) => {
      if (body.instructor[f] !== undefined) byline[f] = body.instructor[f];
    });
    out.instructor = byline;
  }

  return out;
}

// Total teaching minutes, and the label the website shows. Derived rather than
// typed, so the card can't claim six hours for a course holding forty minutes.
async function recalcDuration(courseId) {
  const lessons = await Lesson.find({ course: courseId }).select('minutes');
  const minutes = lessons.reduce((s, l) => s + (l.minutes || 0), 0);

  let label = '';
  if (minutes >= 60) {
    const rounded = Math.round((minutes / 60) * 2) / 2;
    label = `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${rounded === 1 ? 'hour' : 'hours'}`;
  } else if (minutes > 0) {
    label = `${minutes} minutes`;
  }

  await Course.findByIdAndUpdate(courseId, { durationLabel: label });
  return { minutes, label };
}

/* ---- Instructor: courses -------------------------------------------------- */

// GET /lms/authoring/courses. The signed-in instructor's own courses.
// Scoped server-side; a client-side filter is not access control.
export const myCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ author: req.user._id }).sort({ updatedAt: -1 }).lean();

  const withCounts = await Promise.all(
    courses.map(async (c) => {
      const [moduleCount, lessons, learners] = await Promise.all([
        Module.countDocuments({ course: c._id }),
        Lesson.find({ course: c._id }).select('kind transcript video minutes').lean(),
        Enrollment.countDocuments({ course: c._id, revokedAt: null }),
      ]);
      const videos = lessons.filter((l) => l.kind === 'video');
      return {
        ...c,
        moduleCount,
        lessonCount: lessons.length,
        videoCount: videos.length,
        quizCount: lessons.filter((l) => l.kind === 'quiz').length,
        transcriptCount: videos.filter((l) => l.transcript?.length).length,
        minutes: lessons.reduce((s, l) => s + (l.minutes || 0), 0),
        learners,
      };
    }),
  );

  return ok(res, withCounts);
});

// GET /lms/authoring/courses/:courseId. Full editable document.
export const getCourse = asyncHandler(async (req, res) => {
  const modules = await Module.find({ course: req.course._id }).sort({ order: 1 }).lean();
  const lessons = await Lesson.find({ course: req.course._id }).sort({ order: 1 }).lean();

  return ok(res, {
    course: req.course,
    modules: modules.map((m) => ({
      ...m,
      lessons: lessons.filter((l) => String(l.module) === String(m._id)),
    })),
  });
});

// POST /lms/authoring/courses
export const createCourse = asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) throw ApiError.badRequest('A course title is required');

  const course = await Course.create({
    ...pickAuthorFields(req.body),
    title: title.trim(),
    slug: await makeCourseSlug(title),
    author: req.user._id,
    // The byline the website prints. The existing embedded object on Course,
    // seeded from the account so a new course isn't attributed to nobody.
    instructor: { name: req.user.name, role: '', avatarUrl: '' },
    status: CONTENT_STATUS.DRAFT,
    reviewStatus: 'none',
  });

  recordAudit({
    req,
    action: 'lms.course.create',
    entity: 'Course',
    entityId: course._id,
    summary: `Instructor created course ${course.title}`,
  });

  return created(res, course);
});

// PATCH /lms/authoring/courses/:courseId
export const updateCourse = asyncHandler(async (req, res) => {
  Object.assign(req.course, pickAuthorFields(req.body, req.course));

  // Editing a course that was sent back moves it out of 'rejected'. Otherwise
  // the banner sticks around after the author has done the work.
  //
  // 'declined' is deliberately NOT cleared here. A decline is a decision about
  // the course, not a list of corrections, so typing in a field is not what
  // answers it — resubmitting is, and that is what moves it to 'pending'.
  if (req.course.reviewStatus === 'rejected') req.course.reviewStatus = 'none';

  await req.course.save();
  return ok(res, req.course);
});

// DELETE /lms/authoring/courses/:courseId
export const deleteCourse = asyncHandler(async (req, res) => {
  const enrolled = await Enrollment.countDocuments({ course: req.course._id, revokedAt: null });
  if (enrolled > 0) {
    // Deleting content people paid for is not the author's call. It has to go
    // through an admin, who can also decide about refunds.
    throw ApiError.forbidden(
      `${enrolled} learners are enrolled. Ask an administrator to retire this course instead.`,
    );
  }

  await Promise.all([
    Lesson.deleteMany({ course: req.course._id }),
    Module.deleteMany({ course: req.course._id }),
    req.course.deleteOne(),
  ]);

  recordAudit({
    req,
    action: 'lms.course.delete',
    entity: 'Course',
    entityId: req.course._id,
    summary: `Instructor deleted course ${req.course.title}`,
  });

  return ok(res, { deleted: true });
});

// POST /lms/authoring/courses/:courseId/submit
export const submitForReview = asyncHandler(async (req, res) => {
  const lessonCount = await Lesson.countDocuments({ course: req.course._id });
  if (!lessonCount) throw ApiError.badRequest('Add at least one lesson before submitting');

  req.course.reviewStatus = 'pending';
  req.course.submittedAt = new Date();
  req.course.reviewNote = '';
  await req.course.save();

  recordAudit({
    req,
    action: 'lms.course.submit',
    entity: 'Course',
    entityId: req.course._id,
    summary: `Submitted "${req.course.title}" for review`,
  });

  return ok(res, req.course);
});

// POST /lms/authoring/courses/:courseId/withdraw
export const withdrawSubmission = asyncHandler(async (req, res) => {
  if (req.course.reviewStatus !== 'pending') {
    throw ApiError.badRequest('This course is not awaiting review');
  }
  req.course.reviewStatus = 'none';
  req.course.submittedAt = null;
  await req.course.save();
  return ok(res, req.course);
});

/* ---- Instructor: enrolments ------------------------------------------------
   Who is actually learning from these courses. Two endpoints rather than one
   fat payload: the page opens on a card per course, and only fetches a roster
   once a course is chosen. A course with 800 learners shouldn't be loaded to
   show that it has 800 learners.                                            */

// A learner's place in one course, from the same Progress record the learner's
// own screens read. Derived here rather than stored, so it cannot disagree with
// what the learner is being shown.
function placeIn({ progress, lessonCount }) {
  const done = progress?.completedLessons?.length ?? 0;
  return {
    lessonsDone: done,
    lessonsTotal: lessonCount,
    percent: lessonCount ? Math.round((done / lessonCount) * 100) : 0,
    minutesLearned: progress?.minutesLearned ?? 0,
    lastAccessedAt: progress?.lastLessonAt ?? null,
  };
}

// GET /lms/authoring/enrollments. A card per course: how many are enrolled, how
// many have finished, and how far the rest have got.
export const enrolmentSummary = asyncHandler(async (req, res) => {
  const courses = await Course.find({ author: req.user._id }).sort({ updatedAt: -1 }).lean();

  const rows = await Promise.all(
    courses.map(async (c) => {
      const [enrolments, lessonCount, progresses] = await Promise.all([
        Enrollment.find({ course: c._id }).select('completedAt revokedAt enrolledAt').lean(),
        Lesson.countDocuments({ course: c._id }),
        Progress.find({ course: c._id }).select('completedLessons').lean(),
      ]);

      // Revoked enrolments are counted apart rather than dropped. A refund is
      // something the author should be able to see, not something that quietly
      // reduces the number.
      const active = enrolments.filter((e) => !e.revokedAt);
      const completed = active.filter((e) => e.completedAt).length;
      const percents = progresses.map(
        (p) => (lessonCount ? Math.round(((p.completedLessons?.length ?? 0) / lessonCount) * 100) : 0),
      );

      return {
        course: {
          _id: c._id,
          title: c.title,
          slug: c.slug,
          image: c.image,
          status: c.status,
          reviewStatus: c.reviewStatus,
          price: c.price,
          currency: c.currency,
          level: c.level,
        },
        lessonCount,
        learners: active.length,
        revoked: enrolments.length - active.length,
        completed,
        // Average across everyone who has an enrolment, counting someone who
        // has not started as the 0% they are. Averaging only the people with a
        // Progress record would flatter every course.
        averagePercent: active.length
          ? Math.round(percents.reduce((s, p) => s + p, 0) / active.length)
          : 0,
        lastEnrolledAt: active.length
          ? active.reduce((a, e) => (e.enrolledAt > a ? e.enrolledAt : a), active[0].enrolledAt)
          : null,
      };
    }),
  );

  return ok(res, rows);
});

// GET /lms/authoring/profile. The rollup behind an instructor's own profile
// page: what they have published, how many people it reached, and what those
// people thought of it.
//
// A purpose-built endpoint rather than three page-sized ones. The profile needs
// four numbers; asking for the course list, the enrolment summary and every
// review in order to reduce them client-side would ship far more than it uses,
// and would make the profile disagree with those pages the moment one of the
// three reductions drifted.
//
// `learners` counts PEOPLE, not enrolments. Someone taking two of this
// instructor's courses is one learner, which is what "learners taught" means to
// the person reading it. The enrolments page deliberately counts the other way
// and labels itself accordingly; both numbers are here so neither has to
// pretend to be the other.
export const instructorProfileSummary = asyncHandler(async (req, res) => {
  const courses = await Course.find({ author: req.user._id })
    .select('_id status reviewStatus')
    .lean();
  const ids = courses.map((c) => c._id);

  if (!ids.length) {
    return ok(res, {
      courses: { total: 0, published: 0, inReview: 0, draft: 0 },
      learners: 0,
      enrolments: 0,
      completions: 0,
      rating: { average: null, count: 0 },
    });
  }

  const [learnerIds, enrolments, completions, reviews] = await Promise.all([
    Enrollment.distinct('user', { course: { $in: ids }, revokedAt: null }),
    Enrollment.countDocuments({ course: { $in: ids }, revokedAt: null }),
    Enrollment.countDocuments({ course: { $in: ids }, revokedAt: null, completedAt: { $ne: null } }),
    Review.find({ course: { $in: ids } }).select('rating').lean(),
  ]);

  const count = reviews.length;

  return ok(res, {
    courses: {
      total: courses.length,
      published: courses.filter((c) => c.status === CONTENT_STATUS.PUBLISHED).length,
      inReview: courses.filter((c) => c.reviewStatus === 'pending').length,
      draft: courses.filter((c) => c.status !== CONTENT_STATUS.PUBLISHED && c.reviewStatus !== 'pending').length,
    },
    learners: learnerIds.length,
    enrolments,
    completions,
    rating: {
      // One decimal, matching how the reviews page rounds. `null` rather than 0
      // when nobody has rated: no rating and a rating of nothing are different
      // things, and a profile reading "0.0" would libel a course nobody has
      // got round to reviewing yet.
      average: count ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10 : null,
      count,
    },
  });
});

// GET /lms/authoring/courses/:courseId/enrollments. The roster for one course.
// Ownership-checked by the route, so an instructor only ever sees their own
// learners.
export const courseEnrolments = asyncHandler(async (req, res) => {
  const [enrolments, lessonCount] = await Promise.all([
    Enrollment.find({ course: req.course._id })
      .populate('user', 'name email')
      .sort({ enrolledAt: -1 })
      .lean(),
    Lesson.countDocuments({ course: req.course._id }),
  ]);

  const userIds = enrolments.map((e) => e.user?._id).filter(Boolean);
  const [progresses, certificates] = await Promise.all([
    Progress.find({ course: req.course._id, user: { $in: userIds } })
      .select('user completedLessons minutesLearned lastLessonAt')
      .lean(),
    Certificate.find({ course: req.course._id, user: { $in: userIds }, revokedAt: null })
      .select('user credentialId issuedAt')
      .lean(),
  ]);
  const progressBy = new Map(progresses.map((p) => [String(p.user), p]));
  const certBy = new Map(certificates.map((c) => [String(c.user), c]));

  const students = enrolments
    // A deleted account leaves the enrolment behind. There is no one to name.
    .filter((e) => e.user)
    .map((e) => {
      const cert = certBy.get(String(e.user._id));
      return {
        _id: e._id,
        user: { _id: e.user._id, name: e.user.name, email: e.user.email },
        enrolledAt: e.enrolledAt,
        source: e.source,
        completedAt: e.completedAt ?? null,
        revokedAt: e.revokedAt ?? null,
        ...placeIn({ progress: progressBy.get(String(e.user._id)), lessonCount }),
        certificate: cert
          ? { _id: cert._id, credentialId: cert.credentialId, issuedAt: cert.issuedAt }
          : null,
      };
    });

  return ok(res, {
    course: {
      _id: req.course._id,
      title: req.course.title,
      slug: req.course.slug,
      status: req.course.status,
    },
    lessonCount,
    students,
  });
});

/* ---- Modules -------------------------------------------------------------- */

export const createModule = asyncHandler(async (req, res) => {
  const count = await Module.countDocuments({ course: req.course._id });
  const mod = await Module.create({
    course: req.course._id,
    title: req.body.title?.trim() || 'New module',
    order: count,
  });
  return created(res, mod);
});

/* A module's drip schedule (L4): an absolute date, or a number of days after
   THAT learner enrolled — never both.

   gateFor() in learning.controller.js applies every schedule it finds on a
   module, so one carrying the pair stays shut until BOTH have passed. That is
   not a rule anybody writes on purpose, and it is invisible from either field
   on its own, so setting one here clears the other rather than trusting the
   client to have done it.

   The fields also have to be CLEARABLE. `releaseAt: ''` is what an emptied date
   input sends, and assigning that straight onto the document throws a cast
   error rather than removing the schedule. A blank on either field means "no
   drip", which clears both. */
function applyDripSchedule(mod, body) {
  const sent = (f) => Object.prototype.hasOwnProperty.call(body, f);
  const blank = (v) => v === null || v === undefined || v === '';

  if (!sent('releaseAt') && !sent('releaseAfterDays')) return;

  if (sent('releaseAt') && !blank(body.releaseAt)) {
    const at = new Date(body.releaseAt);
    if (Number.isNaN(at.getTime())) throw ApiError.badRequest('That release date is not a date');
    mod.releaseAt = at;
    mod.releaseAfterDays = null;
    return;
  }

  if (sent('releaseAfterDays') && !blank(body.releaseAfterDays)) {
    const days = Number(body.releaseAfterDays);
    if (!Number.isInteger(days) || days < 0) {
      throw ApiError.badRequest('Days after enrolment must be a whole number of days');
    }
    mod.releaseAfterDays = days;
    mod.releaseAt = null;
    return;
  }

  mod.releaseAt = null;
  mod.releaseAfterDays = null;
}

export const updateModule = asyncHandler(async (req, res) => {
  const mod = await Module.findOne({ _id: req.params.moduleId, course: req.course._id });
  if (!mod) throw ApiError.notFound('Module not found');

  ['title', 'summary', 'order'].forEach((f) => {
    if (req.body[f] !== undefined) mod[f] = req.body[f];
  });
  applyDripSchedule(mod, req.body);

  await mod.save();
  return ok(res, mod);
});

export const deleteModule = asyncHandler(async (req, res) => {
  const mod = await Module.findOne({ _id: req.params.moduleId, course: req.course._id });
  if (!mod) throw ApiError.notFound('Module not found');

  // Lessons belong to the module; leaving them behind would orphan them.
  await Lesson.deleteMany({ module: mod._id });
  await mod.deleteOne();
  await recalcDuration(req.course._id);
  return ok(res, { deleted: true });
});

// PATCH /…/modules/reorder. The whole ordered list at once, so a drag or a
// nudge is one request and can't leave the list half-renumbered.
export const reorderModules = asyncHandler(async (req, res) => {
  const { order } = req.body; // array of module ids
  if (!Array.isArray(order)) throw ApiError.badRequest('order must be an array of module ids');

  await Promise.all(
    order.map((id, i) =>
      Module.updateOne({ _id: id, course: req.course._id }, { order: i }),
    ),
  );
  return ok(res, { reordered: order.length });
});

/* ---- Lessons -------------------------------------------------------------- */

const LESSON_FIELDS = [
  'title', 'kind', 'minutes', 'preview', 'body', 'video', 'transcript', 'quiz', 'resources', 'order',
  'youtube', 'document',
];

// A YouTube lesson stores the id, not whatever URL was pasted. Parsing on write
// means one shape reaches the player, and a link that isn't YouTube is refused
// here rather than rendering as an empty iframe later.
function normaliseYouTube(patch) {
  if (!patch.youtube) return patch;

  const raw = patch.youtube.url ?? patch.youtube.videoId ?? '';
  const videoId = parseYouTubeId(raw);
  if (raw && !videoId) {
    throw ApiError.badRequest("That doesn't look like a YouTube link", {
      youtube: 'unrecognised',
    });
  }

  return {
    ...patch,
    youtube: {
      videoId,
      startSeconds: Math.max(0, Number(patch.youtube.startSeconds) || 0),
      note: patch.youtube.note ?? '',
    },
  };
}

// A document lesson is either an upload or a link, never both. Accepting both
// leaves the learner page to decide which wins, and it would pick differently
// from the builder's preview sooner or later.
function normaliseDocument(patch) {
  if (!patch.document) return patch;
  const doc = { ...patch.document };

  if (doc.url && doc.key) {
    throw ApiError.badRequest('A document lesson takes either an uploaded file or a link, not both', {
      document: 'ambiguous',
    });
  }
  if (doc.url && !/^https?:\/\//i.test(doc.url)) {
    throw ApiError.badRequest('A document link must start with http:// or https://', {
      document: 'invalid-url',
    });
  }
  return { ...patch, document: doc };
}

export const createLesson = asyncHandler(async (req, res) => {
  const mod = await Module.findOne({ _id: req.params.moduleId, course: req.course._id });
  if (!mod) throw ApiError.notFound('Module not found');

  const count = await Lesson.countDocuments({ module: mod._id });
  const lesson = await Lesson.create({
    course: req.course._id,
    module: mod._id,
    title: req.body.title?.trim() || 'New lesson',
    kind: req.body.kind ?? 'text',
    order: count,
    minutes: req.body.minutes ?? 10,
  });

  await recalcDuration(req.course._id);
  return created(res, lesson);
});

export const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findOne({ _id: req.params.lessonId, course: req.course._id });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const patch = normaliseDocument(normaliseYouTube(req.body));
  LESSON_FIELDS.forEach((f) => {
    if (patch[f] !== undefined) lesson[f] = patch[f];
  });
  await lesson.save();

  if (req.body.minutes !== undefined) await recalcDuration(req.course._id);
  return ok(res, lesson);
});

export const deleteLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findOne({ _id: req.params.lessonId, course: req.course._id });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  await lesson.deleteOne();
  await recalcDuration(req.course._id);
  return ok(res, { deleted: true });
});

// Course video is measured in hundreds of megabytes. Streaming it through
// Express would tie up a worker for the length of the upload, so the browser
// sends it straight to S3 and the API only issues the permission to do so.
//
// The response deliberately carries no readable URL. Only the KEY is stored on
// the lesson, and playback goes through the expiring signed-GET endpoint. A
// lesson row must never hold a link that works without one.
const UPLOAD_TTL_SECONDS = 900;

// What each upload slot accepts, and where it lands. The content type is pinned
// into the signature, so S3 rejects an upload arriving as anything else.
// Checking here turns that into a clear message rather than a failed PUT the
// browser is left to interpret.
const UPLOAD_KINDS = {
  video: {
    folder: 'lms/video',
    mime: /^video\/(mp4|quicktime|webm|x-m4v)$/,
    label: 'MP4, MOV, WebM or M4V video',
  },
  document: {
    folder: 'lms/doc',
    mime: /^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|presentationml\.presentation))$/,
    label: 'PDF, Word or PowerPoint files',
  },
  // A lesson handout. Wider than `document` on purpose: a document LESSON is
  // the thing being read, so it is worth restricting to formats that render in
  // a browser, while a resource is whatever the instructor wants the learner to
  // walk away with — a spreadsheet template, a checklist, a zip of examples.
  resource: {
    folder: 'lms/resources',
    mime: /^(application\/(pdf|zip|x-zip-compressed|msword|vnd\.ms-excel|vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\.[a-z]+\.[a-z]+)|text\/(plain|csv)|image\/(png|jpe?g|webp|gif))$/,
    label: 'PDF, Office, CSV, text, image or zip files',
  },
};

// What the learner-facing list calls this file. Only used as a label and an
// icon, so an unrecognised type falls back to the generic one rather than
// refusing the upload.
function resourceKindFor(mimeType = '') {
  if (mimeType === 'application/pdf') return 'pdf';
  if (/zip/.test(mimeType)) return 'zip';
  if (/(sheet|excel|csv)/.test(mimeType)) return 'sheet';
  if (/(presentation|powerpoint)/.test(mimeType)) return 'slides';
  if (mimeType.startsWith('image/')) return 'image';
  return 'doc';
}

// POST /lms/authoring/courses/:courseId/upload-url. Ownership-checked by the
// route, so an instructor can only ever get an upload slot on their own course.
export const uploadUrl = asyncHandler(async (req, res) => {
  const { filename, mimeType, kind = 'video' } = req.body ?? {};
  if (!filename) throw ApiError.badRequest('A filename is required');

  const spec = UPLOAD_KINDS[kind];
  if (!spec) throw ApiError.badRequest(`Unknown upload kind: ${kind}`);
  if (!spec.mime.test(mimeType ?? '')) {
    throw ApiError.badRequest(`Only ${spec.label} can be uploaded here`);
  }

  const presigned = await presignPut({
    folder: `${spec.folder}/${req.course._id}`,
    originalName: filename,
    mimeType,
    expiresIn: UPLOAD_TTL_SECONDS,
  });

  return ok(res, {
    key: presigned.key,
    uploadUrl: presigned.uploadUrl,
    expiresIn: UPLOAD_TTL_SECONDS,
    // Decided here rather than sniffed from the filename in the browser, so the
    // icon a learner sees comes from the content type S3 was actually given.
    kind: resourceKindFor(mimeType),
  });
});

// POST /lms/authoring/courses/:courseId/image. The course cover.
//
// Multipart rather than the presigned route above, because this is the one
// upload that is small enough not to need it, and because the SERVER has to be
// what decides the URL. The client sends a file; it never sends a link.
export const courseImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('An image file is required');

  const oldKey = req.course.image?.key;
  const { key, url } = await uploadBuffer({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder: 'courses',
    originalName: req.file.originalname,
  });

  req.course.image = { key, url };
  await req.course.save();

  // Best effort: a failed cleanup leaves an orphan in the bucket, which is
  // cheaper than failing the request the author is waiting on.
  if (oldKey && oldKey !== key) {
    try {
      await deleteObject(oldKey);
    } catch {
      /* ignore */
    }
  }

  return ok(res, req.course);
});

// DELETE /lms/authoring/courses/:courseId/image.
export const removeCourseImage = asyncHandler(async (req, res) => {
  const oldKey = req.course.image?.key;
  req.course.image = { key: '', url: '' };
  await req.course.save();

  if (oldKey) {
    try {
      await deleteObject(oldKey);
    } catch {
      /* ignore */
    }
  }

  return ok(res, req.course);
});

// The original video-only route, kept so an older client keeps working.
export const videoUploadUrl = asyncHandler(async (req, res) => {
  req.body = { ...req.body, kind: 'video' };
  return uploadUrl(req, res);
});

export const reorderLessons = asyncHandler(async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) throw ApiError.badRequest('order must be an array of lesson ids');

  await Promise.all(
    order.map((id, i) => Lesson.updateOne({ _id: id, course: req.course._id }, { order: i })),
  );
  return ok(res, { reordered: order.length });
});

/* ---- Admin review (CMS) ---------------------------------------------------- */

// GET /lms/review/courses. Every course the CMS has business seeing, for the
// admin list. Unlike /courses (the public, published-only endpoint) this shows
// drafts and submissions too, because the whole point of the screen is to see
// what is waiting and what is live.
//
// The one thing it does NOT show is a course an instructor is still writing and
// has never submitted. Until they press "Submit for review" it is theirs, and
// an admin reading an unfinished draft over their shoulder is not the workflow
// the review states describe.
export const allCourses = asyncHandler(async (req, res) => {
  const { review, status, q } = req.query;
  const filter = { $nor: [UNSUBMITTED_INSTRUCTOR_DRAFT] };
  if (review) filter.reviewStatus = review;
  if (status) filter.status = status;
  if (q) filter.title = { $regex: String(q).trim(), $options: 'i' };

  const courses = await Course.find(filter)
    .populate('author', 'name email')
    .sort({ submittedAt: -1, updatedAt: -1 })
    .lean();

  const rows = await Promise.all(
    courses.map(async (c) => {
      const [lessons, learners] = await Promise.all([
        Lesson.find({ course: c._id }).select('kind minutes').lean(),
        Enrollment.countDocuments({ course: c._id, revokedAt: null }),
      ]);
      return {
        ...c,
        lessonCount: lessons.length,
        minutes: lessons.reduce((s, l) => s + (l.minutes || 0), 0),
        learners,
      };
    }),
  );

  return ok(res, rows);
});

// GET /lms/review/:courseId. The full submission, curriculum included.
//
// An admin approving a course has to be able to see what they are approving.
// The CMS's own course editor only knows about the flat record, so without this
// the reviewer would be signing off on a title and a summary.
export const reviewDetail = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId).populate('author', 'name email');
  if (!course) throw ApiError.notFound('Course not found');

  const [modules, lessons] = await Promise.all([
    Module.find({ course: course._id }).sort({ order: 1 }).lean(),
    Lesson.find({ course: course._id }).sort({ order: 1 }).lean(),
  ]);

  return ok(res, {
    course,
    modules: modules.map((m) => ({
      ...m,
      lessons: lessons
        .filter((l) => String(l.module) === String(m._id))
        // The CONTENT, not just a count of it. A reviewer approving a course
        // for publication has to be able to read what they are approving, and
        // a row saying "quiz · 5 questions" tells them nothing about whether
        // the questions are any good.
        //
        // The answer key is included here, unlike everywhere else. This route
        // is staff-only, and a marking scheme a reviewer cannot see is a
        // marking scheme they cannot check.
        .map((l) => ({
          _id: l._id,
          title: l.title,
          kind: l.kind,
          minutes: l.minutes,
          preview: l.preview,

          body: l.body ?? '',
          bodyLength: (l.body ?? '').length,

          hasVideo: Boolean(l.video?.key),
          video: l.video?.key
            ? { name: l.video.name, sizeBytes: l.video.sizeBytes, mimeType: l.video.mimeType }
            : null,
          hasTranscript: Boolean(l.transcript?.length),
          transcript: l.transcript ?? [],

          youtube: l.youtube?.videoId ? l.youtube : null,
          document: (l.document?.key || l.document?.url) ? l.document : null,

          questionCount: l.quiz?.questions?.length ?? 0,
          quiz: l.quiz?.questions?.length
            ? {
                passMark: l.quiz.passMark,
                timeLimitMins: l.quiz.timeLimitMins,
                maxAttempts: l.quiz.maxAttempts,
                questions: l.quiz.questions,
              }
            : null,
        })),
    })),
  });
});

// PATCH /lms/review/:courseId/featured. What the website promotes.
//
// Deliberately an admin-only endpoint and NOT in the instructor's writable
// fields: an author choosing to feature their own course on the homepage is a
// decision that belongs to whoever owns the homepage.
export const setFeatured = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(
    req.params.courseId,
    { featured: Boolean(req.body.featured) },
    { new: true },
  );
  if (!course) throw ApiError.notFound('Course not found');

  recordAudit({
    req,
    action: 'lms.course.featured',
    entity: 'Course',
    entityId: course._id,
    summary: `${course.featured ? 'Featured' : 'Unfeatured'} "${course.title}"`,
  });

  return ok(res, course);
});

// POST /lms/review/:courseId/unpublish. Take a live course off the site
// without deleting it, which is what an admin needs when something has to come
// down but learners keep their access.
export const unpublishCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(
    req.params.courseId,
    { status: CONTENT_STATUS.DRAFT, reviewStatus: 'none', featured: false },
    { new: true },
  );
  if (!course) throw ApiError.notFound('Course not found');

  recordAudit({
    req,
    action: 'lms.course.unpublish',
    entity: 'Course',
    entityId: course._id,
    summary: `Unpublished "${course.title}"`,
  });

  return ok(res, course);
});

// GET /lms/review/queue. Everything waiting on an admin.
export const reviewQueue = asyncHandler(async (req, res) => {
  const courses = await Course.find({ reviewStatus: 'pending' })
    .populate('author', 'name email')
    .sort({ submittedAt: 1 })
    .lean();
  return ok(res, courses);
});

// POST /lms/review/:courseId/approve. The ONLY path to published.
export const approveCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) throw ApiError.notFound('Course not found');

  course.reviewStatus = 'approved';
  course.status = CONTENT_STATUS.PUBLISHED;
  course.publishedAt = course.publishedAt ?? new Date();
  course.reviewedAt = new Date();
  course.reviewedBy = req.user._id;
  course.reviewNote = req.body.note ?? '';
  await course.save();

  recordAudit({
    req,
    action: 'lms.course.approve',
    entity: 'Course',
    entityId: course._id,
    summary: `Approved and published "${course.title}"`,
  });

  return ok(res, course);
});

// POST /lms/review/:courseId/decline. Refused outright, with a reason.
//
// Distinct from reject, which is "fix these things and send it back". This is
// the answer when the course is not going on the site: off-topic, duplicating
// something already published, or not of a standard that notes would fix.
//
// It is not a dead end. The instructor can rework it and submit again — there
// is no mechanism for an admin to un-decline a course, so making it terminal
// would strand anyone who genuinely addressed the reason. What it does is say
// plainly that this was a decision rather than a checklist.
export const declineCourse = asyncHandler(async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) {
    throw ApiError.badRequest('Give a reason. A refusal without one is a dead end for the author');
  }

  const course = await Course.findById(req.params.courseId);
  if (!course) throw ApiError.notFound('Course not found');

  course.reviewStatus = 'declined';
  course.reviewedAt = new Date();
  course.reviewedBy = req.user._id;
  course.reviewNote = note.trim();
  await course.save();

  recordAudit({
    req,
    action: 'lms.course.decline',
    entity: 'Course',
    entityId: course._id,
    summary: `Declined "${course.title}"`,
  });

  return ok(res, course);
});

// POST /lms/review/:courseId/reject. Sent back with a reason.
export const rejectCourse = asyncHandler(async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) {
    // A rejection without a reason is a dead end for the author.
    throw ApiError.badRequest('Give a reason so the instructor knows what to change');
  }

  const course = await Course.findById(req.params.courseId);
  if (!course) throw ApiError.notFound('Course not found');

  course.reviewStatus = 'rejected';
  course.reviewedAt = new Date();
  course.reviewedBy = req.user._id;
  course.reviewNote = note.trim();
  await course.save();

  recordAudit({
    req,
    action: 'lms.course.reject',
    entity: 'Course',
    entityId: course._id,
    summary: `Requested changes on "${course.title}"`,
  });

  return ok(res, course);
});
