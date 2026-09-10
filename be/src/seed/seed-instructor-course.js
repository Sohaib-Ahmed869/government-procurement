import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Course } from '../models/Course.js';
import { Module } from '../models/Module.js';
import { Lesson } from '../models/Lesson.js';
import { User } from '../models/User.js';
import { CONTENT_STATUS } from '../constants/statuses.js';
import { toSlug, uniqueSlug } from '../utils/slugify.js';

/* A small, complete course owned by one instructor, for testing the parts of
 * the LMS that only exist once somebody finishes something: completion ticks,
 * the up-next countdown, and the certificate.
 *
 *   node src/seed/seed-instructor-course.js --author=<email>
 *   node src/seed/seed-instructor-course.js --author=<email> --remove
 *
 * TEXT lessons and a QUIZ, deliberately — no video. A video lesson without an
 * uploaded file renders "No video has been uploaded for this lesson yet", which
 * is a dead end rather than something to test against, and seeding one would
 * mean inventing an S3 object that does not exist.
 *
 * Idempotent: it finds the course by slug and leaves an existing one alone, so
 * running it twice does not litter the database with copies.
 */
const args = process.argv.slice(2);
const emailArg = args.find((a) => a.startsWith('--author='));
const AUTHOR_EMAIL = emailArg ? emailArg.split('=')[1] : '';
const REMOVE = args.includes('--remove');

const TITLE = 'Procurement Fundamentals: A Short Course';

const MODULES = [
  {
    title: 'What procurement is for',
    lessons: [
      {
        kind: 'text',
        title: 'The three questions every procurement answers',
        minutes: 6,
        body: [
          'Procurement exists to answer three questions, in order: what does the organisation actually need, what is the best way to get it, and can the decision be defended afterwards.',
          '',
          'The first is a requirements question and belongs to the business. The second is a market question and belongs to procurement. The third belongs to both, and it is the one most often left until it is too late to answer well.',
          '',
          'A process that answers the first two and neglects the third produces contracts that work and records that do not — which is the same as a contract that cannot be justified when somebody asks.',
        ].join('\n'),
      },
      {
        kind: 'text',
        title: 'Value for money is not the lowest price',
        minutes: 7,
        body: [
          'Value for money weighs cost against fitness, risk, timing, capability and the cost of getting it wrong. Price is one dimension of six, and it is the easiest to measure, which is exactly why it crowds the others out.',
          '',
          'A supplier who is eight per cent dearer but can start two weeks earlier, with a record of delivering at this scale, may be the better value even though the spreadsheet says otherwise. What matters is that the reasoning is written down at the time, not reconstructed later.',
        ].join('\n'),
      },
    ],
  },
  {
    title: 'Making it defensible',
    lessons: [
      {
        kind: 'text',
        title: 'The record is part of the work',
        minutes: 6,
        body: [
          'A decision is defensible when someone who was not there can follow it: what was needed, what was considered, what was chosen and why the alternatives were not.',
          '',
          'That record is written while the decision is being made. Written afterwards it is a reconstruction, and a reconstruction is what an audit is designed to detect.',
        ].join('\n'),
      },
      {
        kind: 'quiz',
        title: 'Check: fundamentals',
        minutes: 10,
        quiz: {
          // 100%, matching the platform rule.
          passMark: 100,
          timeLimitMins: 10,
          questions: [
            {
              type: 'single',
              prompt: 'Value for money is best described as:',
              options: [
                { id: 'a', text: 'The lowest compliant price' },
                { id: 'b', text: 'Cost weighed against fitness, risk, timing and capability' },
                { id: 'c', text: 'The price agreed after negotiation' },
              ],
              correct: ['b'],
              explanation:
                'Price is one dimension of several. Judging on price alone is a one-dimensional answer to a question that has at least six sides.',
            },
            {
              type: 'single',
              prompt: 'When should the reasoning behind a decision be recorded?',
              options: [
                { id: 'a', text: 'While the decision is being made' },
                { id: 'b', text: 'At the end of the financial year' },
                { id: 'c', text: 'Only if the decision is later questioned' },
              ],
              correct: ['a'],
              explanation:
                'Written afterwards it is a reconstruction, which is the thing an audit is built to spot.',
            },
            {
              type: 'boolean',
              prompt: 'Defining what the organisation needs is primarily the business’s responsibility.',
              options: [
                { id: 'true', text: 'True' },
                { id: 'false', text: 'False' },
              ],
              correct: ['true'],
              explanation:
                'Requirements belong to the business; how to go to market belongs to procurement. Blurring the two is where accountability goes missing.',
            },
          ],
        },
      },
    ],
  },
];

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
      const mods = await Module.find({ course: existing._id }).select('_id').lean();
      const lessons = await Lesson.deleteMany({ course: existing._id });
      await Module.deleteMany({ course: existing._id });
      await Course.deleteOne({ _id: existing._id });
      console.log(`Removed the course, ${mods.length} modules and ${lessons.deletedCount} lessons.`);
    }
    await mongoose.disconnect();
    return;
  }

  if (existing) {
    console.log(`Already seeded: "${TITLE}" (${existing.slug}). Nothing written.`);
    await mongoose.disconnect();
    return;
  }

  const totalMinutes = MODULES.flatMap((m) => m.lessons).reduce((s, l) => s + l.minutes, 0);

  const course = await Course.create({
    title: TITLE,
    slug: await uniqueSlug(Course, toSlug(TITLE)),
    author: author._id,
    summary:
      'What procurement is for, how value for money is actually judged, and why the record is part of the work rather than paperwork after it.',
    level: 'beginner',
    segment: 'general',
    // Published, so it can be enrolled in and finished — which is the point of
    // seeding it. Review status matches: an admin approving it is the normal
    // route to this state, and leaving it half-set would show the author a
    // banner asking them to submit a course that is already live.
    status: CONTENT_STATUS.PUBLISHED,
    reviewStatus: 'approved',
    availability: 'open',
    price: 0,
    currency: 'AUD',
    durationLabel: `${Math.round(totalMinutes)} minutes`,
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
      // eslint-disable-next-line no-await-in-loop
      await Lesson.create({ ...l, course: course._id, module: mod._id, order: li });
      created += 1;
    }
  }

  console.log(`Created "${course.title}"`);
  console.log(`  slug     : ${course.slug}`);
  console.log(`  author   : ${author.name} <${author.email}>`);
  console.log(`  modules  : ${MODULES.length}`);
  console.log(`  lessons  : ${created} (${created - 1} text, 1 quiz at 100% to pass)`);
  console.log(`  open at  : /learn/courses/${course.slug}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
