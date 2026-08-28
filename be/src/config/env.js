import dotenv from 'dotenv';

dotenv.config();

// Centralised, typed access to environment variables. Import `env` everywhere
// instead of reading process.env directly, so defaults live in one place.
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  // This API's own public base URL — used to build image URLs that stream S3
  // objects back through the server (so a private bucket still serves images).
  apiPublicUrl: (process.env.API_PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 5000}`).replace(/\/$/, ''),
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  mongoUri: process.env.MONGO_URI || '',

  /* ---- Feature flags -------------------------------------------------------

     B7 — Find a Bid Writer is built and tested but must not appear in
     production until the client says so. One switch, three positions, so
     "go live" is a value change rather than a deploy of different code:

       off      (default) the public endpoint 404s. Nothing to find.
       preview  serves publicly, but the page marks itself noindex and stays
                out of the nav. This is what staging runs.
       live     fully on and indexable.

     Defaulting to `off` is the whole point: a production environment that has
     never heard of this variable gets the safe answer. The frontend has its own
     copy of the same switch (VITE_FEATURE_BID_WRITERS) because the nav and the
     route are built at compile time; both have to be flipped, which is why the
     procedure is written down in docs/GO-LIVE-BID-WRITERS.md. */
  features: {
    bidWriters: ['preview', 'live'].includes(process.env.FEATURE_BID_WRITERS)
      ? process.env.FEATURE_BID_WRITERS
      : 'off',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-insecure-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    resetSecret: process.env.JWT_RESET_SECRET || 'dev-insecure-reset-secret',
    resetExpiresIn: process.env.JWT_RESET_EXPIRES_IN || '1h',
  },

  s3: {
    region: process.env.AWS_REGION || 'ap-southeast-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucket: process.env.S3_BUCKET || '',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || '',
    maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 512,
  },

  /* Encrypted HLS video (LMS 3.0).

     `keySecret` is the root of every content key: rotating it invalidates all
     of them at once, which is the break-glass lever. There is deliberately no
     default — a shared default secret is the same as no encryption, and it is
     the kind of thing nobody notices until a pen-test quotes it back. Serving
     encrypted video without it fails loudly instead.

     `ffmpegPath` is what turns transcoding ON. Absent, uploads keep their
     existing signed-MP4 path and nothing changes. */
  hls: {
    keySecret: process.env.HLS_KEY_SECRET || '',
    // Segments sharing one key. ~6s segments x 10 is about a minute of video
    // per key, so a leaked key is worth about that much.
    rotateEvery: Number(process.env.HLS_KEY_ROTATE_SEGMENTS) || 10,
    // How long the key-URI token in a served playlist stays valid. The gate is
    // re-checked on every key request regardless, so this is a second bound and
    // not the access control.
    tokenTtlSeconds: Number(process.env.HLS_TOKEN_TTL_SECONDS) || 300,
    segmentSeconds: Number(process.env.HLS_SEGMENT_SECONDS) || 6,
    ffmpegPath: process.env.FFMPEG_PATH || '',
  },

  /* Live teaching sessions (LMS 17.0).

     `provider` names an adapter in src/modules/lms/live/providers/. Only `zoom`
     ships today. `enabled` is the kill switch that turns scheduling off with
     credentials left in place — the same shape as the coach, and for the same
     reason: switching a feature off should not mean deleting the keys.

     With no credentials the feature does not pretend. Sessions can still be
     scheduled as records, and each one says plainly that it has no meeting link
     yet, rather than showing a Join button that goes nowhere. */
  live: {
    enabled: process.env.LIVE_SESSIONS_ENABLED !== 'false',
    provider: process.env.LIVE_PROVIDER || 'zoom',
  },

  /* Federated sign-in (L6). Each provider is switched on independently by the
     presence of its own credentials; with none set, the sign-in screen shows
     only email and password, exactly as before.

     `enabled` is the kill switch that turns them all off with credentials left
     in place — same shape as the coach and live sessions. */
  /* Payments (C1). Prices in this system are TAX-INCLUSIVE — see
     src/utils/gst.js — so Stripe is sent the full amount the customer pays with
     tax_behavior 'inclusive', and the GST component is computed here at a flat
     Australian 10%.

     With no secret key, the commerce endpoints report themselves unavailable
     and nothing can be bought. The webhook secret is separate and just as
     required: without it a webhook cannot be verified, and an unverified
     webhook is an open "mark this order paid" endpoint. */
  stripe: {
    enabled: process.env.STRIPE_ENABLED !== 'false',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  oauth: {
    enabled: process.env.OAUTH_ENABLED !== 'false',
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      // common | organizations | consumers | <tenant guid>. See the note in
      // providers/microsoft.js before narrowing this.
      tenant: process.env.MICROSOFT_TENANT || 'common',
    },
  },

  zoom: {
    accountId: process.env.ZOOM_ACCOUNT_ID || '',
    clientId: process.env.ZOOM_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
    // Whose Zoom calendar the meetings are created on. 'me' is the user the
    // Server-to-Server app belongs to; an email or user id puts them on a
    // different licensed host.
    userId: process.env.ZOOM_USER_ID || 'me',
  },

  /* Course Coach (LMS 18.0) — the AI study assistant inside the student LMS.

     THREE SEPARATE KNOBS, on purpose, because "change the AI" means three
     different things and they should not need a code change:

       provider   which vendor's adapter runs. One file per provider under
                  modules/lms/coach/providers/; this names which one.
       model      which model that provider is asked for.
       apiKey     WHOSE ACCOUNT is billed. Swapping accounts is this line and
                  nothing else.

     Absent a key the coach reports itself unavailable and the screen says so.
     It never falls back to a different provider or a stub answer: a study
     assistant that quietly starts making things up when its credentials expire
     is worse than one that is plainly switched off.

     `enabled` is the separate kill switch, so the feature can be turned off
     with the credentials left in place. */
  coach: {
    enabled: process.env.COACH_ENABLED !== 'false',
    provider: process.env.COACH_PROVIDER || 'anthropic',
    model: process.env.COACH_MODEL || 'claude-opus-5',
    // How hard the model works per answer. 'low' is right for routine
    // "what did this lesson mean" questions; raise it if answers feel thin.
    effort: process.env.COACH_EFFORT || 'low',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    // Questions per learner per hour. An LLM endpoint behind a login with no
    // ceiling is a bill waiting to happen.
    hourlyLimit: Number(process.env.COACH_HOURLY_LIMIT) || 30,
  },

  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Government Procurement <no-reply@example.com>',
  },

  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
    name: process.env.SEED_ADMIN_NAME || 'Site Admin',
  },
};

// True once real S3 credentials are present. Upload routes use this to fail
// gracefully with a clear message before the client pastes their keys.
export const s3Configured = Boolean(
  env.s3.accessKeyId && env.s3.secretAccessKey && env.s3.bucket,
);

export const mailConfigured = Boolean(env.mail.host);
