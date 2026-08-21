import mongoose from 'mongoose';

export const LESSON_KIND = {
  TEXT: 'text',
  VIDEO: 'video',
  QUIZ: 'quiz',
  // An embedded YouTube video. Kept apart from `video` rather than folded into
  // it: an uploaded file is private and played through a signed URL, whereas
  // this is a public embed with none of that machinery. Treating them as one
  // kind would mean every player branch guessing which it was holding.
  YOUTUBE: 'youtube',
  // A document to read or download (PDF, slides, a spec). The file is stored
  // like lesson video is, or it can point at something already published.
  DOC: 'doc',
};
export const LESSON_KINDS = Object.values(LESSON_KIND);

export const QUESTION_TYPE = {
  SINGLE: 'single',
  MULTI: 'multi',
  BOOLEAN: 'boolean',
  TEXT: 'text',
};
export const QUESTION_TYPES = Object.values(QUESTION_TYPE);

// One question inside a quiz (L3).
//
// `correct` and `accept` are THE ANSWER KEY and must never reach a learner.
// Lesson.forLearner() below strips them; nothing else should serialise a
// question directly.
const questionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: QUESTION_TYPES, required: true },
    prompt: { type: String, required: true },
    options: [
      {
        id: { type: String, required: true },
        text: { type: String, default: '' },
      },
    ],
    correct: { type: [String], default: [] },
    accept: { type: [String], default: [] }, // short-answer accepted strings
    explanation: { type: String, default: '' },
  },
  { _id: true },
);

// A transcript cue (L2): seconds + the words said at that point.
const cueSchema = new mongoose.Schema(
  {
    t: { type: Number, required: true, min: 0 },
    text: { type: String, required: true },
  },
  { _id: false },
);

const lessonSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true, index: true },

    title: { type: String, required: true, trim: true },
    kind: { type: String, enum: LESSON_KINDS, default: LESSON_KIND.TEXT, index: true },
    order: { type: Number, default: 0 },
    minutes: { type: Number, default: 10, min: 0 },

    // Free preview (L1). Openable before purchase.
    preview: { type: Boolean, default: false },

    // kind: 'text'
    body: { type: String, default: '' },

    // kind: 'video' (L2). The S3 KEY is stored, never a public URL. Playback
    // goes through the signed-URL endpoint, so a lesson row must not carry a
    // link that works without one.
    video: {
      key: { type: String, default: '' },
      name: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      sizeBytes: { type: Number, default: 0 },
      durationSeconds: { type: Number, default: 0 },

      /* Encrypted HLS (LMS 3.0), when the video has been packaged for it.

         Additive, never a replacement. `key` above stays exactly as it was, so
         a lesson uploaded before any of this — or one on an install with no
         transcoder — keeps playing through the signed-MP4 endpoint. `status`
         is what the player asks about: only 'ready' means there is a playlist
         worth requesting.

         No key material is stored here. Content keys are derived on demand from
         HLS_KEY_SECRET (see hlsKeys.js), so this is a pointer and a count, and
         a dump of this collection decrypts nothing. */
      hls: {
        status: {
          type: String,
          enum: ['none', 'pending', 'ready', 'failed'],
          default: 'none',
        },
        // S3 key of the stored playlist. Its URIs are placeholders, rewritten
        // per request — see hlsPackage.resolvePlaylist.
        playlistKey: { type: String, default: '' },
        // Prefix the encrypted segments live under.
        segmentPrefix: { type: String, default: '' },
        segmentCount: { type: Number, default: 0 },
        // Held per-lesson rather than read from config at playback time: the
        // setting can change, and the playlist that was written has to keep
        // being described by the number it was written with.
        rotateEvery: { type: Number, default: 0 },
        packagedAt: { type: Date },
        error: { type: String, default: '' },
      },
    },
    transcript: { type: [cueSchema], default: [] },

    // kind: 'youtube'. Only the id is stored, never the pasted URL: an id is
    // what the embed needs, and parsing once on write means the player is not
    // handed a watch/shorts/youtu.be link to re-parse every render.
    youtube: {
      videoId: { type: String, default: '' },
      startSeconds: { type: Number, default: 0, min: 0 },
      // Author's note about what to watch for. The embed carries no context.
      note: { type: String, default: '' },
    },

    // kind: 'doc'. Either an uploaded file (key) or a link to something already
    // published (url). Never both, and `key` is served through a signed URL for
    // the same reason lesson video is.
    document: {
      key: { type: String, default: '' },
      url: { type: String, default: '' },
      name: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      sizeBytes: { type: Number, default: 0 },
      pages: { type: Number, default: 0 },
      // Shown above the document, so a learner knows why they are reading it.
      summary: { type: String, default: '' },
    },

    // kind: 'quiz' (L3)
    quiz: {
      passMark: { type: Number, default: 70, min: 0, max: 100 },
      timeLimitMins: { type: Number, default: 0, min: 0 },
      maxAttempts: { type: Number, default: 0, min: 0 }, // 0 = unlimited
      shuffle: { type: Boolean, default: false },
      questions: { type: [questionSchema], default: [] },
    },

    // Downloadable resources attached to this lesson (L1). Any lesson kind can
    // carry them: a video has its slides, a YouTube embed its worked example.
    //
    // Like lesson video, the S3 KEY is stored and never a public URL. The file
    // is fetched through the signed-URL endpoint, so the list can be shown to
    // anyone while the download itself stays gated on the enrolment.
    resources: [
      {
        title: { type: String, default: '' },
        key: { type: String, default: '' },
        // An external link instead of an upload, for something already
        // published. Mutually exclusive with `key`, same rule as a doc lesson.
        url: { type: String, default: '' },
        name: { type: String, default: '' },
        kind: { type: String, default: 'pdf' },
        mimeType: { type: String, default: '' },
        sizeBytes: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true },
);

