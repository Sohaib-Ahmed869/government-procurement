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

// The six services the Service Offering page is built on (A5). The set is fixed
// by the brief, so a card names one of them rather than carrying a free-typed
// title — see SERVICE_KEYS in fe/src/features/serviceOffering/services.js,
// which must stay in step with this list.
//
// Blank is allowed: cards saved before the rename have no key, and the site
// falls back to matching them on their slugified title.
export const SERVICE_KEYS = [
  'procurement-strategy',
  'probity',
  'process-management',
  'evaluation-negotiation',
  'vendor-transition',
  'contract-management',
];

// Which side of the site's audience toggle a card belongs to. 'both' shows it
// under either, which is what every card created before this field existed
// falls back to.
export const CAPABILITY_AUDIENCES = ['both', 'win', 'award'];

// One of the six service cards on the Service Offering page.
const capabilitySchema = new mongoose.Schema(
  {
    // Which of the six this card is the copy for. `enum` includes '' so the
    // cards that predate the rename still validate on their next save.
    key: {
      type: String,
      enum: [...SERVICE_KEYS, ''],
      default: '',
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    // The small uppercase label over the title — "Before market", "Throughout".
    // The six built-in services carry their own per-segment stage in
    // fe/src/features/serviceOffering/services.js; this is what lets a service
    // *added* through the CMS carry one of its own.
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
    // Lowest first; ties fall back to creation order.
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Capability = mongoose.model('Capability', capabilitySchema);
