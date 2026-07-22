import mongoose from 'mongoose';

// Course "register interest" submissions (for Coming-soon courses, S4/S11).
const registerInterestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    organisation: { type: String, default: '' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    courseTitle: { type: String, default: '' }, // denormalised for quick lists/export
    message: { type: String, default: '' },
    notes: { type: String, default: '' }, // internal admin notes
    status: { type: String, enum: ['new', 'contacted', 'converted', 'archived'], default: 'new', index: true },
  },
  { timestamps: true },
);

export const RegisterInterest = mongoose.model('RegisterInterest', registerInterestSchema);
