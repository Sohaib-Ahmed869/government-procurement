import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import DonutChart from '../../components/progress/DonutChart.jsx';
import SessionCalendar from '../../components/growth/SessionCalendar.jsx';
import { useInstructorCourses, summariseCourses } from '../../hooks/useInstructor.js';
import { useAuthoredSessions, formatSessionClock, relativeTo } from '../../hooks/useLiveSessions.js';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';
import { firstNameOf } from '../../utils/names.js';

/* ---------------------------------------------------------------------------
   The instructor's home (R1).

   Built to the same shape as the learner's dashboard, because it answers the
   same question from the other side of the course: a KPI row, then a band of
   two cards — one that says where the work landed, one that says what is
   coming — then the list.

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

  /* The four headline figures, drawn as the learner's are.

     Each one carries a supporting line, because on this side of the course
     every headline has an obvious follow-up question: how many of those courses
     are actually live, how many of those lessons have video, how many people
     left the rating. A tile that answers only the first is half a tile. */
  const tiles = [
    {
      key: 'courses',
      icon: 'book',
      label: 'Courses',
      value: s.courses,
      hint: s.courses
        ? `${s.published} published${s.pending ? `, ${s.pending} in review` : ''}`
        : 'Nothing created yet',
      to: '/learn/instructor/courses',
    },
    {
      key: 'learners',
      icon: 'users',
      // Enrolments, not people: someone taking two of these courses is two
      // enrolments and one person. The label says what is counted.
      label: 'Enrolments',
      value: s.learners.toLocaleString('en-AU'),
      hint: s.withLearners
        ? `Across ${s.withLearners} of ${s.courses} courses`
        : 'Nobody enrolled yet',
      to: '/learn/instructor/students',
    },
    {
      key: 'lessons',
      icon: 'lessons',
      label: 'Lessons published',
      value: s.lessons,
      hint: s.missingTranscripts
        ? `${s.missingTranscripts} without a transcript`
        : 'All videos transcribed',
      direction: s.missingTranscripts ? 'down' : undefined,
      to: '/learn/instructor/courses',
    },
    {
      key: 'rating',
      icon: 'star',
      label: 'Average rating',
      value: s.averageRating ?? '-',
      hint: s.ratedCount
        ? `${s.ratedCount} ${s.ratedCount === 1 ? 'course' : 'courses'} rated`
        : 'No ratings yet',
      to: '/learn/instructor/reviews',
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
          {/* ---- the headline row ---- */}
          <div className="lms-kpis">
            {tiles.map((t) => (
              <Link key={t.key} to={t.to} className="lms-stat lms-kpi">
                <span className="lms-kpi__top">
                  <span className="lms-stat__label">{t.label}</span>
                  <span className="lms-stat__icon"><LmsIcon name={t.icon} /></span>
                </span>
                <span className="lms-stat__value">{t.value}</span>
                <span className={`lms-stat__hint${t.direction ? ` is-${t.direction}` : ''}`}>
                  {t.hint}
                </span>
              </Link>
            ))}
          </div>

          {/* ---- where the learners are, and what is scheduled ---- */}
          <div className="lms-dash-row">
            {/* `--centre` puts the ring in the middle of the card's height
                rather than under the heading with the rest of the card empty;
                `lms-donut-lead` lets the legend use the width of the wide
                column, which the learner's third-of-a-row donut has not got. */}
            <section className="lms-card lms-card--centre lms-donut-lead">
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

            <section className="lms-card">
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
          </div>

          {/* The one piece of work worth surfacing: video without transcripts. */}
          {s.missingTranscripts > 0 ? (
            <section className="lms-card lms-todo" style={{ marginBottom: 12 }}>
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

          <section className="lms-card">
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
        </>
      )}
    </div>
  );
}
