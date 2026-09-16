import PageLayout from '../../components/layout/PageLayout.jsx';
import BidWritersHero from '../../features/bidWriters/components/BidWritersHero.jsx';
import BidWriterDirectory from '../../features/bidWriters/components/BidWriterDirectory.jsx';
import { useNoIndex } from '../../hooks/useNoIndex.js';
import { useNavVisibility } from '../../hooks/useNavVisibility.js';

// B7 — Find a Bid Writer, which is also the general business advertising space
// (B7.7): one directory, one build, not two.
//
// Always routed, and never noindexed on its own account any more — both used
// to be a build-time feature flag with three positions (off/preview/live).
// Now there's one switch, the Site Navigation toggle in the admin CMS: while
// the page is hidden from the nav there, it stays exactly as unadvertised to
// search engines as it is to a visitor, and once shown it's indexable, with
// nothing left to flip at deploy time.
export default function FindBidWriterPage() {
  const hiddenPages = useNavVisibility();
  useNoIndex(hiddenPages.has('find-a-bid-writer'));

  return (
    <div className="page-scale">
      <PageLayout>
        <BidWritersHero />
        <BidWriterDirectory />
      </PageLayout>
    </div>
  );
}
