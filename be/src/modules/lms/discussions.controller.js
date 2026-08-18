import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/apiResponse.js';
import { Course } from '../../models/Course.js';
import { Lesson } from '../../models/Lesson.js';
import { Enrollment } from '../../models/Enrollment.js';
import { Discussion } from '../../models/Discussion.js';
import { STAFF_ROLES } from '../../constants/roles.js';

/* ---------------------------------------------------------------------------
   Course discussion (L5). One dataset, read from both sides:

     learners     the Discussions screens in the student LMS
     instructors  the Questions screen in the teaching side

   Both go through this controller, so a question a learner asks IS the question
   their instructor sees. There is no second copy anywhere.
   ------------------------------------------------------------------------ */

// Who may read and post in a course's discussion.
//
// Enrolment is the rule, because this is content inside a paid course. The
// author of the course and staff are in as well, for the obvious reason: an
// instructor cannot answer questions on a course they are locked out of.
async function accessTo(course, user) {
  if (!user) return null;
  if (STAFF_ROLES.includes(user.role)) return 'staff';
  if (course.author && String(course.author) === String(user._id)) return 'instructor';

  const enrolment = await Enrollment.findOne({ user: user._id, course: course._id });
  return enrolment?.isActive() ? 'student' : null;
}

// Whether a post's author should carry the "Instructor" badge. It marks an
// OFFICIAL answer, so it is about this course rather than the account's role: an
// instructor answering on somebody else's course is another learner there.
function roleFor(authorId, course, authorRole) {
  if (course.author && String(course.author) === String(authorId)) return 'instructor';
  if (STAFF_ROLES.includes(authorRole)) return 'instructor';
  return 'student';
}

const nameOf = (u) => u?.name ?? 'Former member';

// The shape the discussion screens read. Vote arrays become a count plus
// whether the vote showing is yours, and never the list of who voted — that is
// nobody's business but the server's.
function serialise(thread, { course, user }) {
  const me = String(user?._id ?? '');
  const teaches =
    (course.author && String(course.author) === me) || STAFF_ROLES.includes(user?.role);
  const replies = (thread.replies ?? []).map((r) => ({
    id: String(r._id),
    body: r.body,
    author: nameOf(r.author),
    authorRole: roleFor(r.author?._id ?? r.author, course, r.author?.role),
    createdAt: r.createdAt,
    votes: r.votes?.length ?? 0,
    youVoted: (r.votes ?? []).some((v) => String(v) === me),
    accepted: Boolean(r.accepted),
    mine: String(r.author?._id ?? r.author) === me,
  }));

  return {
    id: String(thread._id),
    slug: course.slug,
    courseTitle: course.title,
    courseId: String(course._id),
    lessonId: thread.lesson ? String(thread.lesson) : null,
    title: thread.title,
    body: thread.body,
    author: nameOf(thread.author),
    authorRole: roleFor(thread.author?._id ?? thread.author, course, thread.author?.role),
    createdAt: thread.createdAt,
    votes: thread.votes?.length ?? 0,
    youVoted: (thread.votes ?? []).some((v) => String(v) === me),
    resolved: Boolean(thread.resolved),
    replies,
    replyCount: replies.length,
    hasInstructorReply: replies.some((r) => r.authorRole === 'instructor'),
    lastActivityAt: thread.lastActivityAt ?? thread.createdAt,
    mine: String(thread.author?._id ?? thread.author) === me,
    // Whether THIS reader may mark an answer. Decided here because the client
    // cannot work it out: it would have to know who owns the course, and the
    // rule is enforced on write regardless. Sent so the button appears for the
    // people it will work for, rather than for everyone and failing.
    canAccept: teaches || String(thread.author?._id ?? thread.author) === me,
  };
}

const withAuthors = (q) =>
  q.populate('author', 'name role').populate('replies.author', 'name role');