lessonSchema.index({ course: 1, module: 1, order: 1 });

// The learner-facing shape. Two things are removed and both matter:
//   · the answer key, so a quiz cannot be solved from the network tab
//   · the video key, so playback must go through the signed-URL endpoint
lessonSchema.methods.forLearner = function forLearner() {
  const o = this.toObject({ virtuals: false });

  if (o.quiz?.questions?.length) {
    o.quiz.questions = o.quiz.questions.map((q) => ({
      _id: q._id,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      // `correct`, `accept` and `explanation` are withheld until the attempt
      // has been marked. The explanation gives the answer away too.
    }));
  }

  if (o.video) {
    o.video = {
      hasVideo: Boolean(o.video.key),
      durationSeconds: o.video.durationSeconds,
      // Whether to ask for the playlist instead of a signed MP4. A boolean, not
      // the S3 keys: the player needs to know the stream exists, not where it
      // is kept.
      hasHls: o.video.hls?.status === 'ready',
    };
  }

  // Same rule for a downloadable resource: the learner gets the label and the
  // size so the list renders, and asks the signed-URL endpoint for the file
  // itself. An external `url` was already public before we stored it.
  if (o.resources?.length) {
    o.resources = o.resources.map((r) => ({
      _id: r._id,
      title: r.title,
      name: r.name ?? '',
      kind: r.kind ?? 'pdf',
      sizeBytes: r.sizeBytes ?? 0,
      hasFile: Boolean(r.key),
      url: r.url ?? '',
    }));
  }

  // Same rule for an uploaded document: the key stays server-side and the file
  // is fetched through the signed-URL endpoint. An external `url` is already
  // public by definition, so it passes through.
  if (o.document) {
    o.document = {
      hasFile: Boolean(o.document.key),
      url: o.document.url ?? '',
      name: o.document.name ?? '',
      mimeType: o.document.mimeType ?? '',
      sizeBytes: o.document.sizeBytes ?? 0,
      pages: o.document.pages ?? 0,
      summary: o.document.summary ?? '',
    };
  }

  return o;
};

export const Lesson = mongoose.model('Lesson', lessonSchema);
