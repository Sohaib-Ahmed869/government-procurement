import { useParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import ArticleDetail from '../../features/articles/components/ArticleDetail.jsx';

export default function ArticleDetailPage() {
  // The slug is plumbed through from routing so the URL is real; the article
  // content itself is a static placeholder until the CMS is wired up.
  const { slug } = useParams();

  return (
    <PageLayout showToggle={false} audience="award">
      <ArticleDetail slug={slug} />
    </PageLayout>
  );
}
