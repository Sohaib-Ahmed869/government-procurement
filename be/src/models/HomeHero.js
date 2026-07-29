import mongoose from 'mongoose';

// Editable copy for the homepage hero, one document per audience segment. The
// page picks the document matching the visitor's win/award toggle, so each
// segment can carry its own eyebrow, heading and sub-heading.
const homeHeroSchema = new mongoose.Schema(
  {
    audience: { type: String, enum: ['win', 'award'], required: true, unique: true, index: true },
    eyebrow: { type: String, default: '' },
    heading: { type: String, default: '' },
    subheading: { type: String, default: '' },
  },
  { timestamps: true },
);

export const HomeHero = mongoose.model('HomeHero', homeHeroSchema);
