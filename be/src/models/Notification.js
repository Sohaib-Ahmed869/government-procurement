import mongoose from 'mongoose';

/* An in-app notification (R2), as a stored record.

   The bell used to DERIVE its contents entirely on the client: fetch every
   discussion thread, every enrolment and every authored course, then work out
   what looked like news (see fe/src/lms/hooks/useNotifications.js). That has a
   real virtue — nothing can be notified about that isn't already true in the
   data — but three things it could not do:

     · read state lived in localStorage, so a notification dismissed on a laptop
       was still unread on a phone, and dismissing it on either was invisible to
       the other. The same complaint that moved profile settings onto the User
       record applies here;
     · it could only notice what the reader was already able to fetch. That is
       why an INSTRUCTOR was never told a question was waiting: nothing they
       poll says "this arrived while you were away", it only says what exists;
     · nothing could be emailed, because there was no moment to hang a send off.
       A page working out after the fact that something happened is not an
       event. The settings screen has offered "Replies to your questions" and
       "Questions on your courses" toggles the whole time, and neither has ever
       sent anything.

   So the fact is written down when it happens. What is deliberately NOT written
   down is the sentence: `title` and `detail` are rendered at read time by
   toItem() from the fields below, because a notification is a pointer to a
   thing and the thing is the truth. Storing the rendered line would mean two
   copies of it to keep in step.

   The names ARE snapshotted, for the same reason Certificate snapshots its
   recipient: "Priya replied to your question" is a statement about a moment,
   and it should not silently become somebody else's name — or an extra populate
   per row — because an account was renamed or deleted since.
*/

export const NOTIFICATION_KINDS = {
  // Somebody replied to a thread you started.
  DISCUSSION_REPLY: 'discussion-reply',
  // A learner asked a question on a course you teach.
  DISCUSSION_QUESTION: 'discussion-question',
};

const notificationSchema = new mongoose.Schema(
  {
    // WHO IS TOLD. Not who caused it — one reply writes a row per recipient, so
    // the asker and the instructor can read and dismiss theirs independently.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    kind: {
      type: String,
      enum: Object.values(NOTIFICATION_KINDS),
      required: true,
    },

    // Who caused it, as it read at the time. See the note above on snapshots.
    actorName: { type: String, default: '' },

    // What it points at. Kept as references so a dead link can be detected
    // rather than guessed at from a stored URL.
    discussion: { type: mongoose.Schema.Types.ObjectId, ref: 'Discussion', index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },

    // The two lines the row reads under its title: the thread, and the course
    // it sits in. Snapshotted alongside the refs above.
    subject: { type: String, default: '' },
    context: { type: String, default: '' },

    // Null until read. A date rather than a boolean because "when" is free to
    // keep here and impossible to recover later.
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The bell reads one person's rows newest-first, and counts their unread ones.
// Both are this index.
notificationSchema.index({ user: 1, createdAt: -1 });

/* The shape the client contract already uses. It is the same object the derived
   items in useNotifications.js produce, so the two can sit in one list while the
   remaining derived kinds (study reminders, review decisions) are still
   computed client-side. */
const COPY = {
  [NOTIFICATION_KINDS.DISCUSSION_REPLY]: {
    icon: 'chat',
    title: (n) => `${n.actorName || 'Someone'} replied to your question`,
  },
  [NOTIFICATION_KINDS.DISCUSSION_QUESTION]: {
    icon: 'chat',
    title: (n) => `${n.actorName || 'Someone'} asked a question on your course`,
  },
};

notificationSchema.methods.toItem = function toItem() {
  const copy = COPY[this.kind] ?? { icon: 'bell', title: () => 'Something happened' };
  return {
    id: String(this._id),
    kind: 'discussion',
    icon: copy.icon,
    at: this.createdAt,
    title: copy.title(this),
    detail: this.subject,
    context: this.context,
    to: this.discussion ? `/learn/discussions/${this.discussion}` : null,
    read: Boolean(this.readAt),
  };
};

export const Notification = mongoose.model('Notification', notificationSchema);
