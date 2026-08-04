import PageLayout from '../../components/layout/PageLayout.jsx';
import ForumLayout from '../../features/forum/components/ForumLayout.jsx';
import ForumHero from '../../features/forum/components/ForumHero.jsx';
import ForumAnswerDetail from '../../features/forum/components/ForumAnswerDetail.jsx';
import './ForumPage.css';

export default function ForumAnswerPage() {
  // The answer id comes from the /q-and-a/answers/:id route param, read inside
  // ForumAnswerDetail via useParams.
  // Forum has no win/award toggle and is pinned to the green theme.
  return (
    <div className="forum-scale">
      <PageLayout>
        <ForumLayout>
          <ForumHero compact />
          <ForumAnswerDetail />
        </ForumLayout>
      </PageLayout>
    </div>
  );
}
