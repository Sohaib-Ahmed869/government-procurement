import PageLayout from '../../components/layout/PageLayout.jsx';
import ForumLayout from '../../features/forum/components/ForumLayout.jsx';
import ForumHero from '../../features/forum/components/ForumHero.jsx';
import ForumAnswers from '../../features/forum/components/ForumAnswers.jsx';
import './ForumPage.css';

export default function ForumHomePage() {
  // Forum has no win/award toggle and is pinned to the green theme.
  return (
    <div className="forum-scale">
      <PageLayout>
        <ForumLayout>
          <ForumHero />
          <ForumAnswers />
        </ForumLayout>
      </PageLayout>
    </div>
  );
}
