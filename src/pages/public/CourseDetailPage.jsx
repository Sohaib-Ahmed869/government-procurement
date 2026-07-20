import PageLayout from '../../components/layout/PageLayout.jsx';
import CourseDetail from '../../features/courses/components/CourseDetail.jsx';

export default function CourseDetailPage() {
  // Pinned to the green theme, matching the Courses listing page.
  return (
    <PageLayout showToggle={false} audience="award">
      <CourseDetail />
    </PageLayout>
  );
}
