import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/apiResponse.js';
import { Course } from '../../models/Course.js';
import { Lesson } from '../../models/Lesson.js';
import { Enrollment } from '../../models/Enrollment.js';
import { Progress } from '../../models/Progress.js';
import { Review } from '../../models/Review.js';
import { CONTENT_STATUS } from '../../constants/statuses.js';

/* ---------------------------------------------------------------------------
   Course reviews (L5). One dataset, read from both sides:

     learners     write and manage their own, and read everyone's on a course
     instructors  see what is being said about the courses they wrote

   Neither side keeps its own copy, so a rating a learner leaves is the rating
   their instructor sees.
   ------------------------------------------------------------------------ */

// How far in a learner has to be before their opinion is worth publishing.
// Half, deliberately: requiring completion would mean almost nobody ever
// reviews anything, and someone halfway through has met the course.
const REVIEWABLE_PERCENT = 50;

// A learner's progress through one course, as a percentage. Derived from the
// same Progress record every other screen reads.
function percentFor({ progress, lessonCount }) {
  const done = progress?.completedLessons?.length ?? 0;
  return lessonCount ? Math.round((done / lessonCount) * 100) : 0;
}

// The public shape. The reviewer's NAME is published — a review nobody is
// willing to put their name to is worth less — but nothing else about them.
function serialise(review, { course, user }) {
  const author = review.user;
  return {
    id: String(review._id),
    slug: course?.slug ?? '',
    courseTitle: course?.title ?? '',
    courseId: course ? String(course._id) : '',
    rating: review.rating,
    title: review.title ?? '',
    body: review.body ?? '',
    author: author?.name ?? 'Former member',
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    mine: String(author?._id ?? author) === String(user?._id ?? ''),
  };
}

// The headline numbers for a set of reviews: the average, and how the ratings
// are spread. The spread matters — a 4.0 made of fours reads very differently
// from a 4.0 made of fives and ones, and an average alone hides that.
function summarise(reviews) {
  const count = reviews.length;
  const spread = [1, 2, 3, 4, 5].reduce((acc, n) => ({ ...acc, [n]: 0 }), {});
  reviews.forEach((r) => { spread[r.rating] += 1; });

  return {
    count,
    average: count
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : null,
    spread,
  };
}

/* ---- Learner ------------------------------------------------------------- */

// GET /lms/reviews/mine. What this learner has written, and what they are far
// enough through to review next.
//
// Both on one request because they are one screen, and the second list depends
// on the first: a course drops off "awaiting your review" the moment it is
// reviewed.
export const myReviews = asyncHandler(async (req, res) => {
  const [mine, enrolments] = await Promise.all([
    Review.find({ user: req.user._id }).populate('user', 'name').sort({ updatedAt: -1 }),
    Enrollment.find({ user: req.user._id, revokedAt: null }).select('course').lean(),
  ]);

  const courseIds = [
    ...new Set([...mine.map((r) => String(r.course)), ...enrolments.map((e) => String(e.course))]),
  ];
  const courses = await Course.find({ _id: { $in: courseIds } }).select('title slug status').lean();
  const courseById = new Map(courses.map((c) => [String(c._id), c]));

  // Progress and lesson counts for the enrolled courses, to work out which are
  // far enough along.
  const enrolledIds = enrolments.map((e) => e.course);
  const [progresses, lessonCounts] = await Promise.all([
    Progress.find({ user: req.user._id, course: { $in: enrolledIds } })
      .select('course completedLessons')
      .lean(),
    Lesson.aggregate([
      { $match: { course: { $in: enrolledIds } } },
      { $group: { _id: '$course', n: { $sum: 1 } } },
    ]),
  ]);
  const progressBy = new Map(progresses.map((p) => [String(p.course), p]));
  const lessonsBy = new Map(lessonCounts.map((r) => [String(r._id), r.n]));
  const reviewed = new Set(mine.map((r) => String(r.course)));

  const reviewable = enrolments
    .filter((e) => !reviewed.has(String(e.course)))
    .map((e) => {
      const course = courseById.get(String(e.course));
      if (!course) return null;
      const percent = percentFor({
        progress: progressBy.get(String(e.course)),
        lessonCount: lessonsBy.get(String(e.course)) ?? 0,
      });
      return percent >= REVIEWABLE_PERCENT
        ? { courseId: String(course._id), slug: course.slug, title: course.title, percent }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.percent - a.percent);

  return ok(res, {
    reviews: mine.map((r) =>
      serialise(r, { course: courseById.get(String(r.course)), user: req.user }),
    ),
    reviewable,
    // What the learner has to reach before a course appears above. Sent rather
    // than hardcoded in the client, so the two can't disagree about the rule.
    threshold: REVIEWABLE_PERCENT,
  });
});

// POST /lms/reviews. Writes or replaces this learner's review of one course.
//
// Upsert rather than separate create and update endpoints: there is only ever
// one review per person per course, so "post mine" is the whole operation and
// the client does not have to know which it is doing.
export const saveReview = asyncHandler(async (req, res) => {
  const { courseId, slug, rating, title, body } = req.body ?? {};

  const value = Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw ApiError.badRequest('A review needs a rating from 1 to 5');
  }

  const course = await Course.findOne(courseId ? { _id: courseId } : { slug }).select('title slug');
  if (!course) throw ApiError.notFound('Course not found');

  const enrolment = await Enrollment.findOne({ user: req.user._id, course: course._id });
  if (!enrolment?.isActive()) {
    throw ApiError.forbidden('You can only review a course you are enrolled in');
  }

  // The progress rule, enforced here rather than only offered by the UI. A
  // review from somebody who opened the course once is what makes a rating
  // meaningless to the next person reading it.
  const [progress, lessonCount] = await Promise.all([
    Progress.findOne({ user: req.user._id, course: course._id }).select('completedLessons').lean(),
    Lesson.countDocuments({ course: course._id }),
  ]);
  const percent = percentFor({ progress, lessonCount });
  if (percent < REVIEWABLE_PERCENT) {
    throw ApiError.forbidden(
      `Get to ${REVIEWABLE_PERCENT}% of the course before reviewing it. You are ${percent}% through.`,
    );
  }

  const existing = await Review.findOne({ user: req.user._id, course: course._id });
  if (existing) {
    existing.rating = value;
    existing.title = (title ?? '').trim();
    existing.body = (body ?? '').trim();
    await existing.save();
    await existing.populate('user', 'name');
    return ok(res, serialise(existing, { course, user: req.user }));
  }

  const review = await Review.create({
    course: course._id,
    user: req.user._id,
    rating: value,
    title: (title ?? '').trim(),
    body: (body ?? '').trim(),
  });
  await review.populate('user', 'name');
  return created(res, serialise(review, { course, user: req.user }));
});

