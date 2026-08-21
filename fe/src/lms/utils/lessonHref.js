// Where a lesson opens, by kind:
//   video    the secure player (L2)
//   youtube  the same player, showing an embed instead of a signed source
//   doc      the document reader
//   quiz     the quiz runner (L3)
//   other    the text lesson (L1)
// A free preview on a course the learner hasn't bought has its own route, so it
// works before purchase.
//
// This lived in four components and had already drifted, two handled previews
// and two didn't, so the same lesson linked to different places depending on
// which list you clicked it from. The drift is also what sent a learner
// returning to a video lesson to the TEXT screen, which told them the lesson
// had no written content — because that screen is the one that says that.
//
// Everything that links to a lesson calls this. Nothing builds the path itself.
export function lessonHref(slug, lesson) {
  if (!lesson) return `/learn/courses/${slug}`;

  // Callers hand us either an outline entry (`id`), a Mongo document (`_id`) or
  // the enrolment's "up next" (`id`). One accessor, so a missing one isn't
  // silently stringified into the URL.
  const id = lesson.id ?? lesson._id;
  if (!id) return `/learn/courses/${slug}`;

  // A quiz is an attempt recorded against a person, so it goes to the quiz
  // route even when the lesson is flagged as a preview. There is no signed-out
  // way to sit one.
  if (lesson.kind === 'quiz') return `/learn/courses/${slug}/quiz/${id}`;

  // A free preview has its own route family: the same screens, without the
  // sign-in requirement. Picking by KIND here rather than defaulting to the
  // text screen is the whole point — this branch used to return one URL for
  // every preview, so a preview VIDEO landed on the text page and was told it
  // "doesn't have any written content yet", which is the exact drift the note
  // above says this function exists to stop.
  if (lesson.preview && lesson.gate) {
    const base = `/learn/courses/${slug}/preview/${id}`;
    if (lesson.kind === 'video' || lesson.kind === 'youtube') return `${base}/watch`;
    if (lesson.kind === 'doc') return `${base}/doc`;
    return base;
  }

  // Uploaded video and a YouTube embed are different screens: one plays a
  // signed, expiring source with a watermark, the other an iframe. They share
  // the /watch route because to a learner they are both "watch this".
  if (lesson.kind === 'video' || lesson.kind === 'youtube') {
    return `/learn/courses/${slug}/watch/${id}`;
  }
  if (lesson.kind === 'doc') return `/learn/courses/${slug}/doc/${id}`;
  return `/learn/courses/${slug}/lessons/${id}`;
}
