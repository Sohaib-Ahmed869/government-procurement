import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { ROLES } from '../constants/roles.js';

// Loads req.params.courseId (or :slug) onto req.course, or 404s.
export const loadCourse = asyncHandler(async (req, _res, next) => {
  const { courseId, slug } = req.params;
  const course = courseId
    ? await Course.findById(courseId)
    : await Course.findOne({ slug });

  if (!course) throw ApiError.notFound('Course not found');
  req.course = course;
  return next();
});

// The instructor who wrote it, or a super admin. Use AFTER loadCourse.
//
// `authorize()` can only ask "what role is this?". It cannot ask "is this
// yours?", which is the question that actually matters for instructor writes.
// Without this, any signed-in instructor could edit any other instructor's
// course simply by putting a different id in the URL.
export const ownsCourse = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role === ROLES.SUPERADMIN) return next();

  const owner = req.course?.author;
  if (!owner || String(owner) !== String(req.user._id)) {
    // 404 rather than 403: telling a stranger "this exists but isn't yours"
    // confirms the course exists, which is more than they need to know.
    return next(ApiError.notFound('Course not found'));
  }
  return next();
};

// An active enrolment on req.course, or staff. Use AFTER loadCourse.
export const isEnrolled = asyncHandler(async (req, _res, next) => {
  if (!req.user) throw ApiError.unauthorized();

  // Staff and the course's own author can always look at it.
  if (req.user.role === ROLES.SUPERADMIN) return next();
  if (req.course.author && String(req.course.author) === String(req.user._id)) {
    return next();
  }

  const enrolment = await Enrollment.findOne({ user: req.user._id, course: req.course._id });
  if (!enrolment || !enrolment.isActive()) {
    throw ApiError.forbidden('You need to be enrolled in this course');
  }

  req.enrolment = enrolment;
  return next();
});
