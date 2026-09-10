import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Course } from '../models/Course.js';
import { Module } from '../models/Module.js';
import { Lesson } from '../models/Lesson.js';
import { User } from '../models/User.js';
import { CONTENT_STATUS } from '../constants/statuses.js';
import { toSlug, uniqueSlug } from '../utils/slugify.js';
import { uploadBuffer } from '../config/s3.js';
import { s3Configured } from '../config/env.js';

/* One course carrying ONE OF EVERY LESSON KIND, for walking the whole learner
 * journey in a single sitting: text, document, uploaded video, YouTube embed
 * and a quiz.
 *
 *   node src/seed/seed-mixed-course.js --author=<email>
 *   node src/seed/seed-mixed-course.js --author=<email> --remove
 *
 * Ordered so each behaviour has somewhere to go:
 *   text  -> doc      Next stays shut until the text has been read to the end
 *   doc   -> video    same gate
 *   video -> youtube  playing out marks it done and counts down INTO module 2
 *   youtube -> quiz   the embed does the same, and lands on the quiz
 *   quiz              last, so passing it finishes the course and issues the
 *                     certificate
 *
 * The document is fetched and uploaded to the bucket (see DOC_SOURCE_URL). The
 * VIDEO cannot be: there is no sample video worth pulling down, so it points at
 * an S3 object that is already there — the same key an existing lesson uses.
 * Seeding a video lesson with no file renders "No video has been uploaded for
 * this lesson yet", which is a dead end rather than something to test against.
 * Two lessons sharing one object is fine: playback signs whatever key the
 * lesson holds, and nothing about it is per-course. Pass --video-key=... to use
 * a different one, or leave it and the script finds a key for itself.
 *
 * Idempotent: finds the course by title and author and leaves an existing one
 * alone, so running it twice does not litter the database with copies.
 */
const args = process.argv.slice(2);
const arg = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : '';
};

const AUTHOR_EMAIL = arg('author');
const VIDEO_KEY = arg('video-key');
const REMOVE = args.includes('--remove');

const TITLE = 'Every Lesson Type: A Walkthrough Course';

// 19 seconds, and one of the most widely embedded clips there is. Chosen for
// its LENGTH, not its subject: the point is to reach the end of a YouTube
// lesson without sitting through ten minutes of it, so the completion tick and
// the up-next countdown can be seen. Swap it in the course builder for
// something real once the behaviour has been checked.
const YOUTUBE_ID = 'jNQXAC9IVRw';

/* The document lesson's file.
 *
 * Fetched and UPLOADED to the bucket, so the lesson carries a key rather than a
 * link. That is the real product path — a private file served on an expiring
 * signed URL, gated on the enrolment — and it is also the only one the in-page
 * reader can draw: a PDF on somebody else's domain refuses the cross-origin
 * read the viewer needs, falls back to a plain embed, and the "scroll to the
 * end before you can continue" rule cannot be checked through an embed.
 *
 * Several pages long on purpose, so there is something to scroll.
 *
 * With no bucket configured it falls back to linking the same file, which still
 * renders — just in the embed, without the gate. */
const DOC_SOURCE_URL = 'https://css4.pub/2015/textbook/somatosensory.pdf';
const DOC_NAME = 'Sample document.pdf';

