import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env } from '../../config/env.js';
import { getObject, uploadBuffer, s3 } from '../../config/s3.js';
import { packageSegments } from './hlsPackage.js';
import { KEY_ROTATION_SEGMENTS } from './hlsKeys.js';
import { Lesson } from '../../models/Lesson.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';

/* ---------------------------------------------------------------------------
   Turning an uploaded MP4 into encrypted HLS (LMS 3.0).

   This is the ONLY part of the feature that needs a media pipeline, and it is
   deliberately the dullest: cut the file into segments, hand them to
   hlsPackage, upload what comes back. Every decision about keys, rotation and
   who may decrypt lives next door in code that needs no ffmpeg to test.

   ---- Read this before switching it on --------------------------------------

   ffmpeg is CPU-bound and slow — a 40-minute lesson is minutes of full-core
   work. Running it in the API process will starve every other request on the
   instance, and on a small container it will be OOM-killed. There is no queue
   in this codebase, so `packageLessonVideo` is exported for a WORKER or a
   one-off script to call, and is not wired into the upload path.

   If you would rather not run media infrastructure at all — a fair choice —
   replace this module with a call to AWS MediaConvert (HLS + AES-128 via
   SPEKE), Mux or Cloudflare Stream. Everything downstream keeps working: it
   only cares that `video.hls.status` reaches 'ready' with a playlist whose key
   URIs are `key:N`.
   ------------------------------------------------------------------------ */

export const transcoderAvailable = () => Boolean(env.hls.ffmpegPath);

const SEGMENT_SECONDS = env.hls.segmentSeconds;

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    // Kept for the error message only. ffmpeg writes its progress to stderr, so
    // this is not a failure signal — the exit code is.
    proc.stderr.on('data', (d) => {
      stderr = (stderr + d.toString()).slice(-4000);
    });
    proc.on('error', reject);
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.trim()}`)),
    );
  });
}

// Reads the plain segments ffmpeg wrote, in playback order, with the durations
// it recorded in its own playlist. The durations matter: #EXTINF values that
// disagree with the media make a player seek to the wrong place.
async function readSegments(dir) {
  const playlist = await readFile(join(dir, 'index.m3u8'), 'utf8');

  const order = [];
  let pending = null;
  for (const line of playlist.split('\n')) {
    const inf = /^#EXTINF:([\d.]+)/.exec(line);
    if (inf) pending = Number(inf[1]);
    else if (line.trim() && !line.startsWith('#')) {
      order.push({ name: line.trim(), durationSeconds: pending ?? SEGMENT_SECONDS });
      pending = null;
    }
  }

  if (!order.length) {
    const written = await readdir(dir);
    throw new Error(`ffmpeg produced no segments (wrote: ${written.join(', ') || 'nothing'})`);
  }

  return Promise.all(
    order.map(async (seg) => ({ ...seg, data: await readFile(join(dir, seg.name)) })),
  );
}

const streamToBuffer = async (body) => {
  const chunks = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks);
};

/* Packages one lesson's video. Long-running; call it from a worker.

   Idempotent by overwrite: re-running replaces the playlist and segments at the
   same keys. Because content keys are DERIVED from the lesson id rather than
   generated per run, a re-encode is still decryptable by the same keys — no
   coordination between this and the key endpoint is needed. */
export async function packageLessonVideo(lessonId) {
  if (!transcoderAvailable()) {
    throw new Error('FFMPEG_PATH is not set, so video cannot be packaged for HLS.');
  }

  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new Error('Lesson not found');
  if (!lesson.video?.key) throw new Error('That lesson has no uploaded video');

  lesson.video.hls.status = 'pending';
  lesson.video.hls.error = '';
  await lesson.save();

  const dir = await mkdtemp(join(tmpdir(), 'gp-hls-'));
  try {
    // Down to local disk first. ffmpeg can read a URL, but a presigned one can
    // lapse mid-encode and the failure looks like a corrupt file.
    const source = join(dir, 'source.mp4');
    await writeFile(source, await streamToBuffer((await getObject(lesson.video.key)).Body));

    // ffmpeg writes into this directory but will not create it.
    const out = join(dir, 'segments');
    await mkdir(out, { recursive: true });

    await run(env.hls.ffmpegPath, [
      '-hide_banner',
      '-loglevel', 'error',
      // Overwrite without prompting; a re-run must not block on stdin that
      // nothing is attached to.
      '-y',
      '-i', source,
      // Stream copy: the source is already H.264/AAC from the browser upload,
      // so re-encoding would cost minutes and quality for nothing. A source
      // ffmpeg cannot copy fails loudly here rather than being quietly
      // re-encoded at whatever defaults happen to apply.
      '-c', 'copy',
      // TS segments need this to carry AAC from an MP4 container.
      '-bsf:a', 'aac_adtstoasc',
      '-f', 'hls',
      '-hls_time', String(SEGMENT_SECONDS),
      '-hls_playlist_type', 'vod',
      // Every segment listed, none dropped.
      '-hls_list_size', '0',
      '-hls_segment_filename', join(out, 'seg-%05d.ts'),
      join(out, 'index.m3u8'),
    ]);

    const plain = await readSegments(out);

    // Encryption and playlist authoring happen here, in tested code.
    const packaged = packageSegments({
      lessonId: String(lesson._id),
      segments: plain,
      rotateEvery: KEY_ROTATION_SEGMENTS,
    });

    const prefix = `lessons/${lesson._id}/hls`;
    await Promise.all(
      packaged.segments.map((seg) =>
        s3.send(
          new PutObjectCommand({
            Bucket: env.s3.bucket,
            Key: `${prefix}/${seg.name}`,
            Body: seg.data,
            ContentType: 'video/mp2t',
          }),
        ),
      ),
    );

    const { key: playlistKey } = await uploadBuffer({
      buffer: Buffer.from(packaged.playlist, 'utf8'),
      mimeType: 'application/vnd.apple.mpegurl',
      folder: prefix,
      originalName: 'index.m3u8',
    });

    lesson.video.hls = {
      status: 'ready',
      playlistKey,
      segmentPrefix: prefix,
      segmentCount: packaged.segments.length,
      rotateEvery: packaged.rotateEvery,
      packagedAt: new Date(),
      error: '',
    };
    await lesson.save();
    return lesson.video.hls;
  } catch (err) {
    // Recorded on the lesson, not just logged: whoever runs this needs to know
    // WHICH lesson failed and why, and 'failed' keeps the player on the MP4
    // path rather than requesting a playlist that was never written.
    lesson.video.hls.status = 'failed';
    lesson.video.hls.error = String(err?.message ?? err).slice(0, 500);
    await lesson.save();
    throw err;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
