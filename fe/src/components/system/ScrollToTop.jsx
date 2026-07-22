import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// On every route change, jump the window back to the top so a new page always
// opens at its top rather than inheriting the previous page's scroll position.
// Renders nothing.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
