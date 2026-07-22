import mongoose from 'mongoose';

// Contact form submissions (S8) — the admin "Contact inbox".
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    organisation: { type: String, default: '' },
    subject: { type: String, default: '' },
    message: { type: String, required: true },
    audience: { type: String, enum: ['win', 'award', ''], default: '' },
    status: { type: String, enum: ['new', 'read', 'handled', 'archived'], default: 'new', index: true },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    handledAt: { type: Date },
    // Basic anti-spam context.
    meta: {
      ip: String,
      userAgent: String,
    },
  },
  { timestamps: true },
);

export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
