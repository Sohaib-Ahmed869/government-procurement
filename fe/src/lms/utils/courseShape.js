// Backend Course -> the shape the LMS cards render.
//
// The LMS reads the site's existing /api/courses records, which were designed
// for the marketing pages. They carry title, slug, summary, level and price,
// but not the things a course card assumed while it ran on placeholder data:
// a rating, a learner count, or a module/lesson tally.
//
// Rather than invent those, this returns null and the cards omit the row. A
// fabricated "4.8 (124)" on a course nobody has rated is worse than no rating.

const LEVEL_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

// The card tints its cover from this. Derived from the id so a course keeps the
// same colour between renders and between pages, rather than shifting with its
// position in a filtered list.
export function accentFor(id) {
  const s = String(id ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 6;
  return h;
}

export function levelLabelFor(course) {
  return course.levelLabel || LEVEL_LABEL[course.level] || '';
}

// `instructor` on a Course is an embedded byline {name, role, avatarUrl}. The
// CMS-authored courses leave it empty, so fall back to the site rather than
// rendering a blank line where an author should be.
function bylineFor(course) {
  const name = course.instructor?.name?.trim();
  return {
    name: name || 'Government Procurement',
    role: course.instructor?.role ?? '',
    avatarUrl: course.instructor?.avatarUrl ?? '',
  };
}

export function toCatalogCourse(course) {
  return {
    id: course._id,
    slug: course.slug,
    title: course.title,
    summary: course.summary ?? '',
    instructor: bylineFor(course),
    level: course.level,
    levelLabel: levelLabelFor(course),
    segment: course.segment,
    resourceType: course.resourceType,
    price: course.price ?? 0,
    currency: course.currency ?? 'AUD',
    // priceLabel is the marketing string ("A$1,800"); price is the number the
    // checkout uses. They disagree on the seeded records, and the number wins.
    priceLabel: course.priceLabel ?? '',
    durationLabel: course.durationLabel ?? '',
    featured: Boolean(course.featured),
    image: course.image?.url ?? '',
    accent: accentFor(course._id),
    // Not yet tracked anywhere. Null means "don't render it", not "zero".
    rating: null,
    ratingCount: 0,
    learners: null,
    modules: null,
    lessons: null,
    enrolled: false,
  };
}

// An enrolment row from GET /lms/enrollments, where `course` is populated.
// Everything derived. Progress, what's next, the certificate. Is computed by
// the server, because the drip gate on `next` is its decision to make.
export function toEnrolledCourse(row) {
  const course = row.course ?? {};
  return {
    ...toCatalogCourse(course),
    enrolmentId: row._id,
    enrolled: true,
    // The course was taken off the site after this person enrolled. Their
    // access survives it (the server allows an active enrolment through), but
    // the card says so rather than looking like any other course.
    offline: course.status !== 'published',
    modules: row.moduleCount ?? 0,
    lessons: row.lessonsTotal ?? 0,
    lessonsDone: row.lessonsDone ?? 0,
    percent: row.percent ?? 0,
    minutesLeft: row.minutesLeft ?? 0,
    minutesLearned: row.minutesLearned ?? 0,
    lastAccessedAt: row.lastAccessedAt ?? null,
    next: row.next ?? null,
    certificate: row.certificate ?? null,
    // Learning paths aren't modelled on the server yet; the card hides the row
    // when this is null.
    path: null,
  };
}
