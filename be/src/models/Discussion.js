import mongoose from 'mongoose';

/* Course discussion: the Q&A inside a course (L5).

   Deliberately NOT the existing Question model, despite both being "questions",
   and the difference is not cosmetic:

     Question       the public website forum. Anonymous submitters (name and
                    email, no account), one moderator answer, and a
                    Submitted → In Review → Approved → Published workflow before
                    anybody can read it.
     Discussion     inside a paid course. The author is an enrolled learner with
                    an account, replies are a thread rather than one answer, it
                    is visible to the class the moment it is posted, and the
                    person expected to answer is the course's own instructor.

   Folding these together would mean every website forum query carrying course
   and threading fields it never uses, every course query filtering out website
   questions, and — worst — a learner's question sitting invisible in a
   moderation queue while their cohort moves on. The inbox each one lands in is
   different too: site moderators for the forum, the course's instructor here.
*/

// One reply. Threaded one level deep on purpose: a reply-to-a-reply turns a
// question thread into a conversation, and the thing a learner opens the thread
// for is the answer.
const replySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    // Marked by whoever asked, or by the instructor. What "resolved" means.
    accepted: { type: Boolean, default: false },
    // WHO voted, not how many. A count can be incremented twice by the same
    // person; a set of ids cannot, and it is also what lets the server tell
    // each reader whether the vote showing is theirs.
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

const discussionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    // Set when the question was asked from inside a lesson, so an instructor
    // can see which part of the course prompted it.
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null },

    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },

    // Derived from the replies (an accepted one exists) rather than set by
    // hand, so it cannot claim to be answered with nothing marked.
    resolved: { type: Boolean, default: false, index: true },

    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies: { type: [replySchema], default: [] },

    // Kept as a field rather than derived on read: the list sorts by it, and
    // sorting by "the newest of a subdocument array" is not something an index
    // can help with.
    lastActivityAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

discussionSchema.index({ course: 1, lastActivityAt: -1 });
discussionSchema.index({ title: 'text', body: 'text' });

export const Discussion = mongoose.model('Discussion', discussionSchema);
