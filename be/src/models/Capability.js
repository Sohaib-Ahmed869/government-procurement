import mongoose from 'mongoose';

// Icons a card can carry. Each maps to an asset in the site (see
// fe/src/features/advisory/capabilityIcons.js) — a fixed set rather than an
// upload, so every card is drawn in the same style.
export const CAPABILITY_ICONS = ['target', 'document', 'graph'];

// A card in the "Deliver with Impact" row on the Capabilities page.
const capabilitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    icon: { type: String, enum: CAPABILITY_ICONS, default: 'target' },
    // Lowest first; ties fall back to creation order.
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Capability = mongoose.model('Capability', capabilitySchema);
