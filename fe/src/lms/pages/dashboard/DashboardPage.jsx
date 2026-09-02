import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';
import ProgressBar from '../../components/progress/ProgressBar.jsx';
import ProgressRing from '../../components/progress/ProgressRing.jsx';
import { firstNameOf } from '../../utils/names.js';
import ActivityChart from '../../components/progress/ActivityChart.jsx';
import DonutChart from '../../components/progress/DonutChart.jsx';
import SessionCalendar from '../../components/growth/SessionCalendar.jsx';
import { useDashboard } from '../../hooks/useDashboard.js';
import { useLiveSessions, formatSessionClock, relativeTo } from '../../hooks/useLiveSessions.js';

/* ---------------------------------------------------------------------------
   The learner's dashboard.

   Every number, name and date on it comes from the API — see
   hooks/useDashboard.js, which also records what this page used to be: a block
   of constants that showed the same three courses, two certificates and four
   lines of activity to every account, including one that had enrolled in
   nothing.

   THE LAYOUT fits one screen. That is the constraint everything else answers
   to: a dashboard you have to scroll is a page of cards, and the whole point of
   the format is seeing where you stand without moving.

   A KPI row over two bands, the thing you ACT on in the wide half:

     · four headline figures, the first one marked — the figure a learner opens
       the page for should not have to be found among four identical tiles;
     · minutes over time, beside where those minutes went;
     · what to resume, beside what is scheduled.

   NEXT UP and RECENT ACTIVITY are gone. Six cards would not sit on one screen
   without every one of them being squeezed, and those two were the pair worth
   losing: "next up" is the same lesson the resume panel already offers, and
   "recent activity" is a log of what has been done on a page about what to do
   next. My Courses and My Progress carry both in full.

   Two cards changed meaning when this page moved onto real data, and
   deliberately:

     · "Upcoming" is "Next up". Nothing in the model carries a due date — no
       deadlines, no cohort schedule — so the only honest version of a list of
       things due is the next lesson waiting in each course.

     · "Recent activity" is assembled from certificates, quiz attempts and
       course progress rather than from an event log. There is no event log, and
       one written to fill five lines is a table to keep correct forever.
   ------------------------------------------------------------------------ */

const ICONS = {
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="m10 8.5 6 3.5-6 3.5z" /></>,
  quiz: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9.5 12.5a1.6 1.6 0 0 1 3 .6c0 1.1-1.5 1.3-1.5 2.2" /><path d="M11 18h.01" /></>,
  video: <><rect x="2" y="5" width="14" height="14" rx="2.5" /><path d="m16 10 6-3v10l-6-3z" /></>,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  flame: <><path d="M12 3c3 3.5 5 6 5 9a5 5 0 0 1-10 0c0-1.6.6-3 1.7-4.4.4 1 1 1.7 1.8 2.1C10.3 7.6 11 5.2 12 3z" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></>,
  pie: <><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M14 2.6A9 9 0 0 1 21.4 10H14z" /></>,
  live: <><rect x="2" y="5" width="14" height="14" rx="2.5" /><path d="m16 10 6-3v10l-6-3z" /></>,
};

function Icon({ name, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name] || ICONS.book}
    </svg>
  );
}

// The mark for a lesson, so "next up" reads as the kind of thing it is.
const KIND_ICON = { video: 'video', document: 'doc', quiz: 'quiz' };

// "1h 35m" / "45m" / "-"
function duration(minutes) {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/* The same, but zero is "0m" rather than "-".

   "-" reads as "we don't know", which is right for a course whose remaining
   time cannot be computed and wrong for a week in which the learner did
   nothing — that is a known quantity and it is zero. Used wherever the figure
   is minutes LOGGED, so the headline tile and the "This week" fact under it
   cannot show the same number two different ways. */
function minutesLogged(minutes) {
  return minutes ? duration(minutes) : '0m';
}

function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// The one line under the name. It has to read for an account that has done
// nothing this week as well as one that has done six hours, and "You've learned
// 0m this week" is not the sentence to greet a new learner with.
function weekLine({ weekMinutes, streak, enrolled }) {
  if (!enrolled) return 'Browse the catalogue and enrol in your first course to get started.';
  if (weekMinutes > 0) {
    const run = streak > 1 ? ` That's ${streak} days in a row.` : '';
    return `You've learned ${duration(weekMinutes)} this week.${run} Pick up where you left off.`;
  }
  return 'Nothing logged this week yet. Pick up where you left off, or browse the catalogue.';
}

/* This week against last, as the headline tile's supporting line.

   Returns null rather than "+0%" where there is nothing to compare: a learner
   in their first week has no prior week, and inventing a baseline of zero makes
   every one of them infinitely up on nothing. */
function weekDelta(now, before) {
  if (!before) return null;
  const change = Math.round(((now - before) / before) * 100);
  if (change === 0) return { text: 'Level with last week', direction: 'flat' };
  return {
    text: `${change > 0 ? '+' : ''}${change}% vs last week`,
    direction: change > 0 ? 'up' : 'down',
  };
}

// The chart's range. Not a request each — useDashboard fetches thirty days once
// and the page slices, so pressing these is a re-render.
const RANGES = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
];

