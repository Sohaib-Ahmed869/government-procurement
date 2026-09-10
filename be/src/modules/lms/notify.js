import { User } from '../../models/User.js';
import { Notification, NOTIFICATION_KINDS } from '../../models/Notification.js';
import { sendMail } from '../../utils/mailer.js';
import { renderEmail } from '../../utils/emailTemplate.js';
import { env, siteUrl } from '../../config/env.js';

/* ---------------------------------------------------------------------------
   Who gets told when something happens in a course discussion, and how.

   Kept out of discussions.controller.js on purpose. That file's job is the
   thread — who may read it, who may post, what "resolved" means. Fanning a post
   out to the people who care about it is a different question, and the moment a
   second thing needs notifying (a live session moved, an enrolment landed) it
   would be the second copy of this logic rather than the first.

   TWO CHANNELS, ONE DECISION. The in-app row and the email are the same event
   with different delivery, but they are separately consented to: the settings
   screen has a toggle for each. So each recipient is resolved once and then
   asked twice.
   ------------------------------------------------------------------------ */

/* The recipient set is EXACTLY what the settings screen promises, no wider:

     "Replies to your questions — when someone answers a discussion you started"
     "Questions on your courses — when a learner asks or replies in a discussion
      on a course you teach"

   So: whoever asked, and whoever teaches. Notably NOT everyone else who has
   replied in the thread. Someone who answered a question would plausibly want
   to know the asker came back — but nobody has consented to that, there is no
   toggle to turn it off, and a busy thread would mail its whole cast on every
   post. If that becomes wanted it needs its own preference first. */

// Preference keys, as written on the settings screen (see
// fe/src/lms/pages/dashboard/AccountSettingsPage.jsx).
const PREF = {
  IN_APP: 'inAppDiscussion',
  EMAIL_REPLY: 'emailDiscussionReplies',
  EMAIL_QUESTION: 'emailCourseQuestions',
};

/* Unset means ON, matching the client, which reads these as `!== false`. A
   learner who has never opened the settings screen has an empty settings map,
   and defaulting that to silence would mean the feature is off for everyone who
   has not explicitly turned it on.

   Read through both shapes: `settings` is a Map on a hydrated document and a
   plain object once anything upstream has called .lean(). */
function wants(user, key) {
  const settings = user?.settings;
  if (!settings) return true;
  const value = typeof settings.get === 'function' ? settings.get(key) : settings[key];
  return value !== false;
}

// Where a thread lives in the client. One place, because it is about to be
// written into emails that outlive this deploy.
const threadUrl = (threadId) =>
  `${siteUrl()}/learn/discussions/${threadId}`;

/* Best-effort, and deliberately NOT awaited by the request that triggered it.

   A reply is saved the moment the learner presses post; making them wait on an
   SMTP handshake to see their own words appear is the wrong trade. The in-app
   rows ARE awaited (below) because they are a local write and the bell should
   be right on the very next poll. */
function email({ to, subject, lines, threadId }) {
  const url = threadUrl(threadId);
  const body = lines.filter(Boolean);
  const cta = 'Read the thread';

  sendMail({
    to,
    subject,
    ...renderEmail({
      heading: subject,
      paragraphs: body,
      cta: { label: cta, url },
      preheader: body[0] || subject,
    }),
  }).catch(() => {
    /* A notification that failed to send must not take the reply down with it.
       mailer.js already falls back to logging when SMTP is unconfigured, so
       reaching here means a real send failed. */
  });
}

/* One post, fanned out.

   `recipients` carries the EMAIL PREFERENCE AND COPY PER PERSON, not per event,
   because the same reply reaches two people under two different consents: the
   asker set "replies to your questions", the instructor set "questions on your
   courses". Resolving that per event instead — one pass for the asker, another
   for the instructor — is how the instructor ends up with two rows and two
   emails for a single reply when they are also the one who asked. */
async function notifyDiscussion({ recipients, kind, actor, thread, course }) {
  // First spec wins per person, so someone who is both the asker and the
  // course's author is told once, under the preference listed first.
  const wanted = new Map();
  for (const r of recipients) {
    if (!r?.id) continue;
    const id = String(r.id);
    // Replying to your own thread, or asking on a course you teach, is not news
    // to you.
    if (id === String(actor._id)) continue;
    if (!wanted.has(id)) wanted.set(id, r);
  }
  if (!wanted.size) return;

  // `active: true` filters deactivated accounts even though the field is
  // select:false — a projection does not affect what a query matches.
  const users = await User.find({ _id: { $in: [...wanted.keys()] }, active: true })
    .select('name email settings');

  const rows = [];
  for (const user of users) {
    const spec = wanted.get(String(user._id));
    if (!spec) continue;

    if (wants(user, PREF.IN_APP)) {
      rows.push({
        user: user._id,
        kind,
        actorName: actor.name,
        discussion: thread._id,
        course: course._id,
        subject: thread.title,
        context: course.title,
      });
    }

    if (user.email && wants(user, spec.emailPref)) {
      email({
        to: user.email,
        subject: spec.subject,
        lines: spec.lines,
        threadId: thread._id,
      });
    }
  }

  if (rows.length) await Notification.insertMany(rows);
}

// Somebody replied. The asker is told, and so is whoever teaches the course —
// an unanswered question is the instructor's queue, and a learner answering it
// is exactly the thing that clears it.
export async function notifyDiscussionReply({ thread, course, actor }) {
  const askerId = thread.author?._id ?? thread.author;

  await notifyDiscussion({
    kind: NOTIFICATION_KINDS.DISCUSSION_REPLY,
    actor,
    thread,
    course,
    // The asker is listed first, so an instructor who asked the question hears
    // about it as the person who asked rather than as the person who teaches.
    recipients: [
      {
        id: askerId,
        emailPref: PREF.EMAIL_REPLY,
        subject: `${actor.name} replied to "${thread.title}"`,
        lines: [`${actor.name} replied to <strong>${thread.title}</strong> in ${course.title}.`],
      },
      {
        id: course.author,
        emailPref: PREF.EMAIL_QUESTION,
        subject: `New reply on "${thread.title}"`,
        lines: [
          `${actor.name} replied to <strong>${thread.title}</strong> on your course ${course.title}.`,
        ],
      },
    ],
  });
}

// A new question. Only the instructor is told: nobody else has asked to hear
// about it, and the learner who wrote it already knows.
export async function notifyDiscussionQuestion({ thread, course, actor }) {
  await notifyDiscussion({
    kind: NOTIFICATION_KINDS.DISCUSSION_QUESTION,
    actor,
    thread,
    course,
    recipients: [
      {
        id: course.author,
        emailPref: PREF.EMAIL_QUESTION,
        subject: `${actor.name} asked a question on ${course.title}`,
        lines: [
          `${actor.name} asked <strong>${thread.title}</strong> on your course ${course.title}.`,
          thread.body,
        ],
      },
    ],
  });
}
