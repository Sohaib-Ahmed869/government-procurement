import mongoose from 'mongoose';

/* ---------------------------------------------------------------------------
   A live teaching session (LMS 17.0b).

   Belongs to a course, so every question about who may attend is already
   answered by the enrolment that course carries. No new access concept.

   ---- Two decisions worth reading before changing anything -----------------

   1. `startsAt` is a UTC instant and `timezone` is an IANA NAME, stored apart.
      Not an offset: an offset is wrong twice a year, and a session at the wrong
      hour is a missed session. The name is what lets "10am Sydney" stay 10am
      Sydney across a daylight-saving boundary.

   2. `status` only ever holds `scheduled` or `cancelled` — the two states a
      PERSON puts it in. Whether a session is upcoming, live or finished is
      DERIVED from the clock by `state()` below, never stored. There is no job
      runner in this codebase, so a stored 'live' would be a field nothing
      flips: correct at write time and quietly wrong for ever after.
   ------------------------------------------------------------------------ */

export const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  CANCELLED: 'cancelled',
};

// How long before the start a learner may join. Early enough that nobody is
// locked out by a slow laptop, late enough that the link isn't a standing door.
export const JOIN_OPENS_MINUTES_BEFORE = 15;

// Grace after the scheduled end, for a session that runs over.
export const JOIN_CLOSES_MINUTES_AFTER = 30;

const liveSessionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    // Denormalised from the course at creation. The roster screen lists sessions
    // by host, and an instructor may hand a course over without the sessions
    // they already ran changing who taught them.
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    startsAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 60, min: 5, max: 600 },
    // IANA name, e.g. 'Australia/Sydney'. See the note above.
    timezone: { type: String, default: 'Australia/Sydney' },

    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.SCHEDULED,
      index: true,
    },

    /* The meeting on the provider's side.

       `hostUrl` starts the meeting AS THE HOST and is as sensitive as a
       password — anyone holding it can open the session and admit whoever they
       like. It is never serialised to a learner, on the same rule the Lesson
       model follows for `video.key`: store the reference, serve a derived
       thing, and only ever from behind a gate.

       `joinUrl` is only marginally less sensitive: a session link that leaks is
       a session strangers walk into. It never appears in a list payload either
       — see forLearner() and the join endpoint. */
    provider: { type: String, default: '' },
    providerRef: {
      meetingId: { type: String, default: '' },
      joinUrl: { type: String, default: '' },
      hostUrl: { type: String, default: '' },
      passcode: { type: String, default: '' },
    },

    // Set when the provider could not be reached. The session still exists and
    // is still listed — a scheduling record is useful even when the meeting has
    // to be created by hand — but it carries the reason it has no link.
    providerError: { type: String, default: '' },

    cancelledAt: { type: Date },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true },
);

liveSessionSchema.index({ course: 1, startsAt: 1 });

liveSessionSchema.methods.endsAt = function endsAt() {
  return new Date(this.startsAt.getTime() + this.durationMinutes * 60_000);
};

// The window the join endpoint honours. Kept on the model so the screen and the
// gate cannot drift: the button is enabled by the same arithmetic that decides
// whether the click is allowed.
liveSessionSchema.methods.joinWindow = function joinWindow() {
  return {
    opensAt: new Date(this.startsAt.getTime() - JOIN_OPENS_MINUTES_BEFORE * 60_000),
    closesAt: new Date(this.endsAt().getTime() + JOIN_CLOSES_MINUTES_AFTER * 60_000),
  };
};

// upcoming | live | ended | cancelled. Derived, never stored — see the note at
// the top of this file.
liveSessionSchema.methods.state = function state(now = new Date()) {
  if (this.status === SESSION_STATUS.CANCELLED) return 'cancelled';
  if (now < this.startsAt) return 'upcoming';
  if (now <= this.endsAt()) return 'live';
  return 'ended';
};

liveSessionSchema.methods.canJoinAt = function canJoinAt(now = new Date()) {
  if (this.status === SESSION_STATUS.CANCELLED) return false;
  const { opensAt, closesAt } = this.joinWindow();
  return now >= opensAt && now <= closesAt;
};

/* The learner-facing shape. What is REMOVED is the point of it:

     · providerRef entirely — no join URL, no host URL, no meeting id. A learner
       gets a link by clicking Join, which re-checks the enrolment;
     · providerError, which is an operations problem and not theirs to read.

   `joinable` is sent so the button can be disabled with a reason rather than
   failing on click, and `opensAt` so the screen can say when it will open. */
liveSessionSchema.methods.forLearner = function forLearner(now = new Date()) {
  const { opensAt } = this.joinWindow();
  return {
    _id: this._id,
    course: this.course,
    title: this.title,
    description: this.description,
    startsAt: this.startsAt,
    endsAt: this.endsAt(),
    durationMinutes: this.durationMinutes,
    timezone: this.timezone,
    state: this.state(now),
    joinable: this.canJoinAt(now),
    joinOpensAt: opensAt,
    // Whether a meeting exists at all, without saying where it is. A session
    // whose provider call failed should read as "no link yet", not as a dead
    // Join button.
    hasMeeting: Boolean(this.providerRef?.joinUrl),
    cancelReason: this.status === SESSION_STATUS.CANCELLED ? this.cancelReason : '',
  };
};

// The host's shape. Adds what the instructor legitimately needs — whether the
// meeting was created, and why not if it wasn't — and still withholds hostUrl,
// which is served only by its own endpoint so it is never sitting in a payload
// a shoulder-surfer or a browser extension can read.
liveSessionSchema.methods.forHost = function forHost(now = new Date()) {
  return {
    ...this.forLearner(now),
    provider: this.provider,
    meetingId: this.providerRef?.meetingId ?? '',
    passcode: this.providerRef?.passcode ?? '',
    providerError: this.providerError,
    status: this.status,
  };
};

export const LiveSession = mongoose.model('LiveSession', liveSessionSchema);
