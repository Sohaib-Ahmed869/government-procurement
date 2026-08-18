import mongoose from 'mongoose';

// Everything about an instructor that isn't already on their User record.
//
// A separate collection rather than fields on User: the User model is shared
// with the CMS and has no business carrying teaching metadata, and this keeps
// instructor concerns out of a document every authenticated request loads.
const instructorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Shown in the course byline and on the instructor's public profile.
    headline: { type: String, default: '' }, // e.g. "Principal Advisor"
    bio: { type: String, default: '' },
    organisation: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },

    // Anyone may open an instructor account. There is no approval queue for
    // PEOPLE. The gate is on each COURSE, which an admin approves in the CMS
    // before it reaches the website. That is the right place for it: reviewing
    // the thing being published is more useful than vetting who wrote it, and
    // it does not block someone from starting work.
    //
    // 'suspended' remains, for the case where an account has to be stopped.
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      index: true,
    },
    suspendedAt: { type: Date },
    suspendedReason: { type: String, default: '' },
  },
  { timestamps: true },
);

// Can this instructor submit courses for review?
instructorProfileSchema.methods.isActive = function isActive() {
  return this.status === 'active';
};

export const InstructorProfile = mongoose.model('InstructorProfile', instructorProfileSchema);