// Loads a thread with its course, and checks the reader is allowed in.
async function loadThread(id, user) {
  const thread = await withAuthors(Discussion.findById(id));
  if (!thread) throw ApiError.notFound('Discussion not found');

  const course = await Course.findById(thread.course).select('title slug author');
  if (!course) throw ApiError.notFound('Discussion not found');

  const access = await accessTo(course, user);
  // 404 rather than 403: whether a course has a discussion on it is not
  // something to confirm to somebody who cannot read it.
  if (!access) throw ApiError.notFound('Discussion not found');

  return { thread, course, access };
}

// An accepted reply is what makes a thread resolved. Recomputed rather than set
// alongside, so the flag cannot drift from the replies it describes.
function syncResolved(thread) {
  thread.resolved = (thread.replies ?? []).some((r) => r.accepted);
}

/* ---- Learner ------------------------------------------------------------- */

// GET /lms/discussions. Threads across every course this learner is enrolled
// in, or one course with ?course=<slug>.
//
// Scoped server-side to courses they can actually read. A client-side filter
// would be a list of other people's courses with the rows hidden.
export const listDiscussions = asyncHandler(async (req, res) => {
  const { course: slug, lessonId } = req.query;

  let courses;
  if (slug) {
    const course = await Course.findOne({ slug }).select('title slug author');
    if (!course || !(await accessTo(course, req.user))) throw ApiError.notFound('Course not found');
    courses = [course];
  } else {
    const [enrolments, authored] = await Promise.all([
      Enrollment.find({ user: req.user._id, revokedAt: null }).select('course').lean(),
      Course.find({ author: req.user._id }).select('title slug author'),
    ]);
    const enrolled = await Course.find({
      _id: { $in: enrolments.map((e) => e.course) },
    }).select('title slug author');

    // An instructor's own courses are in the list too, so the same screen works
    // whichever way round they are using the app.
    const byId = new Map([...enrolled, ...authored].map((c) => [String(c._id), c]));
    courses = [...byId.values()];
  }

  if (!courses.length) return ok(res, []);

  const filter = { course: { $in: courses.map((c) => c._id) } };
  if (lessonId) filter.lesson = lessonId;

  const threads = await withAuthors(Discussion.find(filter).sort({ lastActivityAt: -1 }));
  const courseById = new Map(courses.map((c) => [String(c._id), c]));

  return ok(
    res,
    threads.map((t) =>
      serialise(t, { course: courseById.get(String(t.course)), user: req.user }),
    ),
  );
});

// GET /lms/discussions/:id
export const getDiscussion = asyncHandler(async (req, res) => {
  const { thread, course } = await loadThread(req.params.id, req.user);
  return ok(res, serialise(thread, { course, user: req.user }));
});

// POST /lms/discussions
export const askQuestion = asyncHandler(async (req, res) => {
  const { courseId, slug, lessonId, title, body } = req.body ?? {};
  if (!title?.trim() || !body?.trim()) {
    throw ApiError.badRequest('A question needs a title and some detail');
  }

  const course = await Course.findOne(
    courseId ? { _id: courseId } : { slug },
  ).select('title slug author');
  if (!course) throw ApiError.notFound('Course not found');
  if (!(await accessTo(course, req.user))) {
    throw ApiError.forbidden('You need to be enrolled in this course to ask a question');
  }

  // A lesson reference has to belong to the course it claims to. Otherwise the
  // instructor's "asked from lesson 4" is whatever id the client sent.
  let lesson = null;
  if (lessonId) {
    const found = await Lesson.findOne({ _id: lessonId, course: course._id }).select('_id');
    lesson = found?._id ?? null;
  }

  const thread = await Discussion.create({
    course: course._id,
    lesson,
    author: req.user._id,
    title: title.trim(),
    body: body.trim(),
    lastActivityAt: new Date(),
  });

  return created(res, serialise(await withAuthors(Discussion.findById(thread._id)), {
    course,
    user: req.user,
  }));
});

// POST /lms/discussions/:id/replies
export const addReply = asyncHandler(async (req, res) => {
  const { body } = req.body ?? {};
  if (!body?.trim()) throw ApiError.badRequest('A reply needs something in it');

  const { thread, course } = await loadThread(req.params.id, req.user);

  thread.replies.push({ author: req.user._id, body: body.trim() });
  thread.lastActivityAt = new Date();
  await thread.save();

  return created(res, serialise(await withAuthors(Discussion.findById(thread._id)), {
    course,
    user: req.user,
  }));
});

