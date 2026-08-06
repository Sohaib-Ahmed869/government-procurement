import mongoose from 'mongoose';

// Icons a card can carry. Each maps to an asset in the site (see
// fe/src/features/advisory/capabilityIcons.js) — a fixed set rather than an
// upload, so every card is drawn in the same style.
export const CAPABILITY_ICONS = ['target', 'document', 'graph'];

// Which side of the site's audience toggle a card belongs to. 'both' shows it
// under either, which is what every card created before this field existed
// falls back to.
export const CAPABILITY_AUDIENCES = ['both', 'win', 'award'];

// A card in the "Deliver with Impact" row on the Capabilities page.
const capabilitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    icon: { type: String, enum: CAPABILITY_ICONS, default: 'target' },
    audience: {
      type: String,
      enum: CAPABILITY_AUDIENCES,
      default: 'both',
      index: true,
    },
    // Lowest first; ties fall back to creation order.
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Capability = mongoose.model('Capability', capabilitySchema);
