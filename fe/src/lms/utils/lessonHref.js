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

  if (lesson.preview && lesson.gate) return `/learn/courses/${slug}/preview/${id}`;
  if (lesson.kind === 'quiz') return `/learn/courses/${slug}/quiz/${id}`;
  // Uploaded video and a YouTube embed are different screens: one plays a
  // signed, expiring source with a watermark, the other an iframe. They share
  // the /watch route because to a learner they are both "watch this".
  if (lesson.kind === 'video' || lesson.kind === 'youtube') {
    return `/learn/courses/${slug}/watch/${id}`;
  }
  if (lesson.kind === 'doc') return `/learn/courses/${slug}/doc/${id}`;
  return `/learn/courses/${slug}/lessons/${id}`;
}
