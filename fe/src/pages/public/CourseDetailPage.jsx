import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import CourseDetail from '../../features/courses/components/CourseDetail.jsx';
import { coursesApi } from '../../api';

export default function CourseDetailPage() {
  // The route param is named `id`, but we treat it as the course slug.
  const { id: slug } = useParams();
  const [course, setCourse] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    (async () => {
      try {
        const data = await coursesApi.getBySlug(slug);
        if (!alive) return;
        if (data && (data._id || data.id || data.slug)) {
          setCourse(data);
          setStatus('ready');
        } else {
          setStatus('notfound');
        }
      } catch (err) {
        if (!alive) return;
        // A 404 from the API means the slug doesn't resolve to a published course.
        if (err && (err.status === 404 || err.statusCode === 404)) {
          setStatus('notfound');
        } else {
          setStatus('error');
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  // Pinned to the green theme, matching the Courses listing page.
  return (
    <PageLayout showToggle={false} audience="award">
      <CourseDetail course={course} status={status} />
    </PageLayout>
  );
}
