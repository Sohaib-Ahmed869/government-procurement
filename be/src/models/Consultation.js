import mongoose from 'mongoose';

// "Book a Consultation" requests — the admin consultation queue.
const consultationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    organisation: { type: String, default: '' },
    role: { type: String, default: '' },
    service: {
      type: String,
      enum: ['advisory', 'training', 'tender-support', 'other'],
      default: 'other',
    },
    // "Reason for contacting" from the booking form. Free text for now — the
    // option list is still being settled, so no enum until it is.
    reason: { type: String, default: '' },
    preferredDate: { type: Date },
    preferredTime: { type: String, enum: ['morning', 'afternoon', ''], default: '' },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['new', 'contacted', 'scheduled', 'closed'],
      default: 'new',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Consultation = mongoose.model('Consultation', consultationSchema);
