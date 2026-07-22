import PageLayout from '../../components/layout/PageLayout.jsx';
import ForumLayout from '../../features/forum/components/ForumLayout.jsx';
import ForumHero from '../../features/forum/components/ForumHero.jsx';
import ForumSubmit from '../../features/forum/components/ForumSubmit.jsx';
import './ForumPage.css';

export default function ForumSubmitPage() {
  // Forum has no win/award toggle and is pinned to the green theme.
  return (
    <div className="forum-scale">
      <PageLayout showToggle={false} audience="award">
        <ForumLayout>
          <ForumHero compact />
          <ForumSubmit />
        </ForumLayout>
      </PageLayout>
    </div>
  );
}
