import mongoose from 'mongoose';

// A learner's note against one lesson (L3).
//
// It stores the lesson and the course it belongs to, and NOT their titles. The
// title is resolved when the note is read, so renaming a lesson updates every
// note that points at it rather than leaving a stale copy behind in each one —
// which is what a denormalised title would do, silently, and only visibly to
// the learner who wrote the note months earlier.
//
// `course` is carried alongside `lesson` even though it can be derived from it.
// The notes page groups by course and would otherwise have to load every lesson
// to find out which course each note belongs to.
const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },

    body: { type: String, required: true, trim: true, maxlength: 5000 },

    // Where in a video the note was taken, in seconds. Null on anything that is
    // not a video — a note on a document has no moment to point at.
    at: { type: Number, default: null },
  },
  { timestamps: true },
);

// The notes page lists newest first for one learner, which is the only query
// this collection serves.
noteSchema.index({ user: 1, createdAt: -1 });

export const Note = mongoose.model('Note', noteSchema);
