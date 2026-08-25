import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { Course } from '../../models/Course.js';
import { Lesson } from '../../models/Lesson.js';
import { Module } from '../../models/Module.js';
import { Enrollment } from '../../models/Enrollment.js';
import { Note } from '../../models/Note.js';
import { Bookmark } from '../../models/Bookmark.js';
import { LearningActivity } from '../../models/LearningActivity.js';

/* ---------------------------------------------------------------------------
   A learner's own study record: notes, bookmarks and the activity history the
   dashboard and My Progress chart.

   All three used to live in the browser. Notes and bookmarks were localStorage
   — so they did not follow anyone to a second device and vanished when the
   profile was cleared — and the activity charts were a fortnight of invented
   numbers, identical for every learner. This is the endpoint side of replacing
   them.
   ------------------------------------------------------------------------ */

/* ---- Which day is it, where the learner is? -------------------------------

   The client sends its UTC offset in minutes (`Date.prototype.getTimezoneOffset`,
   so Sydney in winter is -600). The server's own day is no use: a lesson
   finished at 9pm in Sydney is already tomorrow in UTC, and the learner would
   watch their streak land on a day they were asleep for.

   Anything missing or out of range falls back to Australian Eastern Standard
   Time, which is where this audience is, rather than to UTC — a wrong guess in
   the right hemisphere is a few hours out, a wrong guess in UTC is most of a
   day. */
const AEST_OFFSET_MINUTES = -600;

