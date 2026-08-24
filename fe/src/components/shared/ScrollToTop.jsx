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

   And so is a navigation a page has asked to be left alone — see
   keepScrollOnNextNavigation below. */

/* Suppresses the next scroll-to-top, for a navigation that should not move the
   visitor.

   The browse pages (Prompt Library, Templates) keep their filters in the URL,
   which is right: a filtered view should be linkable and walk back through the
   back button. But it makes choosing a filter a navigation like any other, and
   every one of them was landing the visitor back at the top of the page —
   picking a use case from a rail you had scrolled down to reach threw you above
   the heading, once per filter, which reads as the page fighting you.

   The caller says so, rather than this file trying to infer it from the shape of
   the URL: same-pathname-different-query is exactly what the footer's segment
   links are too, and those must still scroll.

   A module flag rather than `navigate(..., { state })`, which is the obvious
   way and does not survive the trip: AudienceContext writes the segment back
   into the URL with a bare history.replaceState({}), which replaces
   history.state wholesale and takes the router's own state with it.

   Windowed rather than a plain boolean, so a navigation that is asked for and
   then does not happen cannot sit on the flag and swallow the scroll of the next
   one that does. */
let keepScrollUntil = 0;

export function keepScrollOnNextNavigation() {
  keepScrollUntil = Date.now() + 1000;
}

export default function ScrollToTop() {
  const { key, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    if (Date.now() < keepScrollUntil) {
      keepScrollUntil = 0;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [key, hash]);

  return null;
}
