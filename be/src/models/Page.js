import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';

// Editable long-form pages: About + legal (Privacy, Terms). Addressed by slug
// (e.g. 'about', 'privacy', 'terms'). Body is rich HTML from the admin editor.
const pageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    body: { type: String, default: '' },
    // Optional structured sections for templated legal pages.
    sections: [
      {
        heading: String,
        body: String,
      },
    ],
    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.PUBLISHED, index: true },
    seo: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
    },
    updatedLabel: { type: String, default: '' }, // e.g. "September 2025"
  },
  { timestamps: true },
);

export const Page = mongoose.model('Page', pageSchema);
