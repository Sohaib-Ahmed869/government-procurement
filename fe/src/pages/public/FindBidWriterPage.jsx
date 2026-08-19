import PageLayout from '../../components/layout/PageLayout.jsx';
import BidWritersHero from '../../features/bidWriters/components/BidWritersHero.jsx';
import BidWriterDirectory from '../../features/bidWriters/components/BidWriterDirectory.jsx';
import { useNoIndex } from '../../hooks/useNoIndex.js';
import { bidWritersPublic } from '../../config/features.js';

// B7 — Find a Bid Writer, which is also the general business advertising space
// (B7.7): one directory, one build, not two.
//
// This page is only routed when the feature flag is on at all, so in production
// it does not exist. On `preview` it works and marks itself noindex; only on
// `live` is it indexable.
export default function FindBidWriterPage() {
  useNoIndex(!bidWritersPublic);

  return (
    <div className="page-scale">
      <PageLayout>
        <BidWritersHero />
        <BidWriterDirectory />
      </PageLayout>
    </div>
  );
}
