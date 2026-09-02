import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import DonutChart from '../../components/progress/DonutChart.jsx';
import ProgressRing from '../../components/progress/ProgressRing.jsx';
import SessionCalendar from '../../components/growth/SessionCalendar.jsx';
import { useInstructorCourses, summariseCourses } from '../../hooks/useInstructor.js';
import { useAuthoredSessions, formatSessionClock, relativeTo } from '../../hooks/useLiveSessions.js';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';
import { firstNameOf } from '../../utils/names.js';

/* ---------------------------------------------------------------------------
   The instructor's home (R1).

   Built to the same shape as the learner's dashboard, because it answers the
   same question from the other side of the course. It shares that page's grid
   and its figures panel outright — .lms-dash-grid with a different set of named
   areas, and .lms-gauges unchanged — so the two dashboards cannot drift into
   looking like two products.

   The one structural difference is Your courses, which runs the full width at
   the foot. It grows by a row per course, and pairing a card that grows against
   one that does not guarantees a hole in whichever is shorter — and guarantees
   the hole moves as courses are added. Everything above it is fixed height.

   Everything on it comes from two requests, and deliberately only two:

     GET /lms/authoring/courses      the tiles, the donut and the course list
     GET /lms/authoring/live-sessions the calendar

   The donut is drawn from the course list already in hand rather than from
   /authoring/enrollments, which returns the same enrolment counts with a roster
   rollup this page has nothing to do with. The tiles are computed with
   summariseCourses() for the same reason — useInstructorSummary() beside
   useInstructorCourses() fetched the course list twice on every load.

   NO ACTIVITY CHART. The learner dashboard's line is minutes over time, read
   from GET /lms/activity; there is no instructor equivalent, and nothing in the
   authoring API exposes enrolments as a daily series. A trend line drawn from
   the one date the summary does carry would be a chart of one point.
   ------------------------------------------------------------------------ */

function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/* Beyond this many courses the donut's slices are thinner than its stroke and
   the legend is longer than the card. Same ceiling the learner's donut uses,
   and the same treatment past it: the rest are summed into one row, which is
   honest and readable where fourteen slivers are neither. */
const MAX_SLICES = 5;

