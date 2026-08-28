import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore,
} from 'react';
import { createStore } from '../utils/localStore.js';
import { bundlesApi, catalogApi } from '../../api/lms.js';
import { toCatalogCourse } from '../utils/courseShape.js';

/* ---------------------------------------------------------------------------
   The checkout basket (C2).

   Persisted, because losing a basket on refresh loses a sale. Lines store a
   slug and a kind only. Never a price. Prices are read from the catalogue on
   render and re-checked by the server at payment, so a stale or edited basket
   can't buy a $690 course for $6.

   Lines are resolved against the published catalogue — GET /courses, the same
   list the catalogue page reads. It used to resolve them against a hardcoded
   course list, which meant a basket could only ever hold one of five invented
   courses: adding a real one produced a line with no title and no price, and
   the `.filter(Boolean)` below then dropped it silently.

   TODO: on the real thing the basket belongs on the server too, so it follows
   the buyer between devices and the price shown is the price quoted.
   ------------------------------------------------------------------------ */
const store = createStore('gp.lms.cart');

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const lines = useSyncExternalStore(store.subscribe, store.read, store.read);

  // The catalogue, once, for the whole session. A request per line would be a
  // burst on every basket render; a request per basket change would refetch the
  // same list to remove one row from it.
  const [catalogue, setCatalogue] = useState([]);
  // Bundles are priced from their own record, not from the sum of their
  // courses — selling below that sum is the point of a bundle.
  const [bundles, setBundles] = useState([]);
  useEffect(() => {
    let alive = true;
    Promise.all([catalogApi.list(), bundlesApi.list({ limit: 50 }).catch(() => [])])
      .then(([rows, bundleRows]) => {
        if (!alive) return;
        setCatalogue((rows ?? []).map(toCatalogCourse));
        setBundles(bundleRows ?? []);
      })
      .catch(() => {
        // A basket that cannot price itself shows nothing rather than showing
        // the wrong thing. The lines are still stored, so a reload recovers.
      });
    return () => {
      alive = false;
    };
  }, []);

  const add = useCallback((slug, kind = 'course') => {
    const current = store.read();
    if (current.some((l) => l.slug === slug)) return;
    store.write([...current, { slug, kind }]);
  }, []);

  const remove = useCallback((slug) => {
    store.write(store.read().filter((l) => l.slug !== slug));
  }, []);

  const clear = useCallback(() => store.write([]), []);

  // Resolve each line against the catalogue, dropping anything that no longer
  // exists rather than rendering a line with no price.
  const items = useMemo(
    () =>
      lines
        .map((line) => {
          if (line.kind === 'bundle') {
            const bundle = bundles.find((b) => b.slug === line.slug);
            if (!bundle) return null;
            return {
              bundleId: bundle._id,
              slug: bundle.slug,
              kind: 'bundle',
              title: bundle.title,
              // What it contains, said plainly — a price with no contents is
              // not something anyone should be asked to pay.
              instructor: `${bundle.courses?.length ?? 0} courses`,
              levelLabel: 'Bundle',
              durationLabel: '',
              accent: bundle.accent ?? 0,
              amount: bundle.price ?? 0,
              currency: bundle.currency ?? 'AUD',
            };
          }

          const course = catalogue.find((c) => c.slug === line.slug);
          if (!course) return null;
          return {
            // The id is what the order endpoint prices against — slugs are for
            // links, ids are for money.
            courseId: course.id,
            slug: course.slug,
            kind: line.kind,
            title: course.title,
            // The byline as a STRING. toCatalogCourse() resolves `instructor`
            // to {name, role, avatarUrl}, and a line renders it as one piece of
            // text — handing the object straight through crashed the basket
            // with "Objects are not valid as a React child". Every other
            // consumer of a catalogue row reads `.name` for the same reason.
            instructor: course.instructor?.name ?? '',
            levelLabel: course.levelLabel,
            durationLabel: course.durationLabel,
            accent: course.accent,
            amount: course.price,
            currency: course.currency,
          };
        })
        .filter(Boolean),
    [lines, catalogue, bundles],
  );

  const value = useMemo(() => ({ items, add, remove, clear }), [items, add, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
