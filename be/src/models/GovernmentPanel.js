import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';

// B2 — a panel or prequalification scheme GOVERNMENT PROCUREMENT IS APPOINTED TO.
//
// This is a credentials page, not a directory. Every row says "you can engage us
// through this arrangement without running your own procurement" — so an entry
// is a claim about the business, and nothing belongs here that somebody has not
// confirmed we actually hold.
//
// That is why there is no `intake` ("open to new suppliers") field and no
// category: those belong to a directory of panels a supplier might apply to,
// which is a different page. Here the useful facts are who runs the panel, what
// it is called, and its reference number — which is what a client quotes when
// they buy through it.
//
// `group` is free text on purpose. The headings are mostly jurisdictions
// ("Australian Government", "Victorian Government") but not always: a local
// council that runs its own panel gets its own heading, and a fixed enum of the
// nine states and territories cannot express that. The admin screen offers the
// groups already in use as a datalist, so the common case is one click and a
// typo doesn't quietly create a second heading.
const governmentPanelSchema = new mongoose.Schema(
  {
    // The heading this entry is listed under, e.g. "Australian Government" or
    // "Toowoomba Regional Council".
    group: { type: String, required: true, trim: true, index: true },
    // Where the heading sits on the page. The order is curated rather than
    // alphabetical — the reference page runs Australian, Queensland, NSW,
    // Victorian, then a council, then NT — so it cannot be derived.
    //
    // It is stored per entry because a group is not a record of its own. Set the
    // same value on every entry in a group; where they disagree the LOWEST wins,
    // so one row left at the default can't drag a whole heading to the top.
    groupOrder: { type: Number, default: 0 },
    // The body that runs the panel — "Australian Federal Police", "NSW
    // Procurement". Optional: some entries are the panel name alone.
    agency: { type: String, default: '', trim: true },
    // The panel itself — "Capability Support Services Panel".
    name: { type: String, required: true, trim: true },
    // The panel or contract number: "SON 3538332", "SCM 0005", "TR-0578". Shown
    // in brackets after the name, and the thing a client quotes to buy through
    // the arrangement, which is why it is a field rather than part of `name`.
    reference: { type: String, default: '', trim: true },
    // The official page for the panel. Optional — without one the row is plain
    // text rather than a link that goes nowhere.
    sourceUrl: { type: String, default: '', trim: true },
    // Position within the group. Lowest first; ties fall back to name.
    order: { type: Number, default: 0 },
    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.PUBLISHED, index: true },
  },
  { timestamps: true },
);

// The order the page prints in, so the list arrives ready to group.
governmentPanelSchema.index({ groupOrder: 1, group: 1, order: 1, name: 1 });

export const GovernmentPanel = mongoose.model('GovernmentPanel', governmentPanelSchema);
