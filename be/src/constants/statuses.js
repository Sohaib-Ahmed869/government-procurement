// Content publication states (articles, videos, courses, pages, etc.).
export const CONTENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const CONTENT_STATUSES = Object.values(CONTENT_STATUS);

// Forum Q&A moderation workflow:
// Submitted → In Review → Approved → Published, or Rejected at any point.
export const QUESTION_STATUS = {
  SUBMITTED: 'submitted',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
};

export const QUESTION_STATUSES = Object.values(QUESTION_STATUS);

// Course availability (per the design gap analysis S4).
export const COURSE_STATE = {
  COMING_SOON: 'coming_soon',
  OPEN: 'open',
  CLOSED: 'closed',
};

export const COURSE_STATES = Object.values(COURSE_STATE);

// Course taxonomy powering the /courses side filters.
export const COURSE_RESOURCE_TYPE = {
  COURSES: 'courses',
  ARTEFACTS: 'artefacts',
  BUNDLES: 'bundles',
};
export const COURSE_RESOURCE_TYPES = Object.values(COURSE_RESOURCE_TYPE);

// Audience segment a resource belongs to (mirrors the site's audience toggle).
export const COURSE_SEGMENT = {
  GENERAL: 'general',
  AWARD: 'award',
  WIN: 'win',
};
export const COURSE_SEGMENTS = Object.values(COURSE_SEGMENT);

export const COURSE_LEVEL = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
};
export const COURSE_LEVELS = Object.values(COURSE_LEVEL);

// Subscriber double opt-in lifecycle (S11).
export const SUBSCRIBER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  UNSUBSCRIBED: 'unsubscribed',
};

export const SUBSCRIBER_STATUSES = Object.values(SUBSCRIBER_STATUS);
