import mongoose from 'mongoose';

export const ENROLMENT_SOURCE = {
  PURCHASE: 'purchase',
  FREE: 'free',
  ADMIN: 'admin',
  ORGANISATION: 'organisation',
};

// A learner's access to a course (L6).
//
// This record IS the access control. Every gated read checks it, so it is the
// one thing that must be created by the server. On a settled payment, never on
// a client saying the payment went through.
const enrollmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },

    source: { type: String, enum: Object.values(ENROLMENT_SOURCE), default: ENROLMENT_SOURCE.FREE },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

    enrolledAt: { type: Date, default: Date.now },
    // Set when the learner finishes; also what the certificate is issued from.
    completedAt: { type: Date },

    // Revoked rather than deleted, so a refund leaves an auditable trail.
    revokedAt: { type: Date },
    revokedReason: { type: String, default: '' },
  },
  { timestamps: true },
);

// One enrolment per person per course. The unique index is the real guard,
// a check-then-insert in the controller races with itself under load.
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

enrollmentSchema.methods.isActive = function isActive() {
  return !this.revokedAt;
};

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
