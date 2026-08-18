import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import OutlineTree from '../../components/curriculum/OutlineTree.jsx';
import ResourceList from '../../components/lesson/ResourceList.jsx';
import ProgressBar from '../../components/progress/ProgressBar.jsx';
import PriceTag from '../../components/catalog/PriceTag.jsx';
import EnrollButton from '../../components/catalog/EnrollButton.jsx';
import { useCourseOutline } from '../../hooks/useCourseOutline.js';
import { gateLabel, isLocked } from '../../utils/gating.js';
import { lessonHref } from '../../utils/lessonHref.js';

function duration(minutes) {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Course overview (L1). The syllabus lives here. Modules and lessons with each
// lesson's gate resolved (L4), free previews marked (L1), the learner's progress
// if enrolled (L3/L6), and the purchase box if not (C1/C2).
export default function CourseOverviewPage() {
  const { slug } = useParams();
  const { data, status, error, reload } = useCourseOutline(slug);

  if (status === 'loading') {
    return (
      <div className="lms-card">
        <span className="lms-skel lms-skel--line" style={{ width: '52%', height: 22 }} />
        <span className="lms-skel lms-skel--line" style={{ width: '34%', marginTop: 12 }} />
        <span className="lms-skel lms-skel--bar" style={{ marginTop: 22 }} />
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">Course not found</h1>
            <p className="lms-page__subtitle">
              That course doesn’t exist, or it isn’t published yet.
            </p>
          </div>
        </div>
        <Link className="lms-btn lms-btn--primary" to="/learn/courses">
          Browse the catalogue
        </Link>
      </div>
    );
  }

  // A request that failed is not a course that doesn't exist. Telling someone
  // to go back to the catalogue when the server is down sends them in circles.
  if (status === 'error') {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">Couldn’t load this course</h1>
            <p className="lms-page__subtitle">{error}</p>
          </div>
        </div>
        <button type="button" className="lms-btn lms-btn--primary" onClick={reload}>
          Try again
        </button>
      </div>
    );
  }

  const { course, enrolment, modules, detail, resources, offline } = data;
  const enrolled = Boolean(enrolment);
  // A course with no lessons yet is not a finished one, without the guard,
  // 0 >= 0 marks an empty course complete and offers a certificate for it.
  const done = enrolled && course.lessons > 0 && enrolment.lessonsDone >= course.lessons;
  const percent = enrolled ? enrolment.percent ?? 0 : 0;
  const nextLocked = isLocked(enrolment?.next?.gate);

  // One place decides where a lesson opens. This screen used to have its own
  // copy that knew about video and quizzes but not YouTube or documents, so
  // "Start course" on either of those opened the text screen.
  const nextHref = lessonHref(course.slug, enrolment?.next);

  return (
    <div className="lms-detail">
      {/* Said up front. Someone who kept a bookmark should learn straight away
          that the course has come down, and someone enrolled should be told
          their own access is unaffected rather than left wondering. */}
      {offline ? (
        <div className="lms-card lms-notice lms-notice--danger" style={{ marginBottom: 18 }}>
          <span className="lms-notice__icon"><LmsIcon name="lock" /></span>
          <div className="lms-notice__body">
            <p className="lms-notice__title">This course has been taken off the site</p>
            <p className="lms-notice__text">
              {enrolled
                ? 'It’s no longer open to new learners. Your enrolment still stands and everything here stays available to you.'
                : 'It isn’t available to enrol in at the moment.'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Hero ------------------------------------------------------------- */}
      <section className={`lms-detail__hero is-accent-${course.accent % 6}`}>
        <div className="lms-detail__hero-body">
          {enrolment?.path ? (
            <span className="lms-detail__path">
              <LmsIcon name="path" />
              {enrolment.path}
            </span>
          ) : null}
          <h1 className="lms-detail__title">{course.title}</h1>
          <p className="lms-detail__summary">{course.summary}</p>
          <ul className="lms-detail__facts">
            <li><LmsIcon name="user" /> {course.instructor.name}</li>
            <li><LmsIcon name="chart" /> {course.levelLabel}</li>
            {course.durationLabel ? (
              <li><LmsIcon name="clock" /> {course.durationLabel}</li>
            ) : null}
            {/* Ratings and learner counts aren't tracked yet and arrive null.
                Omitted rather than shown as 0.0, which would read as a badly
                reviewed course rather than a new one. */}
            {course.rating != null ? (
              <li><LmsIcon name="star" /> {course.rating.toFixed(1)} ({course.ratingCount})</li>
            ) : null}
            {course.learners != null ? (
              <li><LmsIcon name="users" /> {course.learners.toLocaleString('en-AU')} learners</li>
            ) : null}
          </ul>
        </div>
      </section>

      <div className="lms-detail__cols">
        {/* Main column -------------------------------------------------- */}
        <div className="lms-detail__main">
          {detail?.learnPoints?.length ? (
            <section className="lms-card">
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <LmsIcon name="check" />
                  What you’ll learn
                </h2>
              </div>
              <ul className="lms-learn">
                {detail.learnPoints.map((p) => (
                  <li key={p}>
                    <LmsIcon name="check" className="lms-learn__tick" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="lms-card" style={{ marginTop: 18 }}>
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <LmsIcon name="modules" />
                Course content
              </h2>
              {!enrolled ? (
                <span className="lms-card__note">Preview lessons are free to open</span>
              ) : null}
            </div>
            <OutlineTree
              slug={course.slug}
              modules={modules}
              nextLessonId={enrolment?.next?.id}
            />
          </section>

          {detail?.requirements?.length ? (
            <section className="lms-card" style={{ marginTop: 18 }}>
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <LmsIcon name="lessons" />
                  Requirements
                </h2>
              </div>
              <ul className="lms-bullets">
                {detail.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {detail?.whoShouldTake?.length ? (
            <section className="lms-card" style={{ marginTop: 18 }}>
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <LmsIcon name="users" />
                  Who should take this course
                </h2>
              </div>
              <div className="lms-audience">
                {detail.whoShouldTake.map((w) => (
                  <div className="lms-audience__item" key={w.title}>
                    <h3>{w.title}</h3>
                    <p>{w.text}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Side column -------------------------------------------------- */}
        <aside className="lms-detail__side">
          <div className="lms-card lms-detail__box">
            {enrolled ? (
              <>
                <h2 className="lms-card__title">Your progress</h2>
                <ProgressBar
                  percent={percent}
                  complete={done}
                  left={
                    <>
                      <strong>{enrolment.lessonsDone}</strong> of {course.lessons} lessons
                    </>
                  }
                  right={<strong>{percent}%</strong>}
                />

                <div className="lms-detail__cta">
                  {done ? (
                    enrolment.certificate ? (
                      <Link
                        className="lms-btn lms-btn--mint lms-btn--block"
                        to={`/learn/certificates/${enrolment.certificate.id}`}
                      >
                        <LmsIcon name="award" />
                        View certificate
                      </Link>
                    ) : (
                      <span className="lms-pill lms-pill--done">Course complete</span>
                    )
                  ) : nextLocked ? (
                    <>
                      <button className="lms-btn lms-btn--block" type="button" disabled>
                        <LmsIcon name="lock" />
                        {gateLabel(enrolment.next.gate)}
                      </button>
                      <p className="lms-detail__note">
                        The rest of this course opens on schedule. You’ll keep access to
                        everything you’ve already unlocked.
                      </p>
                    </>
                  ) : (
                    <Link className="lms-btn lms-btn--primary lms-btn--block" to={nextHref}>
                      <LmsIcon name="play" />
                      {enrolment.lessonsDone > 0 ? 'Resume lesson' : 'Start course'}
                    </Link>
                  )}
                </div>

                {!done && enrolment.minutesLeft ? (
                  <p className="lms-detail__note">
                    About {duration(enrolment.minutesLeft)} of content left.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <div className="lms-detail__price">
                  <PriceTag price={course.price} currency={course.currency} size="lg" />
                </div>
                {/* No enrol button on a course that's been taken down. The
                    server refuses the enrolment, so offering it would only
                    produce an error. Reachable here as staff or its author. */}
                {offline ? (
                  <p className="lms-detail__note">
                    Enrolment is closed while this course is off the site.
                  </p>
                ) : (
                  <>
                    <div className="lms-detail__cta">
                      {/* Reload rather than navigate: they are already on the
                          course, so the page just switches to the enrolled view. */}
                      <EnrollButton course={course} block onEnrolled={reload} />
                    </div>
                    <p className="lms-detail__note">
                      {course.price
                        ? 'GST is calculated at checkout. Lifetime access once enrolled.'
                        : 'Free to enrol. Lifetime access.'}
                    </p>
                  </>
                )}
              </>
            )}

            <ul className="lms-includes">
              {(detail?.includes ?? [
                `${course.durationLabel} of content`,
                `${course.lessons} lessons across ${course.modules} modules`,
                'Certificate on completion',
              ]).map((i) => (
                <li key={i}>
                  <LmsIcon name="check" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lms-card" style={{ marginTop: 18 }}>
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <LmsIcon name="download" />
                Resources
              </h2>
            </div>
            <ResourceList
              resources={resources}
              enrolled={enrolled}
              emptyLabel="No course-wide downloads. Lessons carry their own."
            />
          </div>

          <div className="lms-card" style={{ marginTop: 18 }}>
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <LmsIcon name="user" />
                Instructor
              </h2>
            </div>
            <div className="lms-instructor">
              <span className="lms-instructor__avatar">
                {course.instructor.name
                  .split(' ')
                  .filter((p) => !p.endsWith('.'))
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join('')}
              </span>
              <span>
                <span className="lms-instructor__name">{course.instructor.name}</span>
                <span className="lms-instructor__role">{course.instructor.role}</span>
              </span>
            </div>
          </div>

          <div className="lms-card" style={{ marginTop: 18 }}>
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <LmsIcon name="chat" />
                Discussion
              </h2>
            </div>
            <p className="lms-detail__note" style={{ marginTop: 0 }}>
              Ask a question about this course and the instructor or another learner will
              answer it.
            </p>
            <Link
              className="lms-btn lms-btn--sm lms-btn--block"
              to={`/learn/discussions?course=${course.slug}`}
              style={{ marginTop: 12 }}
            >
              Open discussion
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
