import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { STAFF_ROLES } from '../../constants/roles.js';
import { Course } from '../../models/Course.js';
import { Enrollment } from '../../models/Enrollment.js';
import { LiveSession, SESSION_STATUS, JOIN_OPENS_MINUTES_BEFORE } from '../../models/LiveSession.js';
import {
  activeProvider,
  liveStatus,
  attachMeeting,
  syncMeeting,
  releaseMeeting,
} from './live/index.js';

/* ---------------------------------------------------------------------------
   Live teaching sessions (LMS 17.0b).

   A session is scheduled against a course, and the course's enrolment is the
   whole access model — there is no separate attendee list to keep in step.

   THE RULE THIS FILE EXISTS TO ENFORCE: a join URL is never stored on the
   client and never sent in a payload a learner can read. It is handed out one
   click at a time by `join` below, which re-checks the enrolment every single
   time. Same shape as the hlsTicket → hlsPlaylist → hlsKey chain: the listing
   is not the authorisation, the gate re-runs on the request that matters.

   Be honest about what that buys. A learner who has been given a link can
   forward it, and Zoom will let their colleague in — the waiting room is the
   only thing between a leaked link and a stranger in the room. What the gate
   does buy is that access is revocable: unenrol someone and their next click
   fails, rather than them holding a working link for ever.
   ------------------------------------------------------------------------ */

// GET /lms/live/status. Whether sessions can be scheduled, and why not.
// Instructor-facing: a screen that offers a Schedule button it cannot honour is
// worse than one that explains itself.
export const status = asyncHandler(async (_req, res) => ok(res, liveStatus()));

/* ---- Learner --------------------------------------------------------------- */

/* GET /lms/live-sessions. Every upcoming session across the courses this
   learner is enrolled in.

   Ended sessions drop off after the join window closes rather than at their end
   time, so a session that ran late does not vanish from under the people still
   in it. Cancelled ones stay visible until they would have finished — somebody
   who planned their Thursday around it needs to see that it is off, and a
   silently disappearing row does not tell them. */
export const myUpcoming = asyncHandler(async (req, res) => {
  const enrolments = await Enrollment.find({ user: req.user._id, revokedAt: null })
    .select('course')
    .lean();

  if (!enrolments.length) return ok(res, []);

  const now = new Date();
  const sessions = await LiveSession.find({
    course: { $in: enrolments.map((e) => e.course) },
    // A session is worth listing until its join window has closed. The window
    // is derived from startsAt and duration, which Mongo cannot compute, so
    // this is a generous floor and `state()` sorts out the detail per row.
    startsAt: { $gte: new Date(now.getTime() - 12 * 60 * 60_000) },
  })
    .sort({ startsAt: 1 })
    .populate('course', 'title slug')
    .populate('host', 'name');

  return ok(
    res,
    sessions.map((s) => ({
      ...s.forLearner(now),
      course: s.course ? { _id: s.course._id, title: s.course.title, slug: s.course.slug } : null,
      host: s.host ? { name: s.host.name } : null,
    })),
  );
});

/* GET /lms/live-sessions/:id/join. The gate.

   Returns the URL as JSON rather than issuing a 302, because auth here is a
   bearer token in a header: a plain <a href> to this endpoint would arrive
   signed out. The client fetches, then navigates. When the calendar invite
   lands (it must carry a link to US, never a raw provider URL), it will need a
   tokenised redirect variant of this — the same shape as `hlsTicket`.

   Four checks, in this order, because the error a learner sees should name the
   first real problem: does it exist, may they attend, is there a meeting at
   all, and is it time yet. */
export const join = asyncHandler(async (req, res) => {
  const session = await LiveSession.findById(req.params.id).populate('course', 'author title');
  if (!session) throw ApiError.notFound('Session not found');

  const course = session.course;
  const isStaff = STAFF_ROLES.includes(req.user.role);
  const isHost =
    String(session.host) === String(req.user._id) ||
    (course?.author && String(course.author) === String(req.user._id));

  if (!isStaff && !isHost) {
    const enrolment = await Enrollment.findOne({ user: req.user._id, course: course?._id });
    if (!enrolment?.isActive()) {
      throw ApiError.forbidden('You need to be enrolled in this course to join the session');
    }
  }

  if (session.status === SESSION_STATUS.CANCELLED) {
    throw ApiError.badRequest('This session was cancelled');
  }

  const url = activeProvider()?.joinUrlFor(session, req.user) ?? '';
  if (!url) {
    throw ApiError.notFound(
      'This session has no meeting link yet. Its host has been told — try again shortly.',
    );
  }

  /* canJoinAt() already answers "has the host started?" as well as the clock,
     so this stays one check rather than two that could disagree. The message
     only has to cover the not-yet-open case, because that is the only way a
     learner reaches it before the room has closed. */
  if (!isHost && !isStaff && !session.canJoinAt()) {
    const closed = new Date() > session.joinWindow().closesAt;
    throw ApiError.forbidden(
      closed
        ? 'This session has finished'
        : `The room opens ${JOIN_OPENS_MINUTES_BEFORE} minutes before the session starts, or as soon as your instructor starts it`,
    );
  }

  return ok(res, { url, passcode: session.providerRef?.passcode ?? '' });
});

/* ---- Instructor ------------------------------------------------------------ */

// Loads a session the caller is allowed to administer. Ownership is the
// course's author, not the session's host, so a course handed over does not
// leave its sessions unmanageable.
async function loadOwnSession(req) {
  const session = await LiveSession.findById(req.params.id).populate('course', 'author title slug');
  if (!session) throw ApiError.notFound('Session not found');

  const isStaff = STAFF_ROLES.includes(req.user.role);
  const owns = session.course?.author && String(session.course.author) === String(req.user._id);
  if (!isStaff && !owns) throw ApiError.forbidden('That is not your course');

  return session;
}

