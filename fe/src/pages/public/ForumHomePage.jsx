import PageLayout from '../../components/layout/PageLayout.jsx';
import ForumLayout from '../../features/forum/components/ForumLayout.jsx';
import ForumHero from '../../features/forum/components/ForumHero.jsx';
import ForumAnswers from '../../features/forum/components/ForumAnswers.jsx';
import './ForumPage.css';

export default function ForumHomePage() {
  // Forum has no win/award toggle and is pinned to the green theme.
  return (
    <div className="forum-scale">
      <PageLayout>
        <ForumLayout>
          <ForumHero />
          {/* "Recent Answers" means the whole forum, not one segment of it.

              This defaulted to ForumAnswers' own `category='win'`, so a newly
              published Award or Other answer never appeared here at all — the
              list was the most recent WIN answers under a heading that promised
              the most recent answers, and looked stale every time the newest
              thing published was not a supplier-side question. The category
              views (/q-and-a/categories?category=…) are where a segment is
              picked; this page is the front door.

              Two of them, and the cap is applied after the sort — so these are
              the two newest answers in the forum and they turn over on their
              own as answers are published. The category views stay uncapped:
              that is where somebody goes to read through a segment. */}
          <ForumAnswers category="all" limit={2} />
        </ForumLayout>
      </PageLayout>
    </div>
  );
}