const MODULES = [
  {
    title: 'Reading',
    lessons: [
      {
        kind: 'text',
        title: 'How this course is put together',
        minutes: 5,
        body: [
          'This course exists to be walked end to end. It carries one lesson of every kind the platform supports, in the order you would meet them: something to read, a document to open, a video to watch, an embedded video, and a quiz that decides whether you finish.',
          '',
          'Two things are worth watching as you go. The first is the Next button at the foot of each screen: on a reading lesson it stays shut until the end of the text has actually been on screen, so scroll to the bottom of this page before you look for it.',
          '',
          'The second is what happens when a video runs out. It does not stop on a dead frame. The lesson records itself as finished and offers you the next one on a five-second countdown, which you can take or refuse.',
          '',
          'Nothing here asks you to declare that you have finished a lesson. Finishing it is what marks it — reading to the end, watching to the end, or pressing Next on the way out. The ticks in the rail on the right should follow you without being told.',
        ].join('\n'),
      },
      {
        kind: 'doc',
        title: 'A document to open',
        minutes: 4,
        // `document` is filled in by main(), from the upload below. No summary:
        // the reader is the lesson, and a note above it explaining what a
        // document lesson is was describing the furniture rather than the room.
        docSummary: '',
      },
    ],
  },
  {
    title: 'Watching, and a check',
    lessons: [
      {
        kind: 'video',
        title: 'An uploaded video',
        minutes: 2,
        // `video.key` is filled in by main(), from --video-key or from an
        // existing lesson. A literal here would rot the moment the bucket did.
      },
      {
        kind: 'youtube',
        title: 'An embedded video',
        minutes: 1,
        youtube: {
          videoId: YOUTUBE_ID,
          startSeconds: 0,
          note: 'Let it play out. An embed finishes the same way an uploaded video does: the lesson ticks itself off and the countdown offers you the quiz.',
        },
      },
      {
        kind: 'quiz',
        title: 'Check: what you should have seen',
        minutes: 5,
        quiz: {
          // Every question right, matching the platform rule.
          passMark: 100,
          timeLimitMins: 0,
          questions: [
            {
              type: 'single',
              prompt: 'On a reading lesson, when does the Next button become available?',
              options: [
                { id: 'a', text: 'Straight away' },
                { id: 'b', text: 'Once the end of the text has been on screen' },
                { id: 'c', text: 'After five minutes on the page' },
              ],
              correct: ['b'],
              explanation:
                'The end of the lesson body is watched for. Reaching it is what opens the way forward.',
            },
            {
              type: 'single',
              prompt: 'What happens when a video plays to its end?',
              options: [
                { id: 'a', text: 'Nothing, until you press Next' },
                { id: 'b', text: 'The lesson is marked complete and the next one is offered on a countdown' },
                { id: 'c', text: 'The next video plays automatically' },
              ],
              correct: ['b'],
              explanation:
                'It records the lesson and offers the next one. It does not chain autoplay — the next lesson decides for itself whether to play.',
            },
            {
              type: 'boolean',
              prompt: 'An embedded YouTube lesson behaves the same way at the end as an uploaded one.',
              options: [
                { id: 'true', text: 'True' },
                { id: 'false', text: 'False' },
              ],
              correct: ['true'],
              explanation:
                'Both mark the lesson complete and start the countdown. They are different players; they are the same promise.',
            },
          ],
        },
      },
    ],
  },
];

async function resolveVideoKey() {
  if (VIDEO_KEY) return { key: VIDEO_KEY, name: 'Lesson video.mp4', borrowedFrom: null };

  // Any lesson that already has a file. Newest first, on the assumption that
  // the most recently uploaded object is the one most likely still to be there.
  const donor = await Lesson.findOne({ 'video.key': { $nin: ['', null] } })
    .sort({ updatedAt: -1 })
    .select('title video')
    .lean();

  if (!donor) return null;
  return {
    key: donor.video.key,
    name: donor.video.name || 'Lesson video.mp4',
    mimeType: donor.video.mimeType || 'video/mp4',
    durationSeconds: donor.video.durationSeconds || 0,
    borrowedFrom: donor.title,
  };
}

