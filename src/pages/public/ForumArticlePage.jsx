import { useSearchParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import ForumLayout from '../../features/forum/components/ForumLayout.jsx';
import ForumHero from '../../features/forum/components/ForumHero.jsx';
import ForumArticle from '../../features/forum/components/ForumArticle.jsx';
import { getAnswerById } from '../../features/forum/data.js';
import './ForumPage.css';

export default function ForumArticlePage() {
  // The clicked question is passed via ?id=… (falls back to the first article).
  const [params] = useSearchParams();
  const article = getAnswerById(params.get('id'));

  // Forum has no win/award toggle and is pinned to the green theme.
  return (
    <div className="forum-scale">
      <PageLayout showToggle={false} audience="award">
        <ForumLayout>
          <ForumHero compact />
          <ForumArticle article={article} />
        </ForumLayout>
      </PageLayout>
    </div>
  );
}
