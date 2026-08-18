// Duration formatting, in one place.
//
// A `duration()` helper had been copy-pasted into six files. They agreed by
// luck rather than by construction, which is the kind of thing that drifts the
// moment one of them needs a tweak.

// Compact, for tight spots: "45m", "1h 35m", "6h".
export function formatDuration(minutes) {
  const n = Number(minutes) || 0;
  if (n <= 0) return '-';
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Long form for the catalogue card and course header, where the CMS previously
// had a free-text "duration label". Rounds to the nearest half hour above an
// hour. "6 hours" reads better than "5h 48m" on a marketing card, and nobody
// picks a course on eight minutes' difference.
export function formatCourseLength(minutes) {
  const n = Number(minutes) || 0;
  if (n <= 0) return '';
  if (n < 60) return `${n} minutes`;

  const hours = n / 60;
  const rounded = Math.round(hours * 2) / 2;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${label} ${rounded === 1 ? 'hour' : 'hours'}`;
}

// Total teaching time across a course's lessons. The number the label above is
// derived from, so the two can never disagree.
export function courseMinutes(course) {
  if (!course?.modules) return 0;
  return course.modules
    .flatMap((m) => m.lessons ?? [])
    .reduce((sum, l) => sum + (Number(l.minutes) || 0), 0);
}
