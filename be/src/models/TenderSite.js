import mongoose from 'mongoose';

// A tender portal listed on the Tender Websites page. Each entry is one
// jurisdiction's site, with its own logo and up to three destinations: the open
// tenders search, the upcoming/forecast notices, and where to register.
//
// Superseded the tender entries that used to live in Link (group: 'tender'),
// which only carried a label, a URL and a description.
const tenderSiteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    openTendersUrl: { type: String, default: '', trim: true },
    upcomingTendersUrl: { type: String, default: '', trim: true },
    createAccountUrl: { type: String, default: '', trim: true },
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
