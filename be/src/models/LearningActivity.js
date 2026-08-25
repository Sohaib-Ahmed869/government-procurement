import mongoose from 'mongoose';

// One learner, one day, one row (L3).
//
// Progress already carries `minutesLearned`, but only as a running total for a
// course — it cannot answer "how much did you study on Tuesday", which is what
// the dashboard's week strip and My Progress's activity chart are asking. Those
// two screens ran on a hardcoded fortnight of numbers because there was nothing
// to read.
//
// A row per day rather than a row per completion: the charts are always a sum
// over a day, and a learner who finishes twelve lessons in an evening should
// cost twelve increments of one document, not twelve documents. The day is
// stored as a `YYYY-MM-DD` string rather than a Date, deliberately — a Date
// makes "which day is this in" a timezone question every time it is read, and
// the answer this needs is the learner's local day, decided once at write time.
const learningActivitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Local calendar day, `YYYY-MM-DD`.
    day: { type: String, required: true },

    // Minutes of lessons completed on that day, and how many there were.
    minutes: { type: Number, default: 0 },
    lessons: { type: Number, default: 0 },

    // Quizzes submitted that day, so a day spent on assessment does not read as
    // a day off.
    quizzes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

learningActivitySchema.index({ user: 1, day: 1 }, { unique: true });

/* Adds to a learner's day, creating the row the first time.

   An upsert with $inc rather than read-modify-write: two lessons finished in the
   same second are two requests, and the read-modify-write version loses one of
   them. `setOnInsert` keeps the day on the document without fighting $inc for
   the same field.

   `day` is the caller's business — it comes from the request's own timezone
   offset (see the controller), because the server's day and the learner's day
   are not the same day for most of Australia's evening. */
learningActivitySchema.statics.record = function record({ user, day, minutes = 0, lessons = 0, quizzes = 0 }) {
  return this.updateOne(
    { user, day },
    { $inc: { minutes, lessons, quizzes }, $setOnInsert: { user, day } },
    { upsert: true },
  );
};

export const LearningActivity = mongoose.model('LearningActivity', learningActivitySchema);
