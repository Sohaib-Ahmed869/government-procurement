import mongoose from 'mongoose';

// A learner's position in one course (L3).
//
// One document per learner per course rather than one per lesson completion:
// the whole thing is read on every course screen, and a single document is one
// round trip instead of N.
const progressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },

    completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],

    // Resume position for video lessons, in seconds, keyed by lesson id.
    positions: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },

    lastLessonAt: { type: Date },
    lastLesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },

    // Minutes of completed lessons, kept as a running total so the dashboard
    // doesn't have to load every lesson to add them up.
    minutesLearned: { type: Number, default: 0 },
  },
  { timestamps: true },
);

progressSchema.index({ user: 1, course: 1 }, { unique: true });

export const Progress = mongoose.model('Progress', progressSchema);
