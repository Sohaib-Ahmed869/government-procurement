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

// What the advertiser is paying for. The tier is never shown as a label, because
// "we paid more" is not information a visitor benefits from. It no longer
// decides position on its own either — see `order` below — it only settles two
// listings that were given the same position number.
export const PLACEMENT_TIERS = ['standard', 'featured'];

// Tie-break rank per tier, lowest first. An explicit number rather than sorting
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
    // B7.5 — the rest of the contact row. Each one is its own button on the
    // card, and an empty one simply has no button: a directory that renders a
    // dead "LinkedIn" for every advertiser who hasn't given one is worse than
    // one that shows four buttons for some listings and two for others.
    //
    // `caseStudies` points at the advertiser's OWN case studies page. Nothing
    // is hosted here — it is a deep link into their site, which is why it sits
    // beside the website link rather than replacing it.
    linkedinUrl: { type: String, default: '', trim: true },
    caseStudiesUrl: { type: String, default: '', trim: true },

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

    // THE position on the public page, lowest first, and the only thing that
    // decides it. It used to sit BELOW `tierRank`, which meant an editor could
    // renumber a standard listing all day and never move it past a featured
    // one — the number appeared to do nothing, because within its own tier
    // nothing had changed. Whoever is selling the placements is the one who
    // knows what order they were sold in, so the number they set is the answer
    // and the tier is only consulted when two listings claim the same slot.
    //
    // Written as a dense 0..n-1 sequence by the reorder endpoint, so "first"
    // is 0 and there are no gaps to reason about. A hand-typed number still
    // works: it is just a position, and the next reorder tidies the sequence.
    order: { type: Number, default: 0, index: true },

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

// The editor's order first, then featured ahead of standard where two listings
// share a number, then alphabetically — so a set nobody has ranked still lands
// in a defensible order rather than by insertion.
bidWriterSchema.index({ order: 1, tierRank: 1, company: 1 });

export const BidWriter = mongoose.model('BidWriter', bidWriterSchema);
