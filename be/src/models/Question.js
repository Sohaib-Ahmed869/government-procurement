import mongoose from 'mongoose';
import { QUESTION_STATUS, QUESTION_STATUSES } from '../constants/statuses.js';

// Forum Q&A (PRD S5/S6) with the moderation workflow:
// Submitted → In Review → Approved → Published, or Rejected.
const questionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, index: true },
    // The submitted question body.
    body: { type: String, required: true },
    // Audience category: 'win' (supplier-side), 'award' (buyer-side), or
    // 'general' for questions that sit outside either segment.
    category: { type: String, enum: ['win', 'award', 'general'], default: 'win', index: true },

    // Curated flag: featured questions surface in the forum sidebar.
    featured: { type: Boolean, default: false, index: true },

    // Submitter details (public submission — not an account).
    submitter: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
    },

    // The moderator's answer, added during the workflow.
    answer: {
      paragraphs: [{ type: String }],
      lessons: [{ type: String }],
      answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      answeredAt: { type: Date },
    },

    status: {
      type: String,
      enum: QUESTION_STATUSES,
      default: QUESTION_STATUS.SUBMITTED,
      index: true,
    },
    rejectionReason: { type: String, default: '' },
    publishedAt: { type: Date },
    // Audit trail of workflow transitions.
    history: [
      {
        from: String,
        to: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
        note: String,
      },
    ],
  },
  { timestamps: true },
);

questionSchema.index({ title: 'text', body: 'text' });

export const Question = mongoose.model('Question', questionSchema);
