import mongoose from 'mongoose';

// A lesson a learner has marked to come back to (L3).
//
// Same shape rules as Note: the lesson and its course by reference, never their
// titles, so a rename reaches every bookmark rather than none of them.
//
// The difference from a note is what `at` means. A note's timestamp is where it
// was written; a bookmark's is the thing itself — "this moment, in this video".
// A bookmark with no `at` marks the lesson as a whole, which is the only form a
// document or quiz lesson can take.
const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },

    at: { type: Number, default: null },

    // What the learner called it. Optional: an unlabelled bookmark falls back to
    // the lesson's own title when it is read.
    label: { type: String, trim: true, default: '', maxlength: 200 },
  },
  { timestamps: true },
);

bookmarkSchema.index({ user: 1, createdAt: -1 });

// One bookmark per moment. Marking the same second of the same lesson twice is
// a mis-click, not a second bookmark; marking two different moments in one
// lesson is legitimate, so the lesson alone is not the key.
bookmarkSchema.index({ user: 1, lesson: 1, at: 1 }, { unique: true });

export const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
