import mongoose from 'mongoose';

// A file attached to the assessment brief or the marking criteria. Stored the
// same way lesson documents are: the S3 key stays server-side, never a public
// URL — it is fetched through a signed-URL endpoint.
const attachmentSchema = new mongoose.Schema(
  {
    key: { type: String, default: '' },
    name: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    sizeBytes: { type: Number, default: 0 },
  },
  { timestamps: false },
);

// An option on a multiple-choice question. `correct` is the answer key and is
// stripped out before a learner ever sees the assessment (see
// getEntryAssessment) — only the authoring and grading views get it.
const optionSchema = new mongoose.Schema(
  {
    text: { type: String, default: '' },
    correct: { type: Boolean, default: false },
  },
);

const questionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    // 'written' asks for a text answer inline; 'file' asks the learner to
    // lodge a response document (e.g. a PPT) against this question; 'mcq' is
    // multiple-choice, scored automatically against `options` at submission
    // time instead of waiting on the instructor.
    type: { type: String, enum: ['written', 'file', 'mcq'], default: 'written' },
    options: { type: [optionSchema], default: [] }, // mcq only
    // A model answer or marking note for a written/file question — what the
    // instructor expects, kept for their own reference while grading. Same
    // rule as an mcq's answer key: stripped out before a learner ever sees
    // the assessment.
    referenceAnswer: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: false },
);

// The entry assessment an instructor sets on their course — one per course,
// shown to a learner before the rest of the content, per the brief in
// docs/GO-LIVE and the LMS entry-assessment feature.
const courseAssessmentSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, default: 'Entry assessment', trim: true },
    instructions: { type: String, default: '' },
    questions: { type: [questionSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] }, // e.g. a PPT brief
    markingCriteria: {
      text: { type: String, default: '' },
      attachments: { type: [attachmentSchema], default: [] },
    },
    // Whether a learner must pass this before the rest of the course unlocks.
    // Off by default so authoring one mid-course does not lock out existing
    // enrolments until the instructor is ready to enforce it.
    required: { type: Boolean, default: false },
    passScore: { type: Number, default: 50, min: 0, max: 100 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const CourseAssessment = mongoose.model('CourseAssessment', courseAssessmentSchema);
