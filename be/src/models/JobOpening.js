import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';

// Roles listed under "Roles we are hiring for" on the Careers page. Each one
// renders as a card with a title, a short description and an Apply button.
const jobOpeningSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    // Where Apply points. Optional: left blank, the Careers page falls back to a
    // mailto: for the careers inbox (see CareersContent.jsx).
    applyUrl: { type: String, default: '', trim: true },
    order: { type: Number, default: 0 },
    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.PUBLISHED, index: true },
  },
  { timestamps: true },
);

export const JobOpening = mongoose.model('JobOpening', jobOpeningSchema);
