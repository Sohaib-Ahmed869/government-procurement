import mongoose from 'mongoose';
import {
  CONTENT_STATUS,
  CONTENT_STATUSES,
  COURSE_STATE,
  COURSE_STATES,
  COURSE_RESOURCE_TYPE,
  COURSE_RESOURCE_TYPES,
  COURSE_SEGMENT,
  COURSE_SEGMENTS,
  COURSE_LEVEL,
  COURSE_LEVELS,
} from '../constants/statuses.js';

// Courses (PRD S4) with a 'Coming soon' vs 'Open' availability state.
const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String, default: '' }, // short intro shown under the title
    body: { type: String, default: '' }, // rich HTML — "Course description"
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },

    // --- Course detail page (mirrors the marketing layout) ---
    // Instructor shown in the byline bar under the title.
    instructor: {
      name: { type: String, default: '' },
      role: { type: String, default: '' },
      avatarUrl: { type: String, default: '' },
    },
    // Purchase box.
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'AUD' },
    // Short blurb inside the "Start learning today!" purchase card.
    sidebarSummary: { type: String, default: '' },
    // Display label for the level chip, e.g. "Foundational" (free-text; the
    // enum `level` above still drives filtering).
    levelLabel: { type: String, default: '' },
    // "What you'll learn" — a flat list of outcome bullet points.
    learnPoints: { type: [String], default: [] },
    // "Requirements" — a flat list of prerequisites.
    requirements: { type: [String], default: [] },
    // "Who should take this course?" — title + description per audience.
    whoShouldTake: {
      type: [
        {
          title: { type: String, default: '' },
          text: { type: String, default: '' },
        },
      ],
      default: [],
    },
    // Purchase-card breakdown lists (plain strings, e.g. "20+ hours of content").
    includes: { type: [String], default: [] },
    access: { type: [String], default: [] },
    // Taxonomy for the public /courses side filters.
    resourceType: {
      type: String,
      enum: COURSE_RESOURCE_TYPES,
      default: COURSE_RESOURCE_TYPE.COURSES,
      index: true,
    },
    segment: {
      type: String,
      enum: COURSE_SEGMENTS,
      default: COURSE_SEGMENT.GENERAL,
      index: true,
    },
    level: {
      type: String,
      enum: COURSE_LEVELS,
      default: COURSE_LEVEL.BEGINNER,
      index: true,
    },
    image: {
      key: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    // Course materials attached directly to the course. Each item is one of:
    //  - 'video'    an uploaded video file (key/url/mimeType/sizeBytes)
    //  - 'youtube'  a pasted YouTube link (youtubeUrl/youtubeId)
    //  - 'pdf'      an uploaded PDF document (key/url)
    //  - 'image'    an uploaded image (key/url)
    // (Videos used to be a standalone collection; they now live here.)
    media: [
      {
        kind: { type: String, enum: ['video', 'youtube', 'pdf', 'image'], required: true },
        title: { type: String, default: '' },
        key: { type: String, default: '' },
        url: { type: String, default: '' },
        mimeType: { type: String, default: '' },
        sizeBytes: { type: Number, default: 0 },
        youtubeUrl: { type: String, default: '' },
        youtubeId: { type: String, default: '' },
        order: { type: Number, default: 0 },
      },
    ],
    durationLabel: { type: String, default: '' }, // e.g. "6 weeks"
    availability: { type: String, enum: COURSE_STATES, default: COURSE_STATE.COMING_SOON },
    startDate: { type: Date },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.DRAFT, index: true },
    publishedAt: { type: Date },

    // ---- LMS authoring (added for the instructor workflow) -------------------
    // All optional, so every existing CMS-authored course keeps working
    // unchanged: no owner means a staff-authored course, and no review state
    // means the CMS's own draft/published status is the only one that applies.

    // Who wrote it. Set when an instructor creates the course; absent on the
    // courses the CMS already had.
    //
    // Named `author`, NOT `instructor`: this schema already has an `instructor`
    // object holding the byline the website prints ({ name, role, avatarUrl }).
    // A second key of the same name would silently replace it and take the
    // course page's byline with it.
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // The review workflow. Separate from `status` on purpose: `status` is what
    // the WEBSITE shows (draft/published/archived), while this is where the
    // course sits in the approval queue. An instructor moves it to 'pending';
    // only an admin can move it on from there, and only that admin action sets
    // status to published.
    // Two ways a submission can come back, and they mean different things to
    // the instructor:
    //   rejected  sent back to be fixed. The work is fine in principle; these
    //             specific things need changing, then resubmit.
    //   declined  not going on the site. A judgement about the course itself,
    //             not a list of corrections.
    // Collapsing them into one status left an admin unable to say the second
    // thing, so every refusal read as "nearly there, just tidy it up".
    reviewStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected', 'declined'],
      default: 'none',
      index: true,
    },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, default: '' },

    // How this course's certificate reads (L4). Per course, and the
    // instructor's to set: they know what the course actually attests to, and
    // "Certificate of Completion" is not always the right words for it.
    //
    // Every field has a default, so a course that is never customised still
    // issues a sensible certificate. CERTIFICATE_DEFAULTS below is the one
    // place those defaults live, shared with the builder's preview.
    certificate: {
      enabled: { type: Boolean, default: true },
      heading: { type: String, default: 'Certificate of Completion' },
      // Sits above the recipient's name, e.g. "This is to certify that".
      preamble: { type: String, default: 'This is to certify that' },
      // Sits between the name and the course title.
      statement: { type: String, default: 'has successfully completed' },
      // Free text under the title. The place for an accreditation reference or
      // a CPD note, which differs course to course.
      footnote: { type: String, default: '' },
      issuerName: { type: String, default: 'Government Procurement' },
      signatoryName: { type: String, default: '' },
      signatoryRole: { type: String, default: '' },
      // Three independent colours: the accent (border, heading, issuer line),
      // the paper behind it, and the body text. Free-form hex rather than a
      // fixed palette, because an instructor may be matching an agency's
      // branding that no palette of ours would contain.
      accent: { type: String, default: '#0a3114' },
      background: { type: String, default: '#ffffff' },
      textColor: { type: String, default: '#1a1a1a' },
      showHours: { type: Boolean, default: true },
      showCredentialId: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

// The shape a brand-new course starts from, and what the builder shows as the
// "default view" before an instructor changes anything.
export const CERTIFICATE_DEFAULTS = {
  enabled: true,
  heading: 'Certificate of Completion',
  preamble: 'This is to certify that',
  statement: 'has successfully completed',
  footnote: '',
  issuerName: 'Government Procurement',
  signatoryName: '',
  signatoryRole: '',
  accent: '#0a3114',
  background: '#ffffff',
  textColor: '#1a1a1a',
  showHours: true,
  showCredentialId: true,
};

courseSchema.index({ title: 'text', summary: 'text', body: 'text' });

export const Course = mongoose.model('Course', courseSchema);
