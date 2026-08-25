import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/apiResponse.js';
import { env } from '../../config/env.js';
import { Course } from '../../models/Course.js';
import { Enrollment } from '../../models/Enrollment.js';
import { activeProvider, coachStatus } from './coach/index.js';
import { courseDocuments } from './coach/context.js';
import { systemPrompt, COACH_DISCLAIMER } from './coach/prompt.js';
import { STAFF_ROLES } from '../../constants/roles.js';

/* ---------------------------------------------------------------------------
   The Course Coach endpoints (LMS 18.0).

   Course-scoped by construction: every question names a course, the enrolment
   is checked server-side, and the only material the model receives is that
   course's lessons. There is no "ask the coach anything" route, and that is the
   design rather than a first version — a site-wide assistant would be answering
   procurement questions within a day, which is A6's job and contractually not
   an AI's. See coach/prompt.js.
   ------------------------------------------------------------------------ */

/* Who may ask about a course. The same rule as the discussion board's
   accessTo(): enrolment, because this is content inside a paid course, plus the
   course's author and staff so an instructor can see what their learners see.

   Written out here rather than imported from discussions.controller.js, which
   keeps it private. When Phase 11 / 4.0 consolidates the enrolment check, this
   is one of the call sites to point at the shared helper. */
async function mayAsk(course, user) {
  if (!user) return false;
  if (STAFF_ROLES.includes(user.role)) return true;
  if (course.author && String(course.author) === String(user._id)) return true;

  const enrolment = await Enrollment.findOne({ user: user._id, course: course._id });
  return Boolean(enrolment?.isActive());
}

/* A per-learner hourly ceiling, held in memory.

   In memory is a real limitation and worth naming: it resets on deploy and is
   per-instance, so behind two containers the effective limit is double. It is
   here because the alternative — no ceiling at all on an endpoint that spends
   money per call — is worse, and because a Redis dependency is not something to
   add quietly inside a feature branch. Move this to a shared store when the app
   runs on more than one instance.

   express-rate-limit, already used on signup, is per-IP; this needs to be per
   ACCOUNT, since one office behind one address is many learners. */
const asked = new Map(); // userId -> number[] (timestamps)
const HOUR_MS = 60 * 60 * 1000;

function overLimit(userId) {
  const now = Date.now();
  const recent = (asked.get(String(userId)) ?? []).filter((t) => now - t < HOUR_MS);
  asked.set(String(userId), recent);

  if (recent.length >= env.coach.hourlyLimit) return true;
  recent.push(now);
  return false;
}

// Nothing here is a secret, but it is per-learner state and should not outlive
// the process's usefulness. Swept hourly so an idle instance does not hold a
// row per learner who ever asked anything.
setInterval(() => {
  const now = Date.now();
  for (const [id, times] of asked) {
    const recent = times.filter((t) => now - t < HOUR_MS);
    if (recent.length) asked.set(id, recent);
    else asked.delete(id);
  }
}, HOUR_MS).unref?.();

/* GET /lms/coach/status

   Whether the coach can answer, so the screen can render an honest empty state
   instead of a composer that fails on submit. Deliberately does not leak which
   provider or model to a learner — that is operator information. */
export const status = asyncHandler(async (req, res) => {
  const s = coachStatus();
  return ok(res, {
    ready: s.ready,
    reason: s.reason,
    // The operator's detail, for someone who can act on it. A learner is told
    // the coach is unavailable and nothing more.
    message: STAFF_ROLES.includes(req.user?.role) ? s.message : undefined,
    disclaimer: COACH_DISCLAIMER,
  });
});

/* POST /lms/coach/ask   { courseId | slug, question, history? }

   One question, answered from one course. */
export const ask = asyncHandler(async (req, res) => {
  const { courseId, slug, question, history } = req.body ?? {};

  const s = coachStatus();
  // 503 rather than 500: this is a configuration state, not a fault, and the
  // client renders it as "unavailable" rather than "something broke".
  if (!s.ready) throw ApiError.unavailable(s.message);

  const text = String(question ?? '').trim();
  if (!text) throw ApiError.badRequest('Ask a question first');
  // A question far longer than any real question is either a paste of something
  // that does not belong here or an attempt to fill the context. Refused before
  // it costs anything.
  if (text.length > 2000) {
    throw ApiError.badRequest('That question is too long — try asking it in a sentence or two.');
  }

  const course = await Course.findOne(courseId ? { _id: courseId } : { slug })
    .select('title slug author');
  if (!course) throw ApiError.notFound('Course not found');

  // 404, not 403: whether a course exists is not something to confirm to
  // somebody who cannot open it. Same reasoning as loadThread().
  if (!(await mayAsk(course, req.user))) throw ApiError.notFound('Course not found');

  if (overLimit(req.user._id)) {
    throw ApiError.tooManyRequests(
      'You have asked the coach a lot of questions this hour. Try again shortly.',
    );
  }

  const documents = await courseDocuments(course._id);
  if (!documents.length) {
    // Honest rather than an empty answer: there is genuinely nothing to answer
    // from, and the learner should know that is why.
    return ok(res, {
      answer: '',
      sources: [],
      empty: true,
      disclaimer: COACH_DISCLAIMER,
      message: 'This course doesn’t have written lessons or transcripts yet, so there’s nothing for the coach to read.',
    });
  }

  /* Only the last few turns are carried. A coach conversation is a short
     back-and-forth about a lesson, and re-sending a long history on every turn
     costs tokens for context the answer rarely needs. Trimmed here rather than
     trusted from the client, which could otherwise send anything. */
  const recent = (Array.isArray(history) ? history : [])
    .filter((t) => (t?.role === 'user' || t?.role === 'assistant') && typeof t?.text === 'string' && t.text.trim())
    .slice(-6)
    .map((t) => ({ role: t.role, text: t.text.slice(0, 4000) }));

  const provider = activeProvider();
  const result = await provider.ask({
    system: systemPrompt({ courseTitle: course.title, learnerName: req.user.name }),
    documents,
    history: recent,
    question: text,
  });

  if (result.refused || !result.text) {
    return ok(res, {
      answer: '',
      sources: [],
      refused: true,
      disclaimer: COACH_DISCLAIMER,
      message: 'The coach couldn’t answer that one. Try rephrasing it as a question about the course material.',
    });
  }

  return ok(res, {
    answer: result.text,
    // Every source is a lesson in THIS course, so the client can link straight
    // to it without another lookup.
    sources: result.sources.map((src) => ({
      title: src.title,
      quote: src.quote,
      to: `/learn/courses/${course.slug}/lessons/${src.lessonId}`,
    })),
    disclaimer: COACH_DISCLAIMER,
  });
});
