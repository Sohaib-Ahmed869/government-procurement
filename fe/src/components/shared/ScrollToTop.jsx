import { useLayoutEffect } from 'react';
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

  /* A LAYOUT effect, and that is the whole of it.

     As a plain effect this ran after the browser had already painted, so every
     navigation made from part-way down a page got at least one frame of the NEW
     page drawn at the OLD scroll offset. The browser clamps that offset to
     whatever the new page can scroll to, which — on a page whose content has
     not arrived yet — is its own foot: the "Remain Connected" band and the
     footer, on screen for a frame or two and then gone as the scroll snapped
     back to the top. Measured from the footer's own "Our Team" link at
     scrollY 1011: the band painted at y=128 in a 900px viewport before the
     reset. That is the flash.

     It is worst exactly where a visitor is most likely to be scrolled — the
     footer nav, which they can only reach by scrolling to it — and it is
     invisible from a page opened at the top, which is why it looked like some
     pages had it and others did not.

     useLayoutEffect runs after the DOM is updated and BEFORE the paint, so the
     new page is never painted anywhere but the top. */
  useLayoutEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [key, hash]);

  return null;
}
