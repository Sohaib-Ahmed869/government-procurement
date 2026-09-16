// The top-level site pages that appear in the header/footer nav, mirrored
// from fe/src/components/layout/Header.jsx's NAV_LINKS. `key` is that entry's
// href with the leading slash stripped — the same string identifies the page
// on both sides, so there is one join key rather than a second id to keep in
// sync by hand.
//
// Home, "Request a Consultation" and "Student Login" are deliberately not
// here: they are utility actions rather than pages a visitor browses to, and
// hiding the way into the LMS or the CTA that funds the site is not something
// this toggle is for.
export const NAV_PAGES = [
  { key: 'service-offering', label: 'Service Offering' },
  { key: 'our-team', label: 'Our Team' },
  { key: 'courses', label: 'Courses' },
  { key: 'insights', label: 'Insights' },
  { key: 'q-and-a', label: 'Q&A' },
  { key: 'aus-list', label: 'Tender Websites' },
  { key: 'advisory', label: 'Sourcing Advisor' },
  { key: 'jurisdictional-links', label: 'Jurisdictional Links' },
  { key: 'government-panels', label: 'How to Engage Us' },
  { key: 'prompt-library', label: 'AI Prompt Library' },
  { key: 'templates', label: 'Templates' },
  // B7.8 — this is now the ONLY switch for whether the directory is
  // advertised. It used to be a build-time env flag (off/preview/live)
  // stacked on top of this toggle; that flag is gone, and this row is what
  // decides it, the same as every other page here.
  { key: 'find-a-bid-writer', label: 'Find a Bid Writer' },
  { key: 'careers', label: 'Careers' },
];

export const NAV_PAGE_KEYS = NAV_PAGES.map((p) => p.key);
