import { Link } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';
import ProgressBar from '../../components/progress/ProgressBar.jsx';
import { firstNameOf } from '../../utils/names.js';
import ActivityChart from '../../components/progress/ActivityChart.jsx';
import { useDashboard, relativeTime } from '../../hooks/useDashboard.js';

/* ---------------------------------------------------------------------------
   The learner's dashboard.

   Every number, name and date on it now comes from the API — see
   hooks/useDashboard.js, which also records what this page used to be: a block
   of constants that showed the same three courses, two certificates and four
   lines of activity to every account, including one that had enrolled in
   nothing.

   Two cards changed meaning in the swap, and deliberately:

     · "Upcoming" is "Next up". Nothing in the model carries a due date — no
       deadlines, no cohort schedule — so the only honest version of a list of
       things due is the next lesson waiting in each course.

     · "Recent activity" is assembled from certificates, quiz attempts and
       course progress rather than from an event log. There is no event log, and
       one written to fill five lines is a table to keep correct forever.
   ------------------------------------------------------------------------ */

const ICONS = {
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></>,
  award: <><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="m10 8.5 6 3.5-6 3.5z" /></>,
  quiz: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9.5 12.5a1.6 1.6 0 0 1 3 .6c0 1.1-1.5 1.3-1.5 2.2" /><path d="M11 18h.01" /></>,
  video: <><rect x="2" y="5" width="14" height="14" rx="2.5" /><path d="m16 10 6-3v10l-6-3z" /></>,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  bookmark: <><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  flame: <><path d="M12 3c3 3.5 5 6 5 9a5 5 0 0 1-10 0c0-1.6.6-3 1.7-4.4.4 1 1 1.7 1.8 2.1C10.3 7.6 11 5.2 12 3z" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></>,
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

function greeting(hour) {
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
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

export default function DashboardPage() {
  const { user } = useStudentAuth();
  const {
    resume, nextUp, recent, stats, activity, weekMinutes, streak, status, error,
  } = useDashboard();

  const now = new Date();
  // Signed out, "there" reads oddly as a heading on its own line, so the
  // greeting falls back to a plain welcome instead of a stand-in name.
  const firstName = user?.name ? firstNameOf(user.name) : 'Welcome back';

  const statTiles = [
    {
      key: 'inProgress',
      label: 'Courses in progress',
      value: stats.inProgress,
      hint: stats.enrolled ? `${stats.enrolled} enrolled` : 'Nothing enrolled yet',
      icon: 'book',
      to: '/learn/my-courses',
    },
    {
      key: 'certificates',
      label: 'Certificates earned',
      value: stats.certificates,
      hint: stats.quizzesPassed
        ? `${stats.quizzesPassed} ${stats.quizzesPassed === 1 ? 'quiz' : 'quizzes'} passed`
        : 'Finish a course to earn one',
      icon: 'award',
      to: '/learn/certificates',
    },
  ];

  return (
    <div>
      <section className="lms-greeting">
        <p className="lms-greeting__eyebrow">{greeting(now.getHours())}</p>
        <h1 className="lms-greeting__name">{firstName} 👋</h1>
        <p className="lms-greeting__text">
          {status === 'loading'
            ? 'Loading your courses…'
            : weekLine({ weekMinutes, streak, enrolled: stats.enrolled })}
        </p>
        <p className="lms-greeting__meta">
          <Icon name="calendar" />
          {now.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </section>

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
          <div className="lms-dash-row">
            {/* Continue learning */}
            <section className="lms-card">
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
                    <div style={{ flex: 1, minWidth: 240 }}>
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
                        This week <strong>{duration(weekMinutes)}</strong>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Two headline numbers, stacked beside the resume panel. */}
            <div className="lms-dash-stats">
              {statTiles.map((s) => (
                <Link key={s.key} to={s.to} className="lms-stat">
                  <span className="lms-stat__icon"><Icon name={s.icon} /></span>
                  <span>
                    <span className="lms-stat__label">{s.label}</span>
                    <span className="lms-stat__value" style={{ display: 'block' }}>{s.value}</span>
                    <span className="lms-stat__hint">{s.hint}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <section className="lms-card" style={{ marginBottom: 18 }}>
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <Icon name="chart" />
                Weekly activity
              </h2>
              <span className="lms-card__note">Minutes learned per day</span>
            </div>
            <ActivityChart data={activity} caption="Minutes learned per day" />
          </section>

          <div className="lms-dash-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <section className="lms-card">
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <Icon name="clock" />
                  Next up
                </h2>
                <Link className="lms-btn lms-btn--sm lms-btn--ghost" to="/learn/my-courses">
                  View all
                </Link>
              </div>
              <div className="lms-list">
                {nextUp.length === 0 ? (
                  <p className="lms-empty">
                    Nothing waiting. Enrol in a course to see what’s next.
                  </p>
                ) : (
                  nextUp.map((item) => (
                    <Link key={item.id} to={item.to} className="lms-list__item">
                      <span className="lms-list__icon">
                        <Icon name={item.locked ? 'lock' : KIND_ICON[item.kind] || 'video'} />
                      </span>
                      <span className="lms-list__body">
                        <span className="lms-list__title">{item.title}</span>
                        <span className="lms-list__meta">{item.meta}</span>
                      </span>
                      {item.locked && (
                        <span className="lms-list__trail">{item.lockReason || 'Locked'}</span>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="lms-card">
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <Icon name="check" />
                  Recent activity
                </h2>
                <Link className="lms-btn lms-btn--sm lms-btn--ghost" to="/learn/progress">
                  My progress
                </Link>
              </div>
              <div className="lms-list">
                {recent.length === 0 ? (
                  <p className="lms-empty">Your completed lessons will show up here.</p>
                ) : (
                  recent.map((item) => (
                    <span key={item.id} className="lms-list__item">
                      <span className="lms-list__icon"><Icon name={item.icon} /></span>
                      <span className="lms-list__body">
                        <span className="lms-list__title">{item.title}</span>
                        <span className="lms-list__meta">{item.meta}</span>
                      </span>
                      <span className="lms-list__trail">{relativeTime(item.at)}</span>
                    </span>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