async function resolveDocument() {
  let res;
  try {
    res = await fetch(DOC_SOURCE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.warn(`Could not fetch the sample document (${err.message}). Linking it instead.`);
    return { url: DOC_SOURCE_URL, name: DOC_NAME, mimeType: 'application/pdf', uploaded: false };
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  if (!s3Configured) {
    console.warn('No bucket configured, so the document is linked rather than uploaded.');
    return { url: DOC_SOURCE_URL, name: DOC_NAME, mimeType: 'application/pdf', uploaded: false };
  }

  try {
    const up = await uploadBuffer({
      buffer,
      mimeType: 'application/pdf',
      folder: 'lms/doc',
      originalName: DOC_NAME,
    });
    return {
      key: up.key,
      name: DOC_NAME,
      mimeType: 'application/pdf',
      sizeBytes: buffer.length,
      uploaded: true,
    };
  } catch (err) {
    console.warn(`Upload failed (${err.message}). Linking the document instead.`);
    return { url: DOC_SOURCE_URL, name: DOC_NAME, mimeType: 'application/pdf', uploaded: false };
  }
}

async function main() {
  if (!AUTHOR_EMAIL) {
    console.error('Pass --author=<email>. The course is owned by that account.');
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);

  const author = await User.findOne({ email: AUTHOR_EMAIL.toLowerCase() });
  if (!author) {
    console.error(`No account with the email ${AUTHOR_EMAIL}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const existing = await Course.findOne({ title: TITLE, author: author._id });

  if (REMOVE) {
    if (!existing) {
      console.log('Nothing to remove.');
    } else {
      const mods = await Module.countDocuments({ course: existing._id });
      const lessons = await Lesson.deleteMany({ course: existing._id });
      await Module.deleteMany({ course: existing._id });
      await Course.deleteOne({ _id: existing._id });
      console.log(`Removed the course, ${mods} modules and ${lessons.deletedCount} lessons.`);
    }
    await mongoose.disconnect();
    return;
  }

  if (existing) {
    console.log(`Already seeded: "${TITLE}" (${existing.slug}). Nothing written.`);
    console.log(`  open at  : /learn/courses/${existing.slug}`);
    await mongoose.disconnect();
    return;
  }

  const docSource = await resolveDocument();
  const videoSource = await resolveVideoKey();
  if (!videoSource) {
    console.error(
      'No lesson in the database has an uploaded video, so there is no key to point the video lesson at.',
    );
    console.error('Upload one through the course builder, or pass --video-key=<s3 key>.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const totalMinutes = MODULES.flatMap((m) => m.lessons).reduce((s, l) => s + l.minutes, 0);

  const course = await Course.create({
    title: TITLE,
    slug: await uniqueSlug(Course, toSlug(TITLE)),
    author: author._id,
    summary:
      'One lesson of every kind the platform supports — reading, a document, an uploaded video, an embedded video and a quiz — in the order a learner meets them.',
    level: 'beginner',
    segment: 'general',
    // Published and approved, so it can be enrolled in and finished, which is
    // the whole point of seeding it. Leaving the review status half-set would
    // show the author a banner asking them to submit a course already live.
    status: CONTENT_STATUS.PUBLISHED,
    reviewStatus: 'approved',
    availability: 'open',
    price: 0,
    currency: 'AUD',
    durationLabel: `${totalMinutes} minutes`,
    instructor: { name: author.name, role: 'Instructor' },
    certificate: {
      enabled: true,
      heading: 'Certificate of Completion',
      issuerName: 'Government Procurement',
      signatoryName: author.name,
      signatoryRole: 'Instructor',
      signaturePosition: 'left',
    },
  });

  let created = 0;
  for (const [mi, m] of MODULES.entries()) {
    // eslint-disable-next-line no-await-in-loop
    const mod = await Module.create({ course: course._id, title: m.title, order: mi });
    for (const [li, l] of m.lessons.entries()) {
      const doc = { ...l, course: course._id, module: mod._id, order: li };
      if (doc.kind === 'doc') {
        const { docSummary } = doc;
        delete doc.docSummary;
        doc.document = {
          key: docSource.key ?? '',
          url: docSource.url ?? '',
          name: docSource.name,
          mimeType: docSource.mimeType,
          sizeBytes: docSource.sizeBytes ?? 0,
          summary: docSummary,
        };
      }
      if (doc.kind === 'video') {
        doc.video = {
          key: videoSource.key,
          name: videoSource.name,
          mimeType: videoSource.mimeType ?? 'video/mp4',
          durationSeconds: videoSource.durationSeconds ?? 0,
        };
      }
      // eslint-disable-next-line no-await-in-loop
      await Lesson.create(doc);
      created += 1;
    }
  }

  console.log(`Created "${course.title}"`);
  console.log(`  slug     : ${course.slug}`);
  console.log(`  author   : ${author.name} <${author.email}>`);
  console.log(`  modules  : ${MODULES.length}`);
  console.log(`  lessons  : ${created} (text, doc, video, youtube, quiz)`);
  console.log(`  price    : free`);
  console.log(`  document : ${docSource.uploaded ? `uploaded (${docSource.key})` : `linked (${docSource.url})`}`);
  if (videoSource.borrowedFrom) {
    console.log(`  video    : reusing the file from "${videoSource.borrowedFrom}"`);
  }
  console.log(`  open at  : /learn/courses/${course.slug}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
