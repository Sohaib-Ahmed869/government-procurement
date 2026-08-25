import mongoose from 'mongoose';

// Icons a card can carry. Each maps to a drawn mark in the site (see
// CAPABILITY_ICONS in fe/src/features/serviceOffering/serviceIcons.jsx) — a
// fixed set rather than an upload, so every card is drawn in the same style.
//
// The last four were added with the Service Offering rename (A5): the six
// services the page is built on use `shield`, `flow`, `scales` and `handover`,
// and with only the original three in this enum a card for any of them failed
// validation on save.
export const CAPABILITY_ICONS = [
  'target',
  'document',
  'graph',
  'shield',
  'flow',
  'scales',
  'handover',
];

// Which side of the site's audience toggle a card belongs to. 'both' shows it
// under either, which is what every card created before this field existed
// falls back to.
//
// This is what decides whether a service is listed at all. Win and Award do not
// offer the same services, or the same number of them, so most cards belong to
// one segment; 'both' is for the ones that genuinely read the same under each.
export const CAPABILITY_AUDIENCES = ['both', 'win', 'award'];

// A service card on the Service Offering page.
//
// No `key`. There was one, an enum naming which of six fixed services a card
// supplied the copy for, because the set was fixed by the brief and the page was
// built on it. The two segments now carry different services in different
// numbers — neither of them six — so there is no set for a card to name, and the
// CMS dropdown that asked which of six a card was had no right answer for most
// of them. A card IS the service now: its title is the service's name.
//
// Documents saved before this keep their `key` in Mongo — the schema simply
// stops reading it — the same way `image` was left behind when it went.
const capabilitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    // The small uppercase label over the title — "Before market", "Throughout".
    // Optional: a card without one simply doesn't show a stage.
    stage: { type: String, default: '', trim: true },
    icon: { type: String, enum: CAPABILITY_ICONS, default: 'target' },
    // No image. The Service Offering page carried a photograph per service
    // while it was a run of full-width rows; it is an accordion of headings
    // now, with nowhere for one, and the card grids that also show a service
    // (the homepage, the page's own summary) use drawn marks rather than
    // photographs. The field, its two endpoints and the CMS picker went
    // together rather than leaving an upload nothing would ever display.
    //
    // Documents saved before this keep their `image` sub-document in Mongo —
    // the schema simply stops reading it — and the objects those pointed at are
    // still in the bucket. Neither is served anywhere; clearing them is a
    // one-off job for whoever owns the bucket, not something this file can do.
    audience: {
      type: String,
      enum: CAPABILITY_AUDIENCES,
      default: 'both',
      index: true,
    },
    // Position on the page. Lowest first; ties fall back to creation order.
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Capability = mongoose.model('Capability', capabilitySchema);