export function localDay(offsetMinutes) {
  const offset = Number(offsetMinutes);
  const safe =
    Number.isFinite(offset) && Math.abs(offset) <= 14 * 60 ? offset : AEST_OFFSET_MINUTES;
  // getTimezoneOffset is minutes to ADD to local to reach UTC, so it subtracts.
  const local = new Date(Date.now() - safe * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

// Every day between two `YYYY-MM-DD` strings, inclusive, so a chart can plot a
// flat line through days with no rows rather than closing the gap and implying
// the learner studied on consecutive days they did not.
function eachDay(fromDay, toDay) {
  const out = [];
  const cursor = new Date(`${fromDay}T00:00:00Z`);
  const end = new Date(`${toDay}T00:00:00Z`);
  while (cursor <= end) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/* ---- Activity -------------------------------------------------------------- */

// GET /lms/activity?days=7&tzOffset=-600
//
// Zero-filled, oldest first, ending on the learner's today. Filled here rather
// than in the browser because the range's end is a timezone question and the
// server has just answered it — two answers to that would put the dashboard's
// "this week" and the chart's last column on different days.
export const myActivity = asyncHandler(async (req, res) => {
  const requested = Number(req.query.days);
  const days = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 366) : 7;

  const today = localDay(req.query.tzOffset);
  const from = new Date(`${today}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  const fromDay = from.toISOString().slice(0, 10);

  const rows = await LearningActivity.find({
    user: req.user._id,
    day: { $gte: fromDay, $lte: today },
  }).lean();

  const byDay = new Map(rows.map((r) => [r.day, r]));
  return ok(
    res,
    eachDay(fromDay, today).map((day) => ({
      day,
      minutes: byDay.get(day)?.minutes ?? 0,
      lessons: byDay.get(day)?.lessons ?? 0,
      quizzes: byDay.get(day)?.quizzes ?? 0,
    })),
  );
});

/* ---- Notes and bookmarks --------------------------------------------------- */

// Both collections point at a lesson, and both need the same two checks before
// they will write: the lesson exists, and the learner is entitled to be in the
// course it belongs to. Without the second, a note is a way to confirm that a
// lesson id exists in a course you never bought.
async function lessonForLearner(userId, lessonId) {
  const lesson = await Lesson.findById(lessonId).select('course title kind minutes');
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const enrolment = await Enrollment.findOne({ user: userId, course: lesson.course });
  if (!enrolment?.isActive()) throw ApiError.forbidden('You need to be enrolled in this course');

  return lesson;
}

// Titles are resolved on read, never stored — see the note on the models. One
// query per collection rather than a populate per row.
async function withContext(rows) {
  if (!rows.length) return [];

  const courseIds = [...new Set(rows.map((r) => String(r.course)))];
  const lessonIds = [...new Set(rows.map((r) => String(r.lesson)))];

  const [courses, lessons] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }).select('title slug').lean(),
    Lesson.find({ _id: { $in: lessonIds } }).select('title kind minutes module').lean(),
  ]);

  // The module a lesson sits in, for the "Module 3 · Evaluating responses"
  // line the bookmarks list shows under each row.
  const moduleIds = [...new Set(lessons.map((l) => String(l.module)).filter(Boolean))];
  const modules = moduleIds.length
    ? await Module.find({ _id: { $in: moduleIds } }).select('title').lean()
    : [];

  const courseById = new Map(courses.map((c) => [String(c._id), c]));
  const lessonById = new Map(lessons.map((l) => [String(l._id), l]));
  const moduleById = new Map(modules.map((m) => [String(m._id), m]));

  return rows.map((row) => {
    const course = courseById.get(String(row.course));
    const lesson = lessonById.get(String(row.lesson));
    return {
      ...row,
      // A note whose lesson or course has since been deleted still lists, with
      // what is left of its context — dropping it would lose the learner's own
      // writing over a change they had no part in.
      courseTitle: course?.title ?? 'Removed course',
      courseSlug: course?.slug ?? null,
      lessonTitle: lesson?.title ?? 'Removed lesson',
      lessonKind: lesson?.kind ?? null,
      moduleTitle: moduleById.get(String(lesson?.module))?.title ?? '',
      minutes: lesson?.minutes ?? 0,
    };
  });
}

// GET /lms/notes
export const listNotes = asyncHandler(async (req, res) => {
  const rows = await Note.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  return ok(res, await withContext(rows));
});

// POST /lms/notes  { lessonId, body, at }
export const createNote = asyncHandler(async (req, res) => {
  const { lessonId, body, at } = req.body || {};
  const text = String(body ?? '').trim();
  if (!text) throw ApiError.badRequest('A note needs some text');

  const lesson = await lessonForLearner(req.user._id, lessonId);
  const note = await Note.create({
    user: req.user._id,
    course: lesson.course,
    lesson: lesson._id,
    body: text,
    at: Number.isFinite(Number(at)) ? Math.max(0, Math.trunc(Number(at))) : null,
  });

  const [withCtx] = await withContext([note.toObject()]);
  return created(res, withCtx);
});

// PATCH /lms/notes/:id  { body }
export const updateNote = asyncHandler(async (req, res) => {
  const text = String(req.body?.body ?? '').trim();
  if (!text) throw ApiError.badRequest('A note needs some text');

  // Scoped to the caller in the query itself, so a note that belongs to someone
  // else is a 404 rather than a 403 — the difference between the two would
  // confirm the id exists.
  const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
  if (!note) throw ApiError.notFound('Note not found');

  note.body = text;
  await note.save();

  const [withCtx] = await withContext([note.toObject()]);
  return ok(res, withCtx);
});

// DELETE /lms/notes/:id
export const removeNote = asyncHandler(async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!note) throw ApiError.notFound('Note not found');
  return noContent(res);
});

// GET /lms/bookmarks
export const listBookmarks = asyncHandler(async (req, res) => {
  const rows = await Bookmark.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  return ok(res, await withContext(rows));
});

// POST /lms/bookmarks  { lessonId, at, label }
export const createBookmark = asyncHandler(async (req, res) => {
  const { lessonId, at, label } = req.body || {};
  const lesson = await lessonForLearner(req.user._id, lessonId);
  const second = Number.isFinite(Number(at)) ? Math.max(0, Math.trunc(Number(at))) : null;

  // The unique index treats (user, lesson, at) as the identity of a bookmark, so
  // a second press on the same moment updates the label instead of failing.
  const bookmark = await Bookmark.findOneAndUpdate(
    { user: req.user._id, lesson: lesson._id, at: second },
    {
      $set: { label: String(label ?? '').trim().slice(0, 200) },
      $setOnInsert: { user: req.user._id, course: lesson.course, lesson: lesson._id, at: second },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  const [withCtx] = await withContext([bookmark]);
  return created(res, withCtx);
});

// DELETE /lms/bookmarks/:id
export const removeBookmark = asyncHandler(async (req, res) => {
  const row = await Bookmark.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!row) throw ApiError.notFound('Bookmark not found');
  return noContent(res);
});
