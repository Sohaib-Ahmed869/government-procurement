import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Lesson } from '../models/Lesson.js';

/* Set the pass mark on every existing quiz.
 *
 * Changing the schema default only decides what a NEW quiz starts at. Quizzes
 * already saved carry whatever number they were created with — a course written
 * against the old 70% default, or a 67% that an author typed — and they keep
 * grading against it, so the learner still reads "You need 67% to pass" on a
 * platform whose rule is now every question right.
 *
 * Run it with the mark you want:
 *
 *   node src/scripts/set-pass-mark.js            # reports, changes nothing
 *   node src/scripts/set-pass-mark.js --apply    # sets every quiz to 100
 *   node src/scripts/set-pass-mark.js --apply --mark=70
 *
 * A dry run by default, and it prints the before/after spread either way, so
 * whoever runs it against production sees what it is about to touch first.
 *
 * Attempts already marked are NOT re-graded. A learner who passed at 67% has
 * passed: the attempt records the percentage and the verdict it was given at
 * the time, and retroactively failing somebody who holds a certificate would be
 * the worse of the two inconsistencies.
 */
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const markArg = args.find((a) => a.startsWith('--mark='));
const mark = markArg ? Number(markArg.split('=')[1]) : 100;

if (!Number.isFinite(mark) || mark < 0 || mark > 100) {
  console.error(`--mark must be between 0 and 100, got "${markArg}"`);
  process.exit(1);
}

async function main() {
  if (!env.mongoUri) {
    console.error('MONGO_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);

  const quizzes = await Lesson.find({ kind: 'quiz' })
    .select('title course quiz.passMark')
    .lean();

  const spread = new Map();
  for (const l of quizzes) {
    const value = l.quiz?.passMark ?? '(unset)';
    spread.set(value, (spread.get(value) ?? 0) + 1);
  }

  console.log(`${quizzes.length} quiz lesson${quizzes.length === 1 ? '' : 's'} found.`);
  for (const [value, count] of [...spread.entries()].sort()) {
    console.log(`  pass mark ${value}: ${count}`);
  }

  const stale = quizzes.filter((l) => (l.quiz?.passMark ?? null) !== mark);
  if (!stale.length) {
    console.log(`\nEvery quiz is already at ${mark}%. Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  if (!apply) {
    console.log(`\n${stale.length} would be set to ${mark}%. Re-run with --apply to write.`);
    await mongoose.disconnect();
    return;
  }

  const result = await Lesson.updateMany(
    { kind: 'quiz' },
    { $set: { 'quiz.passMark': mark } },
  );
  console.log(`\nSet ${result.modifiedCount} quiz lesson(s) to ${mark}%.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
