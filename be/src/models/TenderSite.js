import mongoose from 'mongoose';

// A tender portal listed on the Tender Websites page. Each entry is one
// jurisdiction's site, with its own logo and up to three destinations: the open
// tenders search, the upcoming/forecast notices, and where to register.
//
// Superseded the tender entries that used to live in Link (group: 'tender'),
// which only carried a label, a URL and a description.
// Which section of the Tender Websites page an entry is listed under.
// 'australian' is the federal/state/territory list the page leads with, and is
// what every entry saved before this field existed falls back to.
export const TENDER_SITE_GROUPS = ['australian', 'other'];

const tenderSiteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    group: {
      type: String,
      enum: TENDER_SITE_GROUPS,
      default: 'australian',
      index: true,
    },
    // Whether the tender buttons are labelled "(Login Required)". Only some
    // portals put their listings behind a sign-in, so this is off by default
    // and ticked per entry rather than assumed for all of them.
    loginRequired: { type: Boolean, default: false },
    // The three destinations an 'australian' entry can carry.
    openTendersUrl: { type: String, default: '', trim: true },
    upcomingTendersUrl: { type: String, default: '', trim: true },
    createAccountUrl: { type: String, default: '', trim: true },
    // 'other' entries sit behind a paywall, so they carry a single sign-in link
    // and a note printed under it — used to disclaim any affiliation with the
    // operator whose fees the visitor is about to pay.
    loginUrl: { type: String, default: '', trim: true },
    note: { type: String, default: '', trim: true },
    logo: {
      key: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    // Lowest first; ties fall back to creation order.
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const TenderSite = mongoose.model('TenderSite', tenderSiteSchema);