export default function InstructorDashboardPage() {
  const { user } = useStudentAuth();
  const { courses, status, error } = useInstructorCourses();
  // Its own request and its own status: the sessions card says it is loading
  // while the rest of the page is already usable, rather than holding
  // everything back for a card most instructors have nothing in.
  const live = useAuthoredSessions();

  const s = useMemo(() => summariseCourses(courses), [courses]);

  const now = new Date();
  // Empty rather than firstNameOf's "there" default: the greeting is one line
  // now, and "Good afternoon, there" is worse than "Good afternoon".
  const firstName = firstNameOf(user?.name, '');

  /* Enrolments per course, biggest first, collected past MAX_SLICES.

     Courses with nobody in them are dropped rather than drawn as a zero-length
     slice: an empty course is a real thing for the author to know about, but a
     donut is a picture of a quantity being divided up and a slice of none
     divides nothing. The card's note says how many were left out. */
  const mix = useMemo(() => {
    const enrolled = courses
      .filter((c) => (c.learners ?? 0) > 0)
      .sort((a, b) => b.learners - a.learners)
      .map((c) => ({ id: String(c._id), label: c.title, value: c.learners }));

    if (enrolled.length <= MAX_SLICES) return enrolled;
    const head = enrolled.slice(0, MAX_SLICES - 1);
    const tail = enrolled.slice(MAX_SLICES - 1);
    return [
      ...head,
      {
        id: 'other',
        label: `${tail.length} other courses`,
        value: tail.reduce((n, c) => n + c.value, 0),
      },
    ];
  }, [courses]);

  /* The soonest session still to come — live now first, then the next by time.

     useAuthoredSessions returns one flat list newest-first (the instructor's
     page splits it itself), so unlike the learner's dashboard this has to do
     its own filtering before it can sort. */
  const next = useMemo(
    () =>
      live.sessions
        .filter((x) => x.state === 'upcoming' || x.state === 'live')
        .sort(
          (a, b) =>
            (b.state === 'live') - (a.state === 'live') ||
            Date.parse(a.startsAt) - Date.parse(b.startsAt),
        )[0] ?? null,
    [live.sessions],
  );

  /* The four headline figures, drawn exactly as the learner's are: a ring where
     there is a real whole to be a part of, the figure itself where there is
     not, and a state pill under each.

     Two have a whole. Courses published is of every course authored, and a
     rating is of five — so the rating's ring draws 4.6/5 as a 92% arc while its
     centre still reads "4.6", because 92% is a number the instructor never
     asked about. Enrolments and lessons have no ceiling and get no arc, the
     same rule the learner's dashboard follows. */
  const gauges = [
    {
      key: 'courses',
      label: 'Courses published',
      value: s.published,
      percent: s.courses ? (s.published / s.courses) * 100 : null,
      to: '/learn/instructor/courses',
      pill: s.courses
        ? `${s.published} of ${s.courses}${s.pending ? `, ${s.pending} in review` : ''}`
        : 'Nothing created yet',
      tone: s.courses && s.published === s.courses ? 'good' : '',
    },
    {
      key: 'learners',
      // Enrolments, not people: someone taking two of these courses is two
      // enrolments and one person. The label says what is counted.
      label: 'Enrolments',
      value: s.learners.toLocaleString('en-AU'),
      to: '/learn/instructor/students',
      pill: s.withLearners
        ? `Across ${s.withLearners} of ${s.courses} courses`
        : 'Nobody enrolled yet',
      tone: s.learners > 0 ? 'good' : '',
    },
    {
      key: 'lessons',
      label: 'Lessons published',
      value: s.lessons,
      to: '/learn/instructor/courses',
      pill: s.missingTranscripts
        ? `${s.missingTranscripts} without a transcript`
        : 'All videos transcribed',
      // Green either way. The count is a fact about the library, not a fault to
      // be flagged twice — the alert above the grid is what asks for the work,
      // and amber here made the same point a second time in the one colour on
      // the page that is not the brand's.
      tone: 'good',
    },
    {
      key: 'rating',
      label: 'Average rating',
      value: s.averageRating ?? '—',
      // Out of five, which is the whole a rating is a part of.
      percent: s.averageRating ? (Number(s.averageRating) / 5) * 100 : null,
      display: s.averageRating ?? undefined,
      to: '/learn/instructor/reviews',
      pill: s.ratedCount
        ? `${s.ratedCount} ${s.ratedCount === 1 ? 'course' : 'courses'} rated`
        : 'No ratings yet',
      tone: Number(s.averageRating) >= 4 ? 'good' : '',
    },
  ];

  return (
    /* `lms-dash` is what scopes the tighter card and tile metrics to a
       dashboard — see the note in lms.css. The instructor's other screens are
       lists that scroll anyway and keep their own breathing room. */
    <div className="lms-dash">
      {/* Matches the learner dashboard, which dropped the solid green band for
          the page head every other LMS screen uses. This page renders the same
          component; leaving it would have been the same block on one dashboard
          and not the other. */}
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">
            {greeting(now.getHours())}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="lms-page__subtitle">
            {status === 'loading'
              ? 'Loading your courses…'
              : s.courses
                ? `You’re teaching ${s.courses} course${s.courses === 1 ? '' : 's'} to ${s.learners.toLocaleString('en-AU')} enrolment${s.learners === 1 ? '' : 's'}.`
                : 'Nothing published yet. Build your first course and it’ll show up here.'}
          </p>
        </div>
        <p className="lms-page__date">
          <LmsIcon name="calendar" />
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
          {/* The one piece of work worth interrupting for. Above the grid, not
              in it: it is an alert about something to go and fix, and it is
              absent entirely on an account with nothing outstanding — an area
              in the grid that disappears would leave the row it sat in. */}
          {s.missingTranscripts > 0 ? (
            <section className="lms-card lms-todo">
              <span className="lms-todo__icon">
                <LmsIcon name="text" />
              </span>
              <div className="lms-todo__body">
                <p className="lms-todo__title">
                  {s.missingTranscripts} video lesson{s.missingTranscripts === 1 ? '' : 's'} without a transcript
                </p>
                <p className="lms-todo__text">
                  Transcripts make lessons searchable and usable without sound, and they’re
                  required for accessibility.
                </p>
              </div>
              <Link className="lms-btn lms-btn--primary lms-btn--sm" to="/learn/instructor/courses">
                Review courses
              </Link>
            </section>
          ) : null}

          <div className="lms-dash-grid lms-dash-grid--instructor">
            {/* The learner dashboard's figures panel, unchanged: four readings
                in one bordered card, two per row, spanning the first two rows
                of the right column. */}
            <section className="lms-card lms-gauges">
              <div className="lms-gauges__row">
                {gauges.map((g) => (
                  <Link key={g.key} to={g.to} className="lms-gauge">
                    <span className="lms-gauge__mark">
                      {g.percent === null || g.percent === undefined ? (
                        <span className="lms-gauge__figure">{g.value}</span>
                      ) : (
                        <ProgressRing
                          percent={g.percent}
                          display={g.display}
                          label={g.label}
                          size={108}
                          stroke={10}
                        />
                      )}
                    </span>
                    <span className="lms-gauge__label">{g.label}</span>
                    <span className={`lms-gauge__pill${g.tone ? ` is-${g.tone}` : ''}`}>{g.pill}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* `--centre` puts the ring in the middle of the card's height
                rather than under the heading with the rest of the card empty;
                `lms-donut-lead` lets the legend use the width of the wide
                column, which the learner's third-of-a-row donut has not got. */}
            <section className="lms-card lms-card--centre lms-donut-lead lms-dash-mix">
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <LmsIcon name="pie" />
                  Enrolments by course
                </h2>
                {/* Says outright how many courses are NOT in the ring, so a
                    donut with two slices on an account with ten courses does
                    not read as eight courses having gone missing. */}
                {s.courses > s.withLearners ? (
                  <span className="lms-card__note">
                    {s.courses - s.withLearners} with no enrolments
                  </span>
                ) : null}
                <Link className="lms-btn lms-btn--sm lms-btn--ghost" to="/learn/instructor/students">
                  View all
                </Link>
              </div>

              {mix.length === 0 ? (
                <p className="lms-empty">
                  {s.courses
                    ? 'Nobody has enrolled yet. Once they do, this shows which courses they’re in.'
                    : 'Publish a course and this will show where your learners are.'}
                </p>
              ) : (
                <DonutChart
                  data={mix}
                  total={s.learners}
                  totalLabel={s.learners === 1 ? 'enrolment' : 'enrolments'}
                  caption="Active enrolments, by course"
                />
              )}
            </section>

            <section className="lms-card lms-dash-live">
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <LmsIcon name="video" />
                  Live sessions
                </h2>
                {/* The month sits in the heading row rather than above the
                    grid: on a card this size a line of its own is 28px the
                    calendar needs more. */}
                <span className="lms-card__note lms-cal__month">
                  {now.toLocaleDateString('en-AU', { month: 'long' })}
                </span>
                <Link className="lms-btn lms-btn--sm lms-btn--ghost" to="/learn/instructor/live">
                  View all
                </Link>
              </div>

              {live.status === 'loading' && <p className="lms-empty">Loading your sessions…</p>}
              {live.status === 'error' && (
                <p className="lms-empty">We couldn’t load your sessions just now.</p>
              )}

              {/* The same calendar the learner's dashboard draws, from the
                  instructor's own list. It says which month it is, where today
                  sits in it, and whether anything is booked — and it says all
                  three even when the answer to the last one is no, which is
                  what earns it the space on an account with nothing scheduled.
                  The full list is a click away on /learn/instructor/live. */}
              {live.status === 'ready' && (
                <>
                  <SessionCalendar sessions={live.sessions} />

                  {next ? (
                    <Link className="lms-cal__next" to="/learn/instructor/live">
                      <span
                        className={`lms-cal__next-dot${next.state === 'live' ? ' is-live' : ''}`}
                        aria-hidden="true"
                      />
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
                      Nothing scheduled. Sessions you book appear here.
                    </p>
                  )}
                </>
              )}
            </section>

            <section className="lms-card lms-dash-courses">
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <LmsIcon name="book" />
                  Your courses
                </h2>
                <Link className="lms-btn lms-btn--sm lms-btn--ghost" to="/learn/instructor/courses">
                  View all
                </Link>
              </div>

              {courses.length === 0 ? (
                <div className="lms-blank">
                  <LmsIcon name="book" className="lms-blank__icon" />
                  <h2>No courses yet</h2>
                  <p>
                    A course is modules, and a module is lessons. Start with the outline. You can
                    add video, transcripts and quizzes as you go.
                  </p>
                  <Link className="lms-btn lms-btn--primary" to="/learn/instructor/courses/new">
                    <LmsIcon name="plus" />
                    Create your first course
                  </Link>
                </div>
              ) : (
                <div className="lms-list">
                  {courses.map((c) => (
                    <Link key={c._id} to={`/learn/instructor/courses/${c._id}`} className="lms-list__item">
                      <span className="lms-list__icon"><LmsIcon name="book" /></span>
                      <span className="lms-list__body">
                        <span className="lms-list__title">{c.title}</span>
                        <span className="lms-list__meta">
                          {c.moduleCount} modules · {c.lessonCount} lessons · {c.learners.toLocaleString('en-AU')} enrolments
                        </span>
                      </span>
                      <span className="lms-list__trail">
                        {c.learners?.toLocaleString('en-AU') ?? 0} enrolled
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
