import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';

// One row on the WIN side of How to Engage Us.
//
// The page answers a different question on each side of the toggle, and until
// now only one of those answers was editable. AWARD — a government buyer — gets
// the panels and schemes we hold an appointment on, which is GovernmentPanel.
// WIN — a supplier or bidder — gets the services we run for them and how to
// start one, and that list was BORROWED from the Service Offering page: the
// same capability cards, read through the same resolver.
//
// Sharing them was wrong in both directions. An editor who renamed a service on
// Service Offering silently rewrote this page, and an editor who wanted this
// page to say something different to a bidder — a different emphasis, a
// different starting point, a service offered here and not there — had nowhere
// to say it. The two pages are now edited separately, in the same screen as the
// panels they sit beside.
//
// Deliberately NOT a copy of Capability. A capability card is what the firm
// does; this is how a bidder starts one, so it carries the title, the sentence
// under it, and the service key the consultation form is pre-filled with.
const engageServiceSchema = new mongoose.Schema(
  {
    // The service, as the row's heading.
    title: { type: String, required: true, trim: true },
    // The sentence under it. What this service is for a bidder, in their terms.
    body: { type: String, default: '', trim: true },
    // What the row's "Request a consultation" link carries in `?service=`, so a
    // request arrives already naming what it is about. Free text and optional:
    // left blank the link still works, it just arrives unlabelled. Where it
    // matches a Service Offering card's key the two line up, which is the only
    // thing left tying the pages together.
    serviceKey: { type: String, default: '', trim: true },
    // Lowest first; ties fall back to title.
    order: { type: Number, default: 0 },
    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.PUBLISHED, index: true },
  },
  { timestamps: true },
);

engageServiceSchema.index({ order: 1, title: 1 });

export const EngageService = mongoose.model('EngageService', engageServiceSchema);
