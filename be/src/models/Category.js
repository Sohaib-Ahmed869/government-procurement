import mongoose from 'mongoose';

// Shared taxonomy reused across articles, videos, courses, faqs, etc.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    // Which content types this category applies to (free-form tags).
    kinds: [{ type: String }], // e.g. ['article', 'video', 'faq']
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Category = mongoose.model('Category', categorySchema);
