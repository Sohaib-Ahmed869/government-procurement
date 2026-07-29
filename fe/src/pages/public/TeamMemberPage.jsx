import { useParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import TeamMemberDetail from '../../features/team/components/TeamMemberDetail.jsx';

export default function TeamMemberPage() {
  const { slug } = useParams();

  return (
    <div className="page-scale">
      <PageLayout>
        <TeamMemberDetail slug={slug} />
      </PageLayout>
    </div>
  );
}
