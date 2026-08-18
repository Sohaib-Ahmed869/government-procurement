import mongoose from 'mongoose';

// An issued certificate (L4).
//
// The recipient name, course title and issuer are SNAPSHOTTED at issue rather
// than joined at render. A certificate is a statement about a moment: if the
// learner later changes their display name, or the course is renamed or
// deleted, the document must still say what it said when it was earned.
const certificateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },

    // Public identifier printed on the certificate and used by /verify.
    // Unique and indexed because verification looks up by it.
    credentialId: { type: String, required: true, unique: true, index: true },

    kind: { type: String, enum: ['course', 'path'], default: 'course' },

    // The snapshot.
    recipientName: { type: String, required: true },
    title: { type: String, required: true },
    hours: { type: Number, default: 0 },
    issuerName: { type: String, default: 'Government Procurement' },
    signatoryName: { type: String, default: '' },
    signatoryRole: { type: String, default: '' },

    // The course's certificate design AT THE MOMENT IT WAS EARNED, for the same
    // reason the names above are snapshotted. An instructor rewording their
    // certificate must not silently reword every one already issued: those are
    // documents people have downloaded, filed and linked to.
    design: {
      heading: { type: String, default: 'Certificate of Completion' },
      preamble: { type: String, default: 'This is to certify that' },
      statement: { type: String, default: 'has successfully completed' },
      footnote: { type: String, default: '' },
      accent: { type: String, default: '#0a3114' },
      background: { type: String, default: '#ffffff' },
      textColor: { type: String, default: '#1a1a1a' },
      showHours: { type: Boolean, default: true },
      showCredentialId: { type: Boolean, default: true },
    },

    issuedAt: { type: Date, default: Date.now },

    // Revocation, for the case where a certificate was issued in error. Kept
    // rather than deleted so /verify can say "revoked" instead of "not found",
    // which is a materially different answer to an employer checking.
    revokedAt: { type: Date },
    revokedReason: { type: String, default: '' },
  },
  { timestamps: true },
);

certificateSchema.index({ user: 1, course: 1 }, { unique: true, sparse: true });

// What /verify returns to an unauthenticated caller. Deliberately minimal,
// enough to confirm the claim, nothing more about the person.
certificateSchema.methods.toVerification = function toVerification() {
  return {
    credentialId: this.credentialId,
    recipientName: this.recipientName,
    title: this.title,
    issuedAt: this.issuedAt,
    hours: this.hours,
    issuerName: this.issuerName,
    valid: !this.revokedAt,
    revokedAt: this.revokedAt ?? null,
  };
};

export const Certificate = mongoose.model('Certificate', certificateSchema);
