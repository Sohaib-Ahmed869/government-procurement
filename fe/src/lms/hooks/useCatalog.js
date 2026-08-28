import { useEffect, useState } from 'react';
import { catalogApi, enrollmentsApi, bundlesApi } from '../../api/lms.js';
import { toCatalogCourse } from '../utils/courseShape.js';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';

// The browsable catalogue (C2), from the API.
//
// Two requests, not one: the catalogue itself is the site's existing published
// -courses endpoint, and enrolment is per-learner. They're joined here so a card
// can show "Continue" instead of a price.
//
// The enrolment request is skipped entirely when signed out. The catalogue is
// public, and asking for enrolments without a token just 401s.
export function useCatalog() {
  const { isAuthenticated, loading: authLoading } = useStudentAuth();
  const [courses, setCourses] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  useEffect(() => {
    // Wait for the session to resolve, or a signed-in learner's first paint
    // shows every course as un-enrolled and then flips.
    if (authLoading) return undefined;

    let alive = true;
    setStatus('loading');

    (async () => {
      try {
        // limit is explicit: the endpoint pages at 10 by default, which would
        // silently truncate the catalogue to its first page.
        const list = await catalogApi.list({ limit: 100, sort: '-createdAt' });
        /* Bundles sit in the same catalogue: a learner browsing what to buy
           should see both. A failure here must not take the courses with it —
           a catalogue missing its bundles is far better than no catalogue. */
        const bundleList = await bundlesApi.list({ limit: 50 }).catch(() => []);

        // A failure here must not lose the catalogue. A learner who can't be
        // told which courses they own can still browse.
        let enrolledSlugs = new Set();
        if (isAuthenticated) {
          try {
            const rows = await enrollmentsApi.mine();
            enrolledSlugs = new Set(rows.map((r) => r.course?.slug).filter(Boolean));
          } catch {
            /* leave every card in its "not enrolled" state */
          }
        }

        if (!alive) return;
        setCourses(
          (list ?? []).map((c) => ({
            ...toCatalogCourse(c),
            enrolled: enrolledSlugs.has(c.slug),
          })),
        );
        setBundles(
          (bundleList ?? [])
            .filter((bd) => (bd.courses?.length ?? 0) > 0)
            .map((bd) => ({
              id: bd._id,
              slug: bd.slug,
              title: bd.title,
              summary: bd.summary ?? '',
              price: bd.price ?? 0,
              currency: bd.currency ?? 'AUD',
              accent: bd.accent ?? 0,
              image: bd.image,
              courseCount: bd.courses?.length ?? 0,
              // What the courses would cost bought one at a time, so the card
              // can show the saving rather than asserting one.
              listPrice: (bd.courses ?? []).reduce((sum, c) => sum + (c?.price ?? 0), 0),
            })),
        );
        setStatus('ready');
      } catch (err) {
        if (!alive) return;
        setError(err?.message ?? 'Could not load the catalogue');
        setStatus('error');
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAuthenticated, authLoading]);

  return { courses, bundles, status, error };
}
