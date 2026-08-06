import { useSearchParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import ForumLayout from '../../features/forum/components/ForumLayout.jsx';
import ForumHero from '../../features/forum/components/ForumHero.jsx';
import ForumAnswers from '../../features/forum/components/ForumAnswers.jsx';
import { CATEGORY_LABEL } from '../../features/forum/data.js';
import './ForumPage.css';

export default function ForumCategoriesPage() {
  // Category comes from ?category=win|award (defaults to win).
  const [params] = useSearchParams();
  const category = CATEGORY_LABEL[params.get('category')] ? params.get('category') : 'win';

  // Forum has no win/award toggle and is pinned to the green theme.
  return (
    <div className="forum-scale">
      <PageLayout>
        <ForumLayout>
          <ForumHero />
          <ForumAnswers
            heading={`Answer Category: ${CATEGORY_LABEL[category]}`}
            category={category}
          />
        </ForumLayout>
      </PageLayout>
    </div>
  );
}