// DELETE /lms/reviews/:id. Only your own.
export const removeReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  if (String(review.user) !== String(req.user._id)) {
    // 404 rather than 403: whose review this is isn't something to confirm to
    // somebody who cannot touch it.
    throw ApiError.notFound('Review not found');
  }

  await review.deleteOne();
  return ok(res, { deleted: true });
});

// GET /lms/courses/:slug/reviews. Everyone's reviews of one course.
//
// Public, like the course page it belongs on: a rating that only enrolled
// learners could read would not help anyone decide whether to enrol.
export const courseReviews = asyncHandler(async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug }).select('title slug status');
  if (!course) throw ApiError.notFound('Course not found');
  if (course.status !== CONTENT_STATUS.PUBLISHED && !req.user) {
    throw ApiError.notFound('Course not found');
  }

  const reviews = await Review.find({ course: course._id })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return ok(res, {
    course: { _id: course._id, title: course.title, slug: course.slug },
    ...summarise(reviews),
    reviews: reviews.map((r) => serialise(r, { course, user: req.user })),
  });
});

/* ---- Instructor ---------------------------------------------------------- */

// GET /lms/authoring/reviews. What learners are saying about the courses this
// instructor wrote.
//
// The same records the learners wrote, filtered by authorship rather than by
// who is reading. Per-course averages as well as the overall one, because
// "4.2 across everything" is not actionable and "2.1 on this one" is.
export const instructorReviews = asyncHandler(async (req, res) => {
  const courses = await Course.find({ author: req.user._id }).select('title slug').lean();
  if (!courses.length) return ok(res, { totals: {}, courses: [], reviews: [] });

  const reviews = await Review.find({ course: { $in: courses.map((c) => c._id) } })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const courseById = new Map(courses.map((c) => [String(c._id), c]));
  const byCourse = new Map();
  reviews.forEach((r) => {
    const key = String(r.course);
    byCourse.set(key, [...(byCourse.get(key) ?? []), r]);
  });

  return ok(res, {
    totals: {
      ...summarise(reviews),
      courses: courses.length,
      // Courses nobody has reviewed. Worth naming rather than leaving as a gap
      // in a list: no reviews is a different problem from bad reviews.
      unreviewed: courses.filter((c) => !(byCourse.get(String(c._id)) ?? []).length).length,
    },
    courses: courses
      .map((c) => ({
        _id: String(c._id),
        title: c.title,
        slug: c.slug,
        ...summarise(byCourse.get(String(c._id)) ?? []),
      }))
      // Most-reviewed first, then worst-rated: this page is for finding out
      // what learners think, and a low average on a busy course is the thing
      // most worth seeing.
      .sort((a, b) => b.count - a.count || (a.average ?? 5) - (b.average ?? 5)),
    reviews: reviews.map((r) =>
      serialise(r, { course: courseById.get(String(r.course)), user: req.user }),
    ),
  });
});
