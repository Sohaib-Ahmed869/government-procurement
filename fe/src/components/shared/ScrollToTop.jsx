import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/* Puts the visitor at the top of the page on every navigation.

   Rendered once inside <BrowserRouter>, so it covers the public site, the admin
   CMS and the LMS alike.

   Keyed on location.key, not on pathname. Pathname alone missed the whole class
   of navigation the footer is made of: its two columns link the same pages under
   different segments, so following "Our Team" from the Win column while already
   on Our Team changes only the query string. The page swapped to the other
   segment underneath the visitor while they stayed pinned to the footer, which
   looks like the link did nothing at all. `key` is fresh for every push the
   router makes, so those count.

   It deliberately does NOT count history.replaceState — AudienceProvider writes
   the segment back into the URL that way, and the router never sees it, so the
   header toggle still leaves the visitor exactly where they were reading.

   A hash is an explicit request for a particular place on the page, so it is
   left alone: an in-page anchor gets to keep its destination.

   Nothing opts out of this any more. The browse pages (Prompt Library,
   Templates) used to, through a keepScrollOnNextNavigation flag exported from
   here: their filters live in the URL, so choosing one is a navigation, and
   they wanted the visitor left near the rail rather than sent to the top. That
   is no longer what those pages want — a filter should answer on the whole
   page, its heading band included — so the suppression and the flag have both
   gone. */

export default function ScrollToTop() {
  const { key, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [key, hash]);

  return null;
}
