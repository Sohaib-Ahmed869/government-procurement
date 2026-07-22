import mongoose from 'mongoose';

// Curated homepage rails (PDF §E). Each rail references a content type and an
// ordered list of item ids, with a fallback strategy when the list is short.
const homepageRailSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. 'featured-insights'
    title: { type: String, required: true },
    kind: { type: String, enum: ['article', 'video', 'course'], required: true },
    // Explicitly curated items, in display order. Polymorphic across content
    // types, so it's resolved by populating against the rail's `kind` model
    // explicitly in the controller (no static ref/refPath).
    items: [{ type: mongoose.Schema.Types.ObjectId }],
    // How to fill remaining slots: latest published, or featured-only.
    fallback: { type: String, enum: ['latest', 'featured', 'none'], default: 'latest' },
    maxItems: { type: Number, default: 6 },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const HomepageRail = mongoose.model('HomepageRail', homepageRailSchema);
