// Course taxonomy. The single front-end source for the values and labels the
// LMS shows.
//
// These MUST match two things or the LMS quietly disagrees with the rest of the
// product:
//   · the enums in be/src/constants/statuses.js (COURSE_SEGMENT, COURSE_LEVEL,
//     COURSE_RESOURCE_TYPE), which the Course model validates against
//   · the filter labels on the public courses page
//     (fe/src/features/courses/components/CoursesBrowser.jsx)
//
// The LMS builder previously carried its own invented list. "government" and
// "business" segments, and "Foundational" for beginner, which would have
// written values the Course model rejects and labels the catalogue doesn't use.

// Audience segment. Mirrors the site's audience toggle: someone who AWARDS
// contracts (a government buyer) or someone who WINS them (a supplier).
export const SEGMENTS = [
  { value: 'general', label: 'General', hint: 'Relevant to both buyers and suppliers' },
  { value: 'award', label: 'Award Contracts', hint: 'For government buyers running procurements' },
  { value: 'win', label: 'Win Contracts', hint: 'For suppliers bidding for government work' },
];

export const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

// What kind of resource this is. The public page doesn't filter on it yet, but
// the Course model carries it and the CMS editor sets it.
export const RESOURCE_TYPES = [
  { value: 'courses', label: 'Course' },
  { value: 'artefacts', label: 'Artefact' },
  { value: 'bundles', label: 'Bundle' },
];

export const segmentLabel = (value) =>
  SEGMENTS.find((s) => s.value === value)?.label ?? 'General';

export const levelLabel = (value) => LEVELS.find((l) => l.value === value)?.label ?? 'Beginner';
