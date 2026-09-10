import { useCallback, useEffect, useState } from 'react';

/* Has the learner actually got to the bottom of the reading?

   Attach the returned ref to a marker placed immediately AFTER the lesson's
   content. It reports true the first time that marker scrolls into view, and
   stays true — someone who read to the end and then scrolled back up to check
   something has still read to the end.

   An IntersectionObserver rather than a scroll listener: no work per frame, and
   it answers the question that is actually being asked ("is the end of the text
   on screen") instead of one that only approximates it ("is the window near the
   bottom of the document"), which a lesson with tabs and notes underneath it
   would get wrong.

   Content shorter than the window makes the marker visible on arrival, so it
   reports true straight away. That is correct: there is nothing left to scroll
   to, and gating the way forward on a scroll that cannot happen would trap the
   learner on the lesson.

   The ref is a CALLBACK ref on purpose. The marker is often rendered
   conditionally — after a body that may not exist yet on first paint — and a
   plain useRef would leave the observer watching nothing, because nothing tells
   an effect that `ref.current` has quietly been filled in. */
export function useReadToEnd(resetKey) {
  const [reached, setReached] = useState(false);
  const [node, setNode] = useState(null);
  const ref = useCallback((n) => setNode(n), []);

  // Moving to another lesson starts the question again.
  useEffect(() => {
    setReached(false);
  }, [resetKey]);

  useEffect(() => {
    if (!node || reached) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      // No observer (an old browser, a test renderer) means no way to tell.
      // Open the gate rather than close it: failing to detect the end must not
      // become "you may not continue".
      setReached(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setReached(true);
      },
      // A little short of the very bottom edge, so it counts as read once the
      // end is comfortably on screen rather than exactly flush with it.
      { rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node, reached]);

  return [ref, reached];
}
