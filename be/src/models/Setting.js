import mongoose from 'mongoose';

// Site settings as a single document (SEO defaults, email, redirects). Access it
// via Setting.getSingleton() so there is always exactly one row.
const redirectSchema = new mongoose.Schema(
  { from: String, to: String, code: { type: Number, default: 301 } },
  { _id: false },
);

const settingSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'global', unique: true },
    seo: {
      siteName: { type: String, default: 'Government Procurement' },
      defaultTitle: { type: String, default: '' },
      titleTemplate: { type: String, default: '%s | Government Procurement' },
      defaultDescription: { type: String, default: '' },
      defaultOgImage: { type: String, default: '' },
    },
    contact: {
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    // Official social profiles, surfaced in the site footer.
    social: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      youtube: { type: String, default: '' },
      tiktok: { type: String, default: '' },
      threads: { type: String, default: '' },
    },
    analytics: {
      gtmId: { type: String, default: '' },
      ga4Id: { type: String, default: '' },
    },
    redirects: [redirectSchema],
  },
  { timestamps: true },
);

settingSchema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne({ singleton: 'global' });
  if (!doc) doc = await this.create({ singleton: 'global' });
  return doc;
};

export const Setting = mongoose.model('Setting', settingSchema);