// POST /lms/discussions/:id/vote  (and .../replies/:replyId/vote)
//
// A toggle, not an increment: pressing it again withdraws the vote. The set of
// voter ids is what enforces one each, so this cannot be stacked by replaying
// the request.
export const toggleVote = asyncHandler(async (req, res) => {
  const { thread, course } = await loadThread(req.params.id, req.user);
  const { replyId } = req.params;

  const target = replyId ? thread.replies.id(replyId) : thread;
  if (!target) throw ApiError.notFound('Reply not found');

  // Voting for your own post is not a signal, it is a thumb on the scale.
  //
  // `author` is POPULATED here, so it is a user document rather than an id.
  // Comparing the document itself never matches, which is exactly how this
  // check silently passed everyone through the first time.
  if (String(target.author?._id ?? target.author) === String(req.user._id)) {
    throw ApiError.badRequest('You can’t vote for your own post');
  }

  const me = String(req.user._id);
  const already = target.votes.some((v) => String(v) === me);
  target.votes = already
    ? target.votes.filter((v) => String(v) !== me)
    : [...target.votes, req.user._id];

  await thread.save();
  return ok(res, serialise(await withAuthors(Discussion.findById(thread._id)), {
    course,
    user: req.user,
  }));
});

// POST /lms/discussions/:id/replies/:replyId/accept
//
// Whoever asked decides what answered it; the instructor can too, because a
// learner often stops reading once they are unstuck and the next person to hit
// the same question still needs the answer marked.
export const acceptReply = asyncHandler(async (req, res) => {
  const { thread, course, access } = await loadThread(req.params.id, req.user);

  const isAsker = String(thread.author?._id ?? thread.author) === String(req.user._id);
  if (!isAsker && access !== 'instructor' && access !== 'staff') {
    throw ApiError.forbidden('Only whoever asked, or the instructor, can accept an answer');
  }

  const reply = thread.replies.id(req.params.replyId);
  if (!reply) throw ApiError.notFound('Reply not found');

  // One accepted answer at a time. Accepting the accepted one clears it, so a
  // mistake is undoable without needing a second control for it.
  const wasAccepted = reply.accepted;
  thread.replies.forEach((r) => { r.accepted = false; });
  reply.accepted = !wasAccepted;
  syncResolved(thread);
  await thread.save();

  return ok(res, serialise(await withAuthors(Discussion.findById(thread._id)), {
    course,
    user: req.user,
  }));
});

/* ---- Instructor ---------------------------------------------------------- */

// GET /lms/authoring/discussions. Every question on the courses this instructor
// wrote, newest activity first, with the ones nobody has answered called out.
//
// The same records the learner screens read. An instructor answering here is
// posting into the same thread the learner is watching.
export const instructorQuestions = asyncHandler(async (req, res) => {
  const courses = await Course.find({ author: req.user._id }).select('title slug author');
  if (!courses.length) return ok(res, { totals: {}, threads: [], courses: [] });

  const threads = await withAuthors(
    Discussion.find({ course: { $in: courses.map((c) => c._id) } }).sort({ lastActivityAt: -1 }),
  );
  const courseById = new Map(courses.map((c) => [String(c._id), c]));

  const rows = threads.map((t) =>
    serialise(t, { course: courseById.get(String(t.course)), user: req.user }),
  );

  return ok(res, {
    totals: {
      total: rows.length,
      // "Unanswered" means nobody from the teaching side has replied, which is
      // the queue that matters. A thread with three learner replies and no
      // instructor answer is still waiting on the instructor.
      unanswered: rows.filter((r) => !r.hasInstructorReply).length,
      resolved: rows.filter((r) => r.resolved).length,
      courses: courses.length,
    },
    courses: courses.map((c) => ({ _id: c._id, title: c.title, slug: c.slug })),
    threads: rows,
  });
});
