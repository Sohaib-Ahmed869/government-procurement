import mongoose from 'mongoose';

// Managed external links: tender portals (S9) and social profiles. `group`
// separates the two sets; `region` supports the Featured/Australian tender split.
const linkSchema = new mongoose.Schema(
  {
    group: { type: String, enum: ['tender', 'social'], required: true, index: true },
    label: { type: String, required: true },
    url: { type: String, required: true },
    // tender-only: which list it belongs to — Featured or Australian.
    region: { type: String, enum: ['featured', 'australia', ''], default: '' },
    // social-only: platform key for icon rendering.
    platform: { type: String, default: '' },
    description: { type: String, default: '' },
    icon: {
      key: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Link = mongoose.model('Link', linkSchema);
