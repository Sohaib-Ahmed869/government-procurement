import PageLayout from '../../components/layout/PageLayout.jsx';
import SearchResults from '../../features/search/components/SearchResults.jsx';

export default function SearchResultsPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <SearchResults />
      </PageLayout>
    </div>
  );
}
