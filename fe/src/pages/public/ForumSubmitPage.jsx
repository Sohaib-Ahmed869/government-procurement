import PageLayout from '../../components/layout/PageLayout.jsx';
import ForumLayout from '../../features/forum/components/ForumLayout.jsx';
import ForumHero from '../../features/forum/components/ForumHero.jsx';
import ForumSubmit from '../../features/forum/components/ForumSubmit.jsx';
import './ForumPage.css';

export default function ForumSubmitPage() {
  // Forum has no win/award toggle and is pinned to the green theme.
  return (
    <div className="forum-scale">
      <PageLayout>
        <ForumLayout>
          {/* No search here: the page you are on is for writing a question,
              not finding one, and the row it sat in was height the form needed
              to put Send now on screen without a scroll. */}
          <ForumHero compact showSearch={false} />
          <ForumSubmit />
        </ForumLayout>
      </PageLayout>
    </div>
  );
}
