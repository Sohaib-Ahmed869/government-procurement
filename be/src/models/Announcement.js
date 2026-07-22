import mongoose from 'mongoose';

// Site-wide announcement banner (S12-adjacent). Only the active, in-window
// banner is served to the public.
const announcementSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    link: { type: String, default: '' },
    linkLabel: { type: String, default: '' },
    tone: { type: String, enum: ['info', 'success', 'warning'], default: 'info' },
    active: { type: Boolean, default: false, index: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true },
);

export const Announcement = mongoose.model('Announcement', announcementSchema);
