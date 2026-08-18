import mongoose from 'mongoose';

// A chapter within a course (L1).
//
// Child-to-parent: the module points at its course rather than the course
// holding an array. That keeps Course.js untouched, and means adding a module
// is one insert instead of a read-modify-write on a growing document.
const moduleSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: '' },

    // Sparse integers so a reorder rewrites only the rows that moved.
    order: { type: Number, default: 0, index: true },

    // Drip scheduling (L4). Either an absolute date, or days after the learner
    // enrolled. The second is what most cohorts actually want, because it
    // works for someone who joins in week three.
    releaseAt: { type: Date },
    releaseAfterDays: { type: Number, min: 0 },
  },
  { timestamps: true },
);

moduleSchema.index({ course: 1, order: 1 });

export const Module = mongoose.model('Module', moduleSchema);
