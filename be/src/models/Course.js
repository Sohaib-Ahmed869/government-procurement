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
    summary: { type: String, default: '' },
    body: { type: String, default: '' }, // rich HTML
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
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
    priceLabel: { type: String, default: '' }, // e.g. "A$1,200" or "Free"
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
