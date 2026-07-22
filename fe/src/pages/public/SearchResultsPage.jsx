import PageLayout from '../../components/layout/PageLayout.jsx';
import SearchResults from '../../features/search/components/SearchResults.jsx';

export default function SearchResultsPage() {
  return (
    <PageLayout showToggle={false} audience="award">
      <SearchResults />
    </PageLayout>
  );
}
