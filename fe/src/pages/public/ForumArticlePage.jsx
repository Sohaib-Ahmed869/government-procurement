import PageLayout from '../../components/layout/PageLayout.jsx';
import ForumLayout from '../../features/forum/components/ForumLayout.jsx';
import ForumHero from '../../features/forum/components/ForumHero.jsx';
import ForumArticle from '../../features/forum/components/ForumArticle.jsx';
import './ForumPage.css';

export default function ForumArticlePage() {
  // Forum has no win/award toggle and is pinned to the green theme.
  // ForumArticle sources a published question from the CMS itself.
  return (
    <div className="forum-scale">
      <PageLayout>
        <ForumLayout>
          <ForumHero compact />
          <ForumArticle />
        </ForumLayout>
      </PageLayout>
    </div>
  );
}
