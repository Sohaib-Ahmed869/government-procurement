import mongoose from 'mongoose';

// Pages whose hero copy an editor can change from the CMS. The homepage keeps
// its own HomeHero collection; anything added here is a page that came later.
export const HERO_PAGES = ['capabilities'];

// Editable hero copy, one document per page + audience segment. A page shows the
// document matching the visitor's win/award toggle, so each segment can carry
// its own eyebrow, heading and sub-heading.
const pageHeroSchema = new mongoose.Schema(
  {
    page: { type: String, enum: HERO_PAGES, required: true, index: true },
    audience: { type: String, enum: ['win', 'award'], required: true },
    eyebrow: { type: String, default: '' },
    heading: { type: String, default: '' },
    subheading: { type: String, default: '' },
  },
  { timestamps: true },
);

// One document per page/segment pair.
pageHeroSchema.index({ page: 1, audience: 1 }, { unique: true });

export const PageHero = mongoose.model('PageHero', pageHeroSchema);
