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
    // A learning path certificate names a Program instead. Exactly one of
    // `course` / `program` is set, which is what `kind` below says in words.
    program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', index: true },

    // Public identifier printed on the certificate and used by /verify.
    // Unique and indexed because verification looks up by it.
    credentialId: { type: String, required: true, unique: true, index: true },

    kind: { type: String, enum: ['course', 'path'], default: 'course' },

    // The snapshot.
    recipientName: { type: String, required: true },
    title: { type: String, required: true },
    // Total taught time. `minutes` is the truth; `hours` is the rounded value
    // kept for records issued before minutes existed.
    //
    // Rounding to whole hours at issue meant a 40-minute course certified "0
    // hours", and the document then hid the line entirely because 0 is falsy —
    // which is why short courses printed with nothing where the duration goes.
    // Deliberately no default: an absent value means "issued before this field
    // existed", which is what the read-time backfill looks for. A default of 0
    // would hydrate old records as a real zero and they'd never be repaired.
    minutes: { type: Number },
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

// One certificate per learner per thing certified.
//
// PARTIAL, not sparse. A compound sparse index still indexes a document when
// ANY of its keys is present, and `user` always is: two path certificates for
// the same learner would both index as {user, course: null} and the second
// would fail on a duplicate key. `$type` rather than `$exists` because an
// explicit null exists.
certificateSchema.index(
  { user: 1, course: 1 },
  { unique: true, name: 'user_course_unique', partialFilterExpression: { course: { $type: 'objectId' } } },
);
certificateSchema.index(
  { user: 1, program: 1 },
  { unique: true, name: 'user_program_unique', partialFilterExpression: { program: { $type: 'objectId' } } },
);

// What /verify returns to an unauthenticated caller. Deliberately minimal,
// enough to confirm the claim, nothing more about the person.
certificateSchema.methods.toVerification = function toVerification() {
  return {
    credentialId: this.credentialId,
    recipientName: this.recipientName,
    title: this.title,
    issuedAt: this.issuedAt,
    minutes: this.minutes,
    hours: this.hours,
    issuerName: this.issuerName,
    valid: !this.revokedAt,
    revokedAt: this.revokedAt ?? null,
  };
};

export const Certificate = mongoose.model('Certificate', certificateSchema);
