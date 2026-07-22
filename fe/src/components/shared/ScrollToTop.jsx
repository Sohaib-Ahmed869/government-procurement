import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Resets the window scroll position to the top whenever the route (pathname)
// changes. Keyed on pathname only, so in-page anchor links (#hash) still work.
// Rendered once inside <BrowserRouter>, it covers every public and admin page.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
