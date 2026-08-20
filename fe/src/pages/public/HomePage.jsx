import PageLayout from '../../components/layout/PageLayout.jsx';
import HomeHero from '../../features/home/components/HomeHero.jsx';
// TEMPORARY — the homepage is the hero and the footer, nothing between them.
//
// The bands below are COMMENTED OUT, not deleted: every component, its CSS and
// its data fetching are untouched on disk, and the section list they render
// against still lives in features/home/sections.js. Putting the page back is
// uncommenting these two blocks and setting HOME_SECTIONS_ENABLED to true.
//
// That flag is what makes the top ribbon route to each page instead of
// scrolling to a band that is no longer here — see the note beside it.
//
// import TrustedPartner from '../../features/home/components/TrustedPartner.jsx';
// import HomeServiceOffering from '../../features/home/components/HomeServiceOffering.jsx';
// import AdvisoryBand from '../../features/home/components/AdvisoryBand.jsx';
// import CoursesBand from '../../features/home/components/CoursesBand.jsx';
// import TenderPortalsBand from '../../features/home/components/TenderPortalsBand.jsx';
// import InsightsBand from '../../features/home/components/InsightsBand.jsx';
// import QandABand from '../../features/home/components/QandABand.jsx';
// import JurisdictionsBand from '../../features/home/components/JurisdictionsBand.jsx';
// import FounderQuote from '../../features/home/components/FounderQuote.jsx';
// import CareersBand from '../../features/home/components/CareersBand.jsx';
// import { useHashScroll } from '../../hooks/useHashScroll.js';
import { useAudience } from '../../context/AudienceContext.jsx';
import '../../features/home/home.css';
import './HomePage.css';

// A1 — the homepage is one page.
//
// Every section below is an anchor the top ribbon scrolls to; nothing here
// navigates, so moving between them never unmounts the page or refetches
// anything. The ids come from features/home/sections.js, which the header reads
// too, so the ribbon and the page can't drift apart.
//
// Sections deliberately NOT here, per the brief:
//   - the stat rail under the hero (20+ / 4 / 2 / 1)
//   - the Courses & Artefacts card
//   - the "Our Offerings / Where to start" section
//
// Each band brings its own reveal via useInView, keyed on the audience, so a
// toggle replays them. The old `key={audience}` remount on every section is
// gone: the cross-fade in AudienceContext now covers the swap, and remounting
// underneath it threw away the fetched articles and tender portals for no
// visible gain.
export default function HomePage() {
  const { audience } = useAudience();

  // /#insights from a cold load or an external link. The bands mount before
  // their data arrives, so the target moves as content fills in — the hook
  // re-checks for a few hundred ms rather than scrolling once and missing.
  //
  // Off with the bands: there is no longer a section for a hash to land on.
  // useHashScroll();

  // `home-scale` stays outside PageLayout: the big-screen `zoom` rule in
  // HomePage.css targets `.home-scale .page-layout`, so inverting the nesting
  // would silently drop the >1440px scaling.
  return (
    <div className="home-scale">
      {/* No contact band here — neither the head office card nor "Remain
          Connected". With the bands commented out the homepage is the hero and
          the footer, and the dark footer below already carries the same
          address, phone and email. Every other page still shows it. */}
      <PageLayout showContactBand={false}>
        <div className="hm" data-audience={audience}>
          {/* Order and ids come from features/home/sections.js — the ribbon
              reads the same list, so the two cannot drift. Every nav item has a
              band here, which is what makes the ribbon scroll rather than
              navigate right across the homepage. */}
          <HomeHero />
          {/* <TrustedPartner /> */}
          {/* <HomeServiceOffering /> */}
          {/* <AdvisoryBand /> */}
          {/* <FounderQuote /> */}
          {/* <CoursesBand /> */}
          {/* <InsightsBand /> */}
          {/* <QandABand /> */}
          {/* <TenderPortalsBand /> */}
          {/* <CareersBand /> */}
          {/* <JurisdictionsBand /> */}
        </div>
      </PageLayout>
    </div>
  );
}
