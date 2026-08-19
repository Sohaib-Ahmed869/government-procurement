import mongoose from 'mongoose';

// B7 — a paid listing in the Find a Bid Writer directory.
//
// B7.7: this is also the general business advertising space. There is one
// directory, not two. A bid management company and any other advertiser occupy
// the same record shape and the same page; `categories` is what separates a
// construction bid writer from an ICT one, and nothing here is specific to bid
// writing beyond the page's title. Building a second directory later for
// "general advertising" would be building this again.

// B7.2 — exactly these four, as specified. Not an open list: the categories are
// what an advertiser is sold against, so adding one is a commercial decision
// rather than a content one.
export const BID_WRITER_CATEGORIES = [
  'goods-and-services',
  'ict',
  'construction',
  'gs-related-to-construction',
];

// B7.3 — states and territories. No 'FED': this is where a company's office is,
// and there is no federal office to have one in.
export const BID_WRITER_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

// What the advertiser is paying for. `featured` sorts above `standard` and is
// marked on the card; the tier is never shown as a label, because "we paid more"
// is not information a visitor benefits from.
export const PLACEMENT_TIERS = ['standard', 'featured'];

// Sort position per tier, lowest first. An explicit number rather than sorting
// on the tier string: `featured` only sorts before `standard` alphabetically by
// accident, and the first tier added that breaks that accident (a `premium`,
// say) would silently drop paying advertisers down the page. That is the kind
// of bug nobody reports and everybody notices.
export const TIER_RANK = { featured: 0, standard: 1 };

const bidWriterSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true },
    // Shown on the listing. A person to ask for, not a switchboard.
    contactName: { type: String, default: '', trim: true },
    contactEmail: { type: String, default: '', trim: true, lowercase: true },
    contactPhone: { type: String, default: '', trim: true },
    website: { type: String, default: '', trim: true },

    // B7.3 — the office. State drives the filter; the city is display only.
    officeState: { type: String, enum: BID_WRITER_STATES, required: true, index: true },
    officeCity: { type: String, default: '', trim: true },

    // B7.2 — one listing can serve several categories, and most will.
    categories: {
      type: [{ type: String, enum: BID_WRITER_CATEGORIES }],
      default: [],
      index: true,
    },

    blurb: { type: String, default: '', trim: true },
    logo: {
      key: { type: String, default: '' },
      url: { type: String, default: '' },
    },

    placementTier: { type: String, enum: PLACEMENT_TIERS, default: 'standard', index: true },

    // The commercial gate. A listing is only visible once someone has confirmed
    // the placement is actually paid for — `active` is the switch, and it
    // defaults to off so a record created while a deal is still being discussed
    // cannot appear by accident.
    active: { type: Boolean, default: false, index: true },

    // Free text, internal only. Never served publicly.
    notes: { type: String, default: '', trim: true },

    order: { type: Number, default: 0 },

    // Derived from `placementTier` below. Stored so the sort happens in the
    // database rather than after the fact.
    tierRank: { type: Number, default: 1, index: true },
  },
  { timestamps: true },
);

// Kept in step with the tier on every save, so the two cannot disagree.
bidWriterSchema.pre('validate', function setTierRank() {
  this.tierRank = TIER_RANK[this.placementTier] ?? 1;
});

// Featured first, then the editor's order, then alphabetically — so an unranked
// set still lands in a defensible order rather than by insertion.
bidWriterSchema.index({ tierRank: 1, order: 1, company: 1 });

export const BidWriter = mongoose.model('BidWriter', bidWriterSchema);
