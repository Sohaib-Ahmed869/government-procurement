import mongoose from 'mongoose';

/* A learner's review of a course (L5).

   Three rules live on this model rather than in the screens that write to it,
   because a review is public and carries weight in the catalogue:

     · one per person per course — enforced by the unique index below, not by a
       check-then-insert in the controller, which races with itself
     · the rating is required and the prose is not. Most people will rate;
       forcing prose is how you end up with a corpus of "good"
     · enrolment and progress are checked on write (see the controller). A
       review from somebody who never took the course is worth nothing to the
       next person reading it.
*/
const reviewSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: '', trim: true },
    body: { type: String, default: '' },
  },
  { timestamps: true },
);

// The real guard on "one review per course".
reviewSchema.index({ course: 1, user: 1 }, { unique: true });
// The catalogue reads newest-first per course.
reviewSchema.index({ course: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);
