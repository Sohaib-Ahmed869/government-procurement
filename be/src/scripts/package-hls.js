import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Lesson } from '../models/Lesson.js';
import { packageLessonVideo, transcoderAvailable } from '../modules/lms/hlsTranscode.js';
import { generateSecret } from '../modules/lms/hlsKeys.js';

/* ---------------------------------------------------------------------------
   Packages uploaded lesson videos as encrypted HLS (LMS 3.0).

   A script rather than part of the upload request, because ffmpeg is minutes of
   full-core work per lesson and the API has no queue: doing it inline would
   stall every other request on the instance and time the uploader out. Run it
   on a machine that can afford the CPU.

     node src/scripts/package-hls.js              every unpackaged video
     node src/scripts/package-hls.js <lessonId>   just that one
     node src/scripts/package-hls.js --retry      also retry previous failures
     node src/scripts/package-hls.js --secret     print a fresh HLS_KEY_SECRET

   Safe to re-run: a lesson already 'ready' is skipped unless named directly,
   and packaging is idempotent because content keys are derived from the lesson
   id rather than generated per run.
   ------------------------------------------------------------------------ */

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const explicitId = args.find((a) => !a.startsWith('--'));

if (flags.has('--secret')) {
  console.log(generateSecret());
  process.exit(0);
}

if (!transcoderAvailable()) {
  console.error(
    'FFMPEG_PATH is not set. Point it at an ffmpeg binary, or package video with\n' +
      'MediaConvert / Mux / Cloudflare Stream instead — see src/modules/lms/hlsTranscode.js.',
  );
  process.exit(1);
}
if (!env.hls.keySecret || env.hls.keySecret.length < 32) {
  console.error(
    'HLS_KEY_SECRET is missing or under 32 chars. Generate one with:\n' +
      '  node src/scripts/package-hls.js --secret',
  );
  process.exit(1);
}

await mongoose.connect(env.mongoUri);

const filter = explicitId
  ? { _id: explicitId }
  : {
      kind: 'video',
      'video.key': { $nin: ['', null] },
      'video.hls.status': flags.has('--retry') ? { $in: ['none', 'failed'] } : 'none',
    };

const lessons = await Lesson.find(filter).select('_id title video.hls.status').lean();
if (!lessons.length) {
  console.log('Nothing to package.');
  await mongoose.disconnect();
  process.exit(0);
}

console.log(`Packaging ${lessons.length} lesson(s).`);
let done = 0;
let failed = 0;

// Sequential on purpose. Each of these saturates a core; running them in
// parallel makes all of them slower and can exhaust memory on a small box.
for (const lesson of lessons) {
  const label = `${lesson._id} — ${lesson.title ?? 'untitled'}`;
  process.stdout.write(`  ${label} … `);
  try {
    // eslint-disable-next-line no-await-in-loop
    const hls = await packageLessonVideo(lesson._id);
    done += 1;
    console.log(`ready (${hls.segmentCount} segments, key every ${hls.rotateEvery})`);
  } catch (err) {
    failed += 1;
    // Recorded on the lesson too, by packageLessonVideo.
    console.log(`FAILED — ${err?.message ?? err}`);
  }
}

console.log(`\nDone. ${done} packaged, ${failed} failed.`);
await mongoose.disconnect();
process.exit(failed ? 1 : 0);
