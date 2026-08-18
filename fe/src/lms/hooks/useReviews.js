import { useCallback, useEffect, useState } from 'react';
import { reviewsApi } from '../../api/lms.js';

/* ---------------------------------------------------------------------------
   Course reviews and ratings (L5), from the API.

   One dataset, two audiences: a rating a learner leaves here is the rating
   their instructor sees on the teaching side, and the one the catalogue can
   quote. It used to be a localStorage store, which meant a review only existed
   in the browser that wrote it — visible to nobody it was written for.

   The two rules that matter now live on the server, where they are actually
   enforced: you may only review a course you are enrolled in, and only once.
   The progress threshold comes back with the data rather than being repeated
   here, so the client can't disagree with the rule it is describing.
   ------------------------------------------------------------------------ */

export function useReviews() {
  const [data, setData] = useState({ reviews: [], reviewable: [], threshold: 50 });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await reviewsApi.mine();
      setData({
        reviews: res.reviews ?? [],
        reviewable: res.reviewable ?? [],
        threshold: res.threshold ?? 50,
      });
      setStatus('ready');
    } catch (err) {
      setError(err?.message ?? 'Could not load your reviews');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Both writes reload rather than patching the local copy, because either one
  // moves a course between the two lists: reviewing something takes it out of
  // "awaiting your review", and deleting the review puts it back.
  const save = useCallback(
    async (body) => {
      const saved = await reviewsApi.save(body);
      await load();
      return saved;
    },
    [load],
  );

  const remove = useCallback(
    async (id) => {
      await reviewsApi.remove(id);
      await load();
    },
    [load],
  );

  return { ...data, status, error, reload: load, save, remove };
}

// Everyone's reviews of one course, for the course page. Public: it works
// signed out, which is the whole point of putting ratings on a sales page.
export function useCourseReviews(slug) {
  const [data, setData] = useState({ reviews: [], count: 0, average: null, spread: {} });
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!slug) return undefined;
    let alive = true;

    (async () => {
      try {
        const res = await reviewsApi.forCourse(slug);
        if (!alive) return;
        setData({
          reviews: res.reviews ?? [],
          count: res.count ?? 0,
          average: res.average ?? null,
          spread: res.spread ?? {},
        });
        setStatus('ready');
      } catch {
        // A course page is worth showing without its reviews; the rest of it
        // is the part someone came for.
        if (alive) setStatus('error');
      }
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

  return { ...data, status };
}

// The teaching side: every review across the courses this instructor wrote,
// with per-course averages alongside the overall one.
export function useInstructorReviews() {
  const [data, setData] = useState({ reviews: [], courses: [], totals: {} });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await reviewsApi.instructor();
      setData({
        reviews: res.reviews ?? [],
        courses: res.courses ?? [],
        totals: res.totals ?? {},
      });
      setStatus('ready');
    } catch (err) {
      setError(err?.message ?? 'Could not load your reviews');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, status, error, reload: load };
}
