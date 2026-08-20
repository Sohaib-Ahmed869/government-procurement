import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';
import { CERTIFICATE_DEFAULTS } from './Course.js';

/* ---------------------------------------------------------------------------
   A learning path (LMS 8.0). A CURATION of courses, not a container of new
   content.

   Every step points at a Course that stands on its own in the catalogue. That
   is the decision the whole model rests on, and it buys three things:

     · a course can sit in several paths without being copied, so fixing a
       typo fixes it everywhere;
     · a learner who finished a course last year gets credit for it the moment
       they start a path containing it, because it is the same Enrollment and
       the same Progress record;
     · enrolment gating, quizzes, discussions and course certificates all keep
       working untouched, since they are keyed on the course underneath.

   The alternative, giving a path its own lessons, would fork every one of
   those systems and make prior completion impossible to honour.
   ------------------------------------------------------------------------ */

// One course in the path, with its prerequisites.
//
// `requires` names OTHER STEPS' courses, so a path can be a sequence, a set of
// parallel tracks, or a flat menu, without the model choosing for the author.
// An empty `requires` is a step open from the start.
const stepSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    order: { type: Number, default: 0 },
    // An elective counts toward the path but is not needed to complete it.
    // Without this an author cannot offer a choice, only a checklist.
    required: { type: Boolean, default: true },
    requires: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  },
  { _id: true },
);

const programSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String, default: '' },
    // Long description, rich text. Sanitised on write like a course body.
    body: { type: String, default: '' },

    // Which colour ramp the card uses, matching how the catalogue tints
    // courses. An index rather than a hex, so the site's palette stays the
    // site's decision.
    accent: { type: Number, default: 0, min: 0 },

    steps: { type: [stepSchema], default: [] },

    // Who wrote it. Always set: unlike Course, a path has no CMS-authored
    // legacy to stay compatible with.
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Identical workflow to Course, deliberately. A path reaches the public
    // site the same way a course does, so it is reviewed the same way and an
    // admin does not have to learn a second set of states.
    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.DRAFT, index: true },
    publishedAt: { type: Date },
    reviewStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected', 'declined'],
      default: 'none',
      index: true,
    },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, default: '' },

    // The path's own certificate, separate from the certificates of the courses
    // inside it. A learner finishing the path holds both, and they say different
    // things: one that they completed a course, one that they completed the
    // program. Same shape as Course.certificate so the builder and the preview
    // are literally the same components.
    certificate: {
      enabled: { type: Boolean, default: true },
      heading: { type: String, default: 'Certificate of Achievement' },
      preamble: { type: String, default: 'This is to certify that' },
      statement: { type: String, default: 'has successfully completed the program' },
      footnote: { type: String, default: '' },
      issuerName: { type: String, default: 'Government Procurement' },
      signatoryName: { type: String, default: '' },
      signatoryRole: { type: String, default: '' },
      accent: { type: String, default: '#0a3114' },
      background: { type: String, default: '#ffffff' },
      textColor: { type: String, default: '#1a1a1a' },
      showHours: { type: Boolean, default: true },
      showCredentialId: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

programSchema.index({ title: 'text', summary: 'text' });

// A path's wording starts from the same defaults a course's does, with the two
// lines that talk about a course replaced. Kept beside the schema so the
// builder's "reset to default" and the schema cannot drift.
export const PROGRAM_CERTIFICATE_DEFAULTS = {
  ...CERTIFICATE_DEFAULTS,
  heading: 'Certificate of Achievement',
  statement: 'has successfully completed the program',
};

// A path an instructor is still writing and has never submitted, matching the
// rule courses already follow (see UNSUBMITTED_INSTRUCTOR_DRAFT in Course.js).
// Their workspace until they press Submit, so it stays out of staff listings.
export const UNSUBMITTED_PROGRAM_DRAFT = {
  reviewStatus: 'none',
  submittedAt: null,
  status: { $ne: CONTENT_STATUS.PUBLISHED },
};

export const Program = mongoose.model('Program', programSchema);
