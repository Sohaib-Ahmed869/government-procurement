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
  },
  { timestamps: true },
);

courseSchema.index({ title: 'text', summary: 'text', body: 'text' });

export const Course = mongoose.model('Course', courseSchema);
