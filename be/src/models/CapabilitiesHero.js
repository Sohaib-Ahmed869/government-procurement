import mongoose from 'mongoose';

// Editable copy for the Capabilities page hero, one document per audience
// segment — the same shape as HomeHero, and read the same way: the page picks
// the document matching the visitor's win/award toggle.
//
// Kept as its own collection rather than a second kind of row in HomeHero, so
// neither page's copy can be reached by an edit meant for the other.
const capabilitiesHeroSchema = new mongoose.Schema(
  {
    audience: { type: String, enum: ['win', 'award'], required: true, unique: true, index: true },
    eyebrow: { type: String, default: '' },
    heading: { type: String, default: '' },
    // Optional — the hero simply leaves the line out when it's empty.
    subheading: { type: String, default: '' },
  },
  { timestamps: true },
);

export const CapabilitiesHero = mongoose.model('CapabilitiesHero', capabilitiesHeroSchema);
