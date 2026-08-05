import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';

// Insights / articles (PRD S2). Body is rich HTML produced by the admin editor.
const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    // Retired from the CMS and the site — kept so existing values aren't lost.
    excerpt: { type: String, default: '' },
    // High-level overview, printed above the body on the article page.
    overview: { type: String, default: '' },
    body: { type: String, default: '' }, // rich HTML
    // Legacy free-text topic label. Superseded by `category`, which is what the
    // CMS sets and the site displays — nothing writes this any more. Kept so the
    // values already stored on existing articles aren't discarded.
    topic: { type: String, default: '' },
    // The article's category: the CMS taxonomy entry, and the topic label shown
    // on cards and in the article hero. Reads populate it (see the controller).
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

articleSchema.index({ title: 'text', overview: 'text', body: 'text' });

export const Article = mongoose.model('Article', articleSchema);
