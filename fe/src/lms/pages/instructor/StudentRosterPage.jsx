import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import ProgressBar from '../../components/progress/ProgressBar.jsx';
import RosterTable from '../../components/instructor/RosterTable.jsx';
import { useCourseRoster } from '../../hooks/useInstructor.js';

// One course's learners (R1). Its own page rather than a panel under the
// courses table: a roster is the whole reason for coming here, and it should
// have the screen rather than be pushed below a list of everything else.
export default function StudentRosterPage() {
  const { courseId } = useParams();
  const { status, error, course, students, lessonCount } = useCourseRoster(courseId);

  // Derived from the roster already in hand rather than fetched again. The
  // counts on the previous screen come from the same numbers, so they agree.
  const stats = useMemo(() => {
    const active = students.filter((s) => !s.revokedAt);
    return {
      enrolled: active.length,
      completed: active.filter((s) => s.completedAt).length,
      started: active.filter((s) => s.lessonsDone > 0).length,
      average: active.length
        ? Math.round(active.reduce((sum, s) => sum + s.percent, 0) / active.length)
        : 0,
    };
  }, [students]);

  const back = (
    <Link className="lms-backlink" to="/learn/instructor/students">
      <LmsIcon name="chevron" className="lms-backlink__icon" />
      Enrolments
    </Link>
  );

  if (status === 'loading' || status === 'idle') {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            {back}
            <h1 className="lms-page__title">Learners</h1>
          </div>
        </div>
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '38%', height: 22 }} />
          <span className="lms-skel lms-skel--bar" style={{ marginTop: 20 }} />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            {back}
            <h1 className="lms-page__title">Course not found</h1>
            <p className="lms-page__subtitle">
              {error ?? 'This course doesn’t exist, or it isn’t yours.'}
            </p>
          </div>
        </div>
        <Link className="lms-btn lms-btn--primary" to="/learn/instructor/students">
          Back to enrolments
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="lms-page__head">
        <div>
          {back}
          <h1 className="lms-page__title">{course?.title}</h1>
          <p className="lms-page__subtitle">
            Who’s enrolled on this course and how far they’ve got.
          </p>
        </div>
        <div className="lms-page__actions">
          <Link className="lms-btn" to={`/learn/courses/${course?.slug}`}>
            <LmsIcon name="eye" />
            View course
          </Link>
          <Link className="lms-btn lms-btn--primary" to={`/learn/instructor/courses/${courseId}`}>
            <LmsIcon name="note" />
            Edit course
          </Link>
        </div>
      </div>

      <div className="lms-dash-row" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        {[
          { icon: 'users', label: 'Enrolled', value: stats.enrolled, hint: `${lessonCount} lessons` },
          { icon: 'play', label: 'Started', value: stats.started, hint: 'Opened a lesson' },
          { icon: 'check', label: 'Completed', value: stats.completed, hint: 'Finished every lesson' },
          { icon: 'chart', label: 'Average', value: `${stats.average}%`, hint: 'Across everyone enrolled' },
        ].map((s) => (
          <span key={s.label} className="lms-stat is-static">
            <span className="lms-stat__icon"><LmsIcon name={s.icon} /></span>
            <span>
              <span className="lms-stat__label">{s.label}</span>
              <span className="lms-stat__value">{s.value}</span>
              <span className="lms-stat__hint">{s.hint}</span>
            </span>
          </span>
        ))}
      </div>

      {stats.enrolled ? (
        <section className="lms-card" style={{ marginTop: 18 }}>
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="chart" />
              How the cohort is going
            </h2>
          </div>
          <ProgressBar
            percent={stats.average}
            complete={stats.average === 100}
            left={`${stats.average}% average completion`}
            right={
              <span>
                {stats.completed} of {stats.enrolled} finished
              </span>
            }
          />
        </section>
      ) : null}

      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="users" />
            Learners
          </h2>
        </div>
        <RosterTable students={students} lessonCount={lessonCount} />
      </section>
    </div>
  );
}
