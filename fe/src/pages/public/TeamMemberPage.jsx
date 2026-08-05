import { useParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import TeamMemberDetail from '../../features/team/components/TeamMemberDetail.jsx';

export default function TeamMemberPage() {
  const { slug } = useParams();

  return (
    // tm-page lets the profile's hero wash carry up into the header's toggle
    // row on phones — see TeamMemberDetail.css.
    <div className="page-scale tm-page">
      <PageLayout>
        <TeamMemberDetail slug={slug} />
      </PageLayout>
    </div>
  );
}
