import { useEffect } from 'react';

// Adds <meta name="robots" content="noindex, nofollow"> while a component is
// mounted, and takes it away again on unmount.
//
// The app has no head manager, and adding one for a single tag would be a
// dependency for a two-line effect. This is that effect.
//
// It is a real belt-and-braces measure rather than the main protection: with the
// feature flag off the page is not routed at all, so there is nothing to crawl.
// This covers the preview setting, where the page does exist and must not be
// indexed — a staging URL that leaks into a search result is exactly the kind of
// thing nobody notices until a client does.
export function useNoIndex(active = true) {
  useEffect(() => {
    if (!active) return undefined;

    // Reuse an existing tag if one is already there, rather than adding a
    // second and leaving whichever loses to chance.
    const existing = document.querySelector('meta[name="robots"]');
    const previous = existing ? existing.getAttribute('content') : null;
    const tag = existing || document.createElement('meta');
    tag.setAttribute('name', 'robots');
    tag.setAttribute('content', 'noindex, nofollow');
    if (!existing) document.head.appendChild(tag);

    return () => {
      if (existing) {
        if (previous === null) existing.removeAttribute('content');
        else existing.setAttribute('content', previous);
      } else {
        tag.remove();
      }
    };
  }, [active]);
}
