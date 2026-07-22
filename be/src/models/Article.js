import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';

// Insights / articles (PRD S2). Body is rich HTML produced by the admin editor.
const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, default: '' },
    body: { type: String, default: '' }, // rich HTML
    topic: { type: String, default: '' }, // display topic label (e.g. "Strategy")
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    author: { type: String, default: '' },
    heroImage: {
      key: { type: String, default: '' },
      url: { type: String, default: '' },
      alt: { type: String, default: '' },
    },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.DRAFT, index: true },
    publishedAt: { type: Date },
    seo: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
    },
    readingMinutes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

articleSchema.index({ title: 'text', excerpt: 'text', body: 'text' });

export const Article = mongoose.model('Article', articleSchema);