// Beyond this many courses the donut's slices are thinner than its stroke and
// the legend is longer than the card. The rest are summed into one row, which
// is honest and readable where fourteen slivers are neither.
const MAX_SLICES = 5;

export default function DashboardPage() {
  const { user } = useStudentAuth();
  const {
    resume, courseMix, stats, activity,
    weekMinutes, priorWeekMinutes, streak, status, error,
  } = useDashboard();
  // Its own request and its own status: the sessions card says it is loading
  // while the rest of the page is already usable, rather than holding
  // everything back for a card most learners have nothing in.
  const live = useLiveSessions();

  // The soonest session still to come — live now first, then the next by time.
  // The list is already split by state in useLiveSessions; this only has to
  // pick the front of it.
  const next = useMemo(
    () =>
      [...live.upcoming].sort(
        (a, b) =>
          (b.state === 'live') - (a.state === 'live') ||
          Date.parse(a.startsAt) - Date.parse(b.startsAt),
      )[0] ?? null,
    [live.upcoming],
  );

  const [range, setRange] = useState(7);
  const chartData = useMemo(() => activity.slice(-range), [activity, range]);

  const now = new Date();
  // Empty rather than a stand-in when there is no name: the greeting is one
  // line now, and "Good afternoon, there" is worse than "Good afternoon".
  const firstName = user?.name ? firstNameOf(user.name) : '';

  const delta = weekDelta(weekMinutes, priorWeekMinutes);
  const overall = stats.lessonsTotal
    ? Math.round((stats.lessonsDone / stats.lessonsTotal) * 100)
    : 0;

  const mix = useMemo(() => {
    if (courseMix.length <= MAX_SLICES) return courseMix;
    const head = courseMix.slice(0, MAX_SLICES - 1);
    const tail = courseMix.slice(MAX_SLICES - 1);
    return [
      ...head,
      {
        id: 'other',
        label: `${tail.length} other courses`,
        value: tail.reduce((n, c) => n + c.value, 0),
      },
    ];
  }, [courseMix]);

  /* The four headline figures, as one panel of gauges rather than four tiles.

     `percent` is set only where a real whole exists to be a part of. Minutes
     this week has no target in the model and certificates have no ceiling, so
     those two show their figure and no arc — see the note on .lms-gauges in
     lms.css. `pill` is the state each one is in, which is the thing a learner
     reads before the number.

     Minutes learned leads because it is the figure that MOVES; the other three
     change a handful of times a year. Order is left to right, which is enough. */
  const gauges = [
    {
      key: 'week',
      label: 'Learned this week',
      value: minutesLogged(weekMinutes),
      to: '/learn/progress',
      pill: delta?.text ?? (streak > 1 ? `${streak}-day streak` : 'Your first week'),
      tone: delta ? { up: 'good', down: 'warn', flat: '' }[delta.direction] : '',
    },
    {
      key: 'completed',
      label: 'Courses completed',
      value: stats.completed,
      // Of everything enrolled — the whole this is a part of.
      //
      // This was "Courses in progress", which drew the ring against the same
      // denominator and so read 100% for a learner who had finished nothing:
      // both their courses were under way, and the arc said done. Courses
      // FINISHED over courses enrolled is the figure that ring was claiming.
      percent: stats.enrolled ? (stats.completed / stats.enrolled) * 100 : null,
      to: '/learn/my-courses',
      pill: stats.enrolled ? `${stats.completed} of ${stats.enrolled} enrolled` : 'Nothing enrolled yet',
      tone: stats.enrolled && stats.completed === stats.enrolled ? 'good' : '',
    },
    {
      key: 'lessons',
      label: 'Lessons completed',
      value: stats.lessonsDone,
      percent: stats.lessonsTotal ? overall : null,
      to: '/learn/progress',
      pill: stats.lessonsTotal
        ? `${stats.lessonsDone} of ${stats.lessonsTotal} lessons`
        : 'Nothing enrolled yet',
      tone: stats.lessonsTotal && overall === 100 ? 'good' : '',
    },
    {
      key: 'certificates',
      label: 'Certificates earned',
      value: stats.certificates,
      to: '/learn/certificates',
      pill: stats.quizzesPassed
        ? `${stats.quizzesPassed} ${stats.quizzesPassed === 1 ? 'quiz' : 'quizzes'} passed`
        : 'Finish a course to earn one',
      tone: stats.certificates > 0 ? 'good' : '',
    },
  ];

  return (
    /* `lms-dash` is what scopes the tighter card and tile metrics to this page
       — see the note in lms.css. Badges and Certificates use the same
       components and keep their own breathing room. */
    <div className="lms-dash">
      {/* The same page head every other LMS screen uses.

          This was a full-width block of solid brand green with the greeting
          reversed out of it. It said nothing the plain version does not, and it
          put the loudest thing on the page above four tiles that are the actual
          content — the dashboard opened on decoration. Badges, Certificates and
          My Progress have all opened on .lms-page__head from the start; this
          now does too, and the KPI row is the first thing with any weight. */}
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">
            {greeting(now.getHours())}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="lms-page__subtitle">
            {status === 'loading'
              ? 'Loading your courses…'
              : weekLine({ weekMinutes, streak, enrolled: stats.enrolled })}
          </p>
        </div>
        <p className="lms-page__date">
          <Icon name="calendar" />
          {now.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {status === 'error' && (
        <div className="lms-card">
          <p className="lms-empty">{error}</p>
        </div>
      )}

      {status === 'loading' && (
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '38%', height: 22 }} />
          <span className="lms-skel lms-skel--bar" style={{ marginTop: 20 }} />
        </div>
      )}

      {status === 'ready' && (
        <>
          {/* Five panels on one grid, so every gutter between them is the
              same 14px — placement is by named area below, in lms.css. The
              figures panel spans the first two rows of the right column,
              which is what puts two of them beside the chart and two beside
              the donut without splitting it into two cards. */}
          <div className="lms-dash-grid">
            <section className="lms-card lms-dash-activity">
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <Icon name="chart" />
                  Learning activity
                </h2>
                {/* Ranges as a segmented control rather than a dropdown: three
                    options, and a select would hide two of them behind a click
                    to save no room. */}
                <span className="lms-segmented lms-segmented--sm" role="group" aria-label="Chart range">
                  {RANGES.map((r) => (
                    <button
                      key={r.days}
                      type="button"
                      className={`lms-segmented__btn${range === r.days ? ' is-active' : ''}`}
                      onClick={() => setRange(r.days)}
                      aria-pressed={range === r.days}
                    >
                      {r.label}
                    </button>
                  ))}
                </span>
              </div>
              <ActivityChart data={chartData} caption="Minutes learned per day" />
            </section>

            <section className="lms-card lms-gauges">
              <div className="lms-gauges__row">
                {gauges.map((g) => (
                  <Link key={g.key} to={g.to} className="lms-gauge">
                    <span className="lms-gauge__mark">
                      {g.percent === null || g.percent === undefined ? (
                        <span className="lms-gauge__figure">{g.value}</span>
                      ) : (
                        <ProgressRing percent={g.percent} label={g.label} size={108} stroke={10} />
                      )}
                    </span>
                    <span className="lms-gauge__label">{g.label}</span>
                    <span className={`lms-gauge__pill${g.tone ? ` is-${g.tone}` : ''}`}>{g.pill}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* `--centre` puts the donut in the middle of the card rather
                than under the heading with the rest of the card empty. */}
            <section className="lms-card lms-card--centre lms-dash-mix">
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <Icon name="pie" />
                  Where the time went
                </h2>
              </div>
              {mix.length === 0 ? (
                <p className="lms-empty">
                  Finish a lesson and this will show which courses your work is going into.
                </p>
              ) : (
                <DonutChart
                  data={mix}
                  total={stats.lessonsDone}
                  totalLabel={stats.lessonsDone === 1 ? 'lesson' : 'lessons'}
                  caption="Lessons completed, by course"
                />
              )}
            </section>

            {/* `--centre` because the grid's last row is as tall as the
                calendar beside it — without it the panel hangs from its heading
                over an empty card. */}
            <section className="lms-card lms-card--centre lms-dash-resume">
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <Icon name="play" />
                  Continue learning
                </h2>
                {streak > 1 && (
                  <span className="lms-pill lms-pill--due">
                    <Icon name="flame" /> {streak} day streak
                  </span>
                )}
              </div>

              {/* One box around the body, so the card can centre it as a
                  group — see .lms-card--centre. Three loose siblings give
                  `justify-content` nothing to take hold of.

                  NOT `lms-resume`: that class already exists as the mint
                  "pick up where you left off" strip used elsewhere, and reusing
                  the name gave this wrapper a border, a background and 32px of
                  padding and margin it never asked for. */}
              <div className="lms-card__body">
              {!resume ? (
                <>
                  <p className="lms-empty">
                    {stats.enrolled
                      ? 'You’ve finished everything you’re enrolled in. Nicely done.'
                      : 'You’re not enrolled in anything yet.'}
                  </p>
                  <div style={{ marginTop: 16 }}>
                    <Link className="lms-btn lms-btn--primary" to="/learn/catalog">
                      Browse the catalogue
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="lms-resume__course">{resume.courseTitle}</p>
                  {resume.lesson && (
                    <p className="lms-resume__lesson">
                      <Icon name={KIND_ICON[resume.lesson.kind] || 'video'} />
                      {resume.lesson.title}
                    </p>
                  )}

                  <div className="lms-resume__body">
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <ProgressBar
                        percent={resume.percent}
                        left={
                          <>
                            <strong>{resume.lessonsDone}</strong> of {resume.lessonsTotal} lessons
                          </>
                        }
                        right={<strong>{resume.percent}%</strong>}
                      />
                      <div style={{ marginTop: 18 }}>
                        {/* A gated next lesson links to the course, not to a
                            player that would turn the learner away. */}
                        <Link
                          className="lms-btn lms-btn--primary"
                          to={
                            resume.lesson && !resume.lesson.gate
                              ? `/learn/courses/${resume.courseSlug}/watch/${resume.lesson.id}`
                              : `/learn/courses/${resume.courseSlug}`
                          }
                        >
                          <Icon name="play" />
                          {resume.started ? 'Resume lesson' : 'Start course'}
                        </Link>
                      </div>
                    </div>

                    <div className="lms-resume__facts">
                      <span className="lms-fact">
                        Time left <strong>{duration(resume.minutesLeft)}</strong>
                      </span>
                      <span className="lms-fact">
                        This week <strong>{minutesLogged(weekMinutes)}</strong>
                      </span>
                    </div>
                  </div>
                </>
              )}
              </div>
            </section>

            <section className="lms-card lms-dash-live">
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <Icon name="live" />
                  Live sessions
                </h2>
                {/* The month sits in the heading row rather than above the
                    grid: on a card this size a line of its own is 28px the
                    calendar needs more. */}
                <span className="lms-card__note lms-cal__month">
                  {now.toLocaleDateString('en-AU', { month: 'long' })}
                </span>
                <Link className="lms-btn lms-btn--sm lms-btn--ghost" to="/learn/live">
                  View all
                </Link>
              </div>
              {live.status === 'loading' && <p className="lms-empty">Loading your sessions…</p>}
              {live.status === 'error' && (
                <p className="lms-empty">We couldn’t load your sessions just now.</p>
              )}

              {/* The month, then one line about the next thing in it.

                  This was a list of the next three sessions, which for most
                  learners is the sentence "nothing scheduled" most of the time.
                  The calendar earns the same space either way: it says which
                  month it is, where today sits in it, and whether anything is
                  coming — and it says all three even when the answer to the
                  last one is no. The full list is a click away on /learn/live,
                  which the card already links to. */}
              {live.status === 'ready' && (
                <>
                  <SessionCalendar sessions={live.sessions} />

                  {next ? (
                    <Link className="lms-cal__next" to="/learn/live">
                      <span className={`lms-cal__next-dot${next.state === 'live' ? ' is-live' : ''}`} aria-hidden="true" />
                      <span className="lms-cal__next-body">
                        <strong>{next.title}</strong>
                        <span>{formatSessionClock(next.startsAt, next.timezone)}</span>
                      </span>
                      <span className="lms-cal__next-when">
                        {next.state === 'live' ? 'Live now' : relativeTo(next.startsAt)}
                      </span>
                    </Link>
                  ) : (
                    <p className="lms-cal__none">
                      Nothing scheduled. Sessions your instructor books appear here.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
