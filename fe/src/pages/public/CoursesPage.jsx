import PageLayout from '../../components/layout/PageLayout.jsx';
import CoursesHero from '../../features/courses/components/CoursesHero.jsx';
import CoursesBrowser from '../../features/courses/components/CoursesBrowser.jsx';
import './CoursesPage.css';

export default function CoursesPage() {
  // Courses has no win/award toggle and is pinned to the green theme.
  return (
    <div className="courses-scale">
      <PageLayout showToggle={false} audience="award">
        <CoursesHero />
        <CoursesBrowser />
      </PageLayout>
    </div>
  );
}
