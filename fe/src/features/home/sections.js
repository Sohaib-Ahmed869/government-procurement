// A1 — the homepage's sections, in the order they appear.
//
// One list, read by two things that have to agree: HomePage.jsx renders these
// ids onto its sections, and the header's ribbon scrolls to them and lights up
// whichever one is on screen. Keeping the ids in a third place they both import
// is what stops a renamed section from silently breaking the nav.
//
// `nav` is the header label this section answers to, and must match the label
// in Header.jsx exactly — that string is the join between the two. Every item
// in the ribbon has a section here, so on the homepage the whole nav scrolls
// rather than navigates. A section with `nav: null` is scrolled past but never
// linked: the hero has nothing to jump to, and the band under it is the hero's
// own continuation rather than a destination.
//
// The order below is the ribbon's order exactly, so scrolling the page walks
// the nav left to right. That puts two dark bands together in two places
// (Advisory then Our Team, Tender Websites then Careers); each pair is given
// two different steps of the ramp — --gp-brand and --gp-brand-alt — so the
// seam between them is a visible change of shade rather than one long slab.
//
// There is no contact section: the head office card and the subscribe form
// both live in the footer band, so a section repeating them on the homepage
// was saying the same thing twice, a screenful apart.
/* TEMPORARY — the homepage is currently the hero and the footer, nothing else.
   The bands are commented out in HomePage.jsx rather than deleted.

   While that is true the ribbon must NAVIGATE, not scroll: there is no section
   under a nav item to scroll to, so an anchor would sit there doing nothing.
   Header.jsx reads this flag for exactly that, which keeps the two ends of the
   change in step.

   To put the homepage back: set this to true and uncomment the bands. Nothing
   else has to move. */
export const HOME_SECTIONS_ENABLED = false;

export const HOME_SECTIONS = [
  { id: 'home-hero', nav: null },
  { id: 'trusted-partner', nav: null },
  { id: 'service-offering', nav: 'Service Offering' },
  { id: 'advisory', nav: 'Sourcing Advisor' },
  { id: 'our-team', nav: 'Our Team' },
  { id: 'courses', nav: 'Courses' },
  { id: 'insights', nav: 'Insights' },
  { id: 'q-and-a', nav: 'Q&A' },
  { id: 'tender-websites', nav: 'Tender Websites' },
  { id: 'careers', nav: 'Careers' },
  { id: 'jurisdictional-links', nav: 'Jurisdictional Links' },
];

// The ids in document order — what the scroll-spy walks.
export const HOME_SECTION_IDS = HOME_SECTIONS.map((s) => s.id);

// Header label → section id, for the nav items that scroll rather than route.
export const SECTION_BY_NAV_LABEL = Object.fromEntries(
  HOME_SECTIONS.filter((s) => s.nav).map((s) => [s.nav, s.id]),
);
