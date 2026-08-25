import { Module } from '../../../models/Module.js';
import { Lesson } from '../../../models/Lesson.js';

/* ---------------------------------------------------------------------------
   Turning a course into the material the coach may answer from.

   THIS IS THE REAL GUARDRAIL. The system prompt tells the coach to stay on the
   course; this decides what "the course" even is. A prompt instruction can be
   argued with — a learner can talk a model into ignoring one. A model that was
   never given anything except these lessons has nothing else to answer from.

   So the rule that keeps the coach clear of the Procurement Advisor (A6) is not
   really a sentence in a prompt. It is that this function only ever returns
   lessons from one course the learner is enrolled in.

   ---- Why the whole course, and no vector database --------------------------

   The obvious build is embeddings + a vector store + chunk retrieval. This does
   not do that, and the omission is deliberate: current models take a very large
   context, and a course is small next to it. Sending the whole thing means no
   embedding pipeline to run, no index to rebuild every time an instructor fixes
   a typo, and no retrieval step quietly dropping the one lesson that held the
   answer.

   It also means the coach reads the course IN ORDER, so "this builds on the
   evaluation module" is something it can see rather than infer from three
   disconnected fragments.

   If a course ever outgrows the window, TRIM_* below is where it starts to
   bite, and this is the one function to change — everything downstream just
   receives documents.
   ------------------------------------------------------------------------ */

// A guard against one pathological course rather than a working budget: a
// course this size is already beyond what a learner can hold, and the coach
// should still answer rather than fail.
const MAX_DOCUMENTS = 120;
const MAX_CHARS_PER_LESSON = 24_000;

// Cheap tag strip. Lesson bodies are authored HTML, and the model does not need
// the markup — it costs tokens and gets cited back with angle brackets in it.
function plainText(html) {
  return String(html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* A video lesson's words are its transcript. Cues are joined back into prose
   rather than left as timecoded fragments: the model is answering questions
   about what was taught, not scrubbing a timeline, and a citation lands on the
   lesson either way. */
const transcriptText = (cues) =>
  (cues ?? []).map((c) => c.text).filter(Boolean).join(' ').trim();

// What a lesson contributes, by kind. A quiz contributes nothing: its questions
// carry the answer key, and handing that to something a learner can talk to is
// how the coach becomes a way to pass a quiz without doing the course.
function bodyFor(lesson) {
  if (lesson.kind === 'quiz') return '';
  const written = plainText(lesson.body);
  const spoken = transcriptText(lesson.transcript);
  if (written && spoken) return `${written}\n\n${spoken}`;
  return written || spoken;
}

/* The course as citable documents, in course order.

   Each document is titled with the lesson so a citation reads as somewhere the
   learner can actually go, and carries `lessonId` so the screen can link to it.
   `context` is metadata the model may read but not quote — the module name and
   position live there rather than in the citable body, so a citation is always
   a piece of the lesson itself. */
export async function courseDocuments(courseId) {
  const [modules, lessons] = await Promise.all([
    Module.find({ course: courseId }).sort({ order: 1 }).select('title order').lean(),
    Lesson.find({ course: courseId }).sort({ order: 1 }).select('title kind body transcript module order').lean(),
  ]);

  const moduleById = new Map(modules.map((m) => [String(m._id), m]));
  // Course order, not insertion order: lessons sort within their module, and
  // modules sort against each other.
  const ordered = [...lessons].sort((a, b) => {
    const ma = moduleById.get(String(a.module))?.order ?? 0;
    const mb = moduleById.get(String(b.module))?.order ?? 0;
    return ma - mb || (a.order ?? 0) - (b.order ?? 0);
  });

  const documents = [];
  for (const lesson of ordered) {
    if (documents.length >= MAX_DOCUMENTS) break;

    const text = bodyFor(lesson);
    // A lesson with no words in it — an unwritten draft, a video with no
    // transcript — is not something to cite. Sending an empty document invites
    // the model to cite a blank.
    if (!text) continue;

    const moduleTitle = moduleById.get(String(lesson.module))?.title ?? '';

    documents.push({
      lessonId: String(lesson._id),
      title: moduleTitle ? `${moduleTitle} · ${lesson.title}` : lesson.title,
      moduleTitle,
      context: `Lesson ${documents.length + 1} of this course${moduleTitle ? `, in the module "${moduleTitle}"` : ''}.`,
      text: text.slice(0, MAX_CHARS_PER_LESSON),
    });
  }

  return documents;
}
