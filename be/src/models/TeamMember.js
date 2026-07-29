import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';

// People shown on the public "Our Team" page.
//
// `hasProfile` is the switch between the two kinds of entry:
//   • false — a card only. Name, role, photo, summary and the mail/LinkedIn
//     buttons; the card doesn't link anywhere.
//   • true  — the card links to /our-team/<slug>, which additionally renders
//     `about` and `expertise`.
// Those two fields are therefore only meaningful when hasProfile is set.
const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    role: { type: String, default: '' },
    location: { type: String, default: '' },
    email: { type: String, default: '', trim: true, lowercase: true },
    linkedin: { type: String, default: '' },
    photo: {
      key: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    // Short bio on the card.
    summary: { type: String, default: '' },
    // Profile-page only — paragraphs of biography and a list of specialisms.
    about: { type: [String], default: [] },
    expertise: { type: [String], default: [] },
    // Also profile-page only, and both optional: the page hides either section
    // when its list is empty.
    pastExperience: {
      type: [{ _id: false, org: { type: String, default: '' }, role: { type: String, default: '' } }],
      default: [],
    },
    education: {
      type: [
        { _id: false, school: { type: String, default: '' }, qualification: { type: String, default: '' } },
      ],
      default: [],
    },
    hasProfile: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.PUBLISHED, index: true },
  },
  { timestamps: true },
);

export const TeamMember = mongoose.model('TeamMember', teamMemberSchema);
