import { useEffect } from 'react';

// Adds <meta name="robots" content="noindex, nofollow"> while a component is
// mounted, and takes it away again on unmount.
//
// The app has no head manager, and adding one for a single tag would be a
// dependency for a two-line effect. This is that effect.
//
// A page hidden from the site nav (see useNavVisibility) still routes and
// still serves — it is only unlisted, not gone — so this is what keeps an
// unlisted page out of search results too. Recomputes whenever `active`
// changes, which matters here specifically because that visibility check
// starts `false` and can flip to `true` once the fetch resolves.
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
