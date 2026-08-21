import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';

/* ---------------------------------------------------------------------------
   A course bundle: several published courses sold together for less than the
   sum of their prices.

   Like a learning path, a bundle REFERENCES courses rather than containing
   them — the same course can sit in several bundles, and fixing it once fixes
   it everywhere. Unlike a path, a bundle says nothing about order or
   prerequisites: it is a commercial grouping, not a curriculum, so it has a
   price and no steps.

   The saving is never stored. It is the difference between the courses' own
   prices today and this bundle's price, and a stored copy of that goes stale
   the first time an admin re-prices one of the courses inside it.
   ------------------------------------------------------------------------ */
const bundleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String, default: '' },
    // Long description, rich text. Sanitised on write like a course body.
    body: { type: String, default: '' },

    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],

    // What the bundle sells for. The courses keep their own prices; this
    // replaces the total rather than discounting each one.
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'AUD' },

    image: {
      key: { type: String, default: '' },
      url: { type: String, default: '' },
    },

    // Which colour ramp the card uses when there is no image, matching how the
    // catalogue tints courses.
    accent: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.DRAFT, index: true },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

bundleSchema.index({ title: 'text', summary: 'text' });

export const Bundle = mongoose.model('Bundle', bundleSchema);