// GET /lms/authoring/live-sessions. Everything the instructor has scheduled,
// newest first — a teaching diary reads backwards from now.
export const mySessions = asyncHandler(async (req, res) => {
  const filter = STAFF_ROLES.includes(req.user.role)
    ? {}
    : { course: { $in: (await Course.find({ author: req.user._id }).select('_id').lean()).map((c) => c._id) } };

  const now = new Date();
  const sessions = await LiveSession.find(filter)
    .sort({ startsAt: -1 })
    .limit(200)
    .populate('course', 'title slug');

  return ok(
    res,
    sessions.map((s) => ({
      ...s.forHost(now),
      course: s.course ? { _id: s.course._id, title: s.course.title, slug: s.course.slug } : null,
    })),
  );
});

function readSessionBody(body) {
  const startsAt = new Date(body.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw ApiError.badRequest('A valid start time is required');
  if (!body.title?.trim()) throw ApiError.badRequest('A session title is required');

  const durationMinutes = Number(body.durationMinutes) || 60;
  if (durationMinutes < 5 || durationMinutes > 600) {
    throw ApiError.badRequest('Duration must be between 5 and 600 minutes');
  }

  return {
    title: body.title.trim(),
    description: body.description?.trim() ?? '',
    startsAt,
    durationMinutes,
    // An IANA name. Not validated against a list here: the set moves, and a
    // wrong one surfaces immediately as a wrong time on screen.
    timezone: body.timezone?.trim() || 'Australia/Sydney',
  };
}

// POST /lms/authoring/live-sessions
export const createSession = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.body.courseId);
  if (!course) throw ApiError.notFound('Course not found');

  const isStaff = STAFF_ROLES.includes(req.user.role);
  if (!isStaff && String(course.author) !== String(req.user._id)) {
    throw ApiError.forbidden('That is not your course');
  }

  const session = new LiveSession({
    ...readSessionBody(req.body),
    course: course._id,
    host: req.user._id,
  });

  // Non-fatal by design — see attachMeeting. A session with no link is still a
  // session, and the screen shows the reason with a retry.
  await attachMeeting(session);
  await session.save();

  recordAudit({
    req,
    action: 'lms.liveSession.create',
    entity: 'LiveSession',
    entityId: session._id,
    summary: `Scheduled "${session.title}" on ${course.title}`,
  });

  return created(res, session.forHost());
});

// PATCH /lms/authoring/live-sessions/:id
export const updateSession = asyncHandler(async (req, res) => {
  const session = await loadOwnSession(req);
  if (session.status === SESSION_STATUS.CANCELLED) {
    throw ApiError.badRequest('A cancelled session cannot be edited. Schedule a new one.');
  }

  Object.assign(session, readSessionBody({ ...session.toObject(), ...req.body }));
  await syncMeeting(session);
  await session.save();

  recordAudit({
    req,
    action: 'lms.liveSession.update',
    entity: 'LiveSession',
    entityId: session._id,
    summary: `Rescheduled "${session.title}"`,
  });

  return ok(res, session.forHost());
});

/* DELETE /lms/authoring/live-sessions/:id. Cancels rather than deletes.

   The row is what tells a learner who planned around Thursday that Thursday is
   off. Deleting it removes the notice along with the session. */
export const cancelSession = asyncHandler(async (req, res) => {
  const session = await loadOwnSession(req);

  await releaseMeeting(session);

  session.status = SESSION_STATUS.CANCELLED;
  session.cancelledAt = new Date();
  session.cancelReason = req.body?.reason?.trim() ?? '';
  // The meeting is gone on Zoom's side; leaving the URL here would be a link
  // that 404s for anyone who kept it.
  session.providerRef = { meetingId: '', joinUrl: '', hostUrl: '', passcode: '' };
  await session.save();

  recordAudit({
    req,
    action: 'lms.liveSession.cancel',
    entity: 'LiveSession',
    entityId: session._id,
    summary: `Cancelled "${session.title}"`,
  });

  return ok(res, session.forHost());
});

/* POST /lms/authoring/live-sessions/:id/retry. Creates the meeting for a
   session whose provider call failed — credentials added since, or Zoom having
   had a bad afternoon. */
export const retryMeeting = asyncHandler(async (req, res) => {
  const session = await loadOwnSession(req);
  if (session.status === SESSION_STATUS.CANCELLED) {
    throw ApiError.badRequest('That session was cancelled');
  }
  if (session.providerRef?.joinUrl) return ok(res, session.forHost());

  await attachMeeting(session);
  await session.save();

  if (session.providerError) throw ApiError.badRequest(session.providerError);
  return ok(res, session.forHost());
});

/* GET /lms/authoring/live-sessions/:id/host. The start-as-host URL.

   Its own endpoint rather than a field on the session, because it starts the
   meeting as the host: anyone holding it can open the room in the instructor's
   name. Served once, on a deliberate click, to somebody whose ownership was
   just re-checked — never sitting in a list payload. */
export const hostUrl = asyncHandler(async (req, res) => {
  const session = await loadOwnSession(req);
  const url = session.providerRef?.hostUrl ?? '';
  if (!url) throw ApiError.notFound('This session has no meeting yet');

  /* Asking for this URL IS starting the session — it is the only way to open
     the room, and it is a deliberate click. Stamping it here opens the door for
     learners immediately, rather than making them wait out a schedule the host
     has already overtaken.

     Only the first time: a host who reopens the tab has not restarted anything,
     and moving the timestamp would extend the room's closing time with it. */
  if (!session.hostStartedAt) {
    session.hostStartedAt = new Date();
    await session.save();
  }

  return ok(res, { url, startedAt: session.hostStartedAt });
});
