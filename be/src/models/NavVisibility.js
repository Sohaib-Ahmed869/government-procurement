import mongoose from 'mongoose';

// Whether a top-level site page — one of the fixed entries in
// constants/navPages.js — appears in the header/footer nav. One row per
// overridden page; a page with no row is visible, the same "missing row means
// the shipped default" rule Link uses for its footer overrides. The page
// itself is never gated by this: it stays reachable at its URL either way,
// only the link to it disappears.
const navVisibilitySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const NavVisibility = mongoose.model('NavVisibility', navVisibilitySchema);
