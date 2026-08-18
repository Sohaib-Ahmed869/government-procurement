import mongoose from 'mongoose';

// One sitting of a quiz (L3).
//
// The SERVER marks this. The answer key never leaves the database, so a learner
// cannot read the answers, and cannot post a score either. Only their answers.
const quizAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },

    // What they chose, per question. Kept alongside the score so an attempt can
    // be re-marked if a question's key is corrected later.
    answers: [
      {
        question: { type: mongoose.Schema.Types.ObjectId, required: true },
        given: { type: [String], default: [] },
        correct: { type: Boolean, default: false },
      },
    ],

    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
    passed: { type: Boolean, default: false, index: true },

    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: Date.now },
    // Seconds taken, for the item analysis the instructor page will show.
    durationSeconds: { type: Number, default: 0 },
  },
  { timestamps: true },
);

quizAttemptSchema.index({ user: 1, lesson: 1, submittedAt: -1 });

export const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
