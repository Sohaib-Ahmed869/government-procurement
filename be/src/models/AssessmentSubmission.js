import mongoose from 'mongoose';

// A-F letter grades from a percentage score. Fixed bands rather than
// per-instructor configuration: the brief asks for "the A-F international /
// Australia scheme", a single shared scale a certificate or transcript can
// read consistently across every course.
export const GRADE_BANDS = [
  { min: 85, grade: 'A' },
  { min: 75, grade: 'B' },
  { min: 65, grade: 'C' },
  { min: 50, grade: 'D' },
  { min: 0, grade: 'F' },
];

export function gradeForScore(score) {
  const band = GRADE_BANDS.find((b) => score >= b.min);
  return band ? band.grade : 'F';
}

const fileSchema = new mongoose.Schema(
  {
    key: { type: String, default: '' },
    name: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    sizeBytes: { type: Number, default: 0 },
  },
  { timestamps: false },
);

// A learner's lodgement against a course's entry assessment. One per learner
// per course — resubmitting overwrites the previous lodgement and clears any
// prior grade, since it is a new answer waiting to be marked, not a revision
// of the old one.
const assessmentSubmissionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseAssessment',
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    answers: [
      {
        question: { type: mongoose.Schema.Types.ObjectId, required: true },
        text: { type: String, default: '' },
        // The chosen option's _id, for an mcq question. Kept separate from
        // `text` so a written answer is never confused with a selection.
        selectedOption: { type: mongoose.Schema.Types.ObjectId },
        // Filled in at submission time for an mcq question, so both the
        // learner's own auto-graded result and the instructor's grading view
        // can show it without re-deriving it against a question that may
        // since have been edited.
        correct: { type: Boolean },
      },
    ],
    files: { type: [fileSchema], default: [] },

    // Auto-marked share of the submission (the mcq questions), separate from
    // the overall `score` below: with any written/file question also on the
    // assessment, the overall score still needs an instructor's mark, but the
    // mcq portion doesn't have to wait on them to see it.
    autoScore: { type: Number, min: 0, max: 100 },
    autoCorrect: { type: Number },
    autoTotal: { type: Number },

    // The academic-integrity tick box, required before a lodgement is
    // accepted. Kept as its own timestamp, separate from submittedAt, so the
    // record reads as "the learner affirmed this specifically" rather than
    // just "a form was posted".
    integrityAcknowledgedAt: { type: Date, required: true },
    submittedAt: { type: Date, default: Date.now },

    status: { type: String, enum: ['submitted', 'graded'], default: 'submitted', index: true },
    score: { type: Number, min: 0, max: 100 },
    grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'] },
    passed: { type: Boolean },
    // The instructor's overall comment on the submission, shown to the
    // learner alongside their grade.
    instructorComment: { type: String, default: '' },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
  },
  { timestamps: true },
);

assessmentSubmissionSchema.index({ course: 1, user: 1 }, { unique: true });

export const AssessmentSubmission = mongoose.model(
  'AssessmentSubmission',
  assessmentSubmissionSchema,
);
