import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { coursesApi } from '../../../api';
import './CoursesBand.css';
import Arrow from '../../../components/shared/Arrow.jsx';

// Three courses off the catalogue. Renders nothing until the CMS has at least
// one, so an empty install leaves no gap on the homepage — the same rule the
// insights and tender bands follow.
export default function CoursesBand() {
  const { audience } = useAudience();
  const { ref, inView } = useInView();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    let alive = true;
    coursesApi
      .list({ limit: 3 })
      .then((list) => {
        if (alive) setCourses((list || []).slice(0, 3));
      })
      .catch(() => {
        /* the band simply doesn't render */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (courses.length === 0) return null;

  return (
    <section
      ref={ref}
      id="courses"
      className={`hm-band hm-band--light-3${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-labelledby="home-courses-title"
    >
      <div className="hm-shell hm-band__head hm-reveal">
        <h2 className="hm-band__title" id="home-courses-title">
          Learn how procurement actually runs
        </h2>
        <p className="hm-band__lede">
          Short, practical courses built from the engagements we run. The same material
          we teach in-house to buying teams and bidders.
        </p>
      </div>

      <div className="hm-shell">
        <ul className="cob__grid">
          {courses.map((course) => (
            <li className="cob__item hm-reveal" key={course._id || course.slug}>
              <Link className="cob__card" to={`/courses/${course.slug || course._id}`}>
                <span className="cob__media">
                  {course.image?.url ? (
                    <img src={course.image.url} alt="" loading="lazy" />
                  ) : (
                    <span className="cob__media-empty" aria-hidden="true" />
                  )}
                </span>
                <h3 className="cob__title">{course.title}</h3>
                {course.summary && <p className="cob__summary">{course.summary}</p>}
                {course.instructor?.name && (
                  <p className="cob__by">{course.instructor.name}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>

        <Link className="hm-arrow" to="/courses">
          Browse the catalogue <Arrow />
        </Link>
      </div>
    </section>
  );
}
