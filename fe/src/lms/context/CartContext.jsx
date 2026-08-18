import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { createStore } from '../utils/localStore.js';
import { CATALOGUE } from '../hooks/placeholderData.js';

/* ---------------------------------------------------------------------------
   The checkout basket (C2).

   Persisted, because losing a basket on refresh loses a sale. Lines store a
   slug and a kind only. Never a price. Prices are read from the catalogue on
   render and re-checked by the server at payment, so a stale or edited basket
   can't buy a $690 course for $6.

   TODO: on the real thing the basket belongs on the server too, so it follows
   the buyer between devices and the price shown is the price quoted.
   ------------------------------------------------------------------------ */
const store = createStore('gp.lms.cart');

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const lines = useSyncExternalStore(store.subscribe, store.read, store.read);

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
          const course = CATALOGUE.find((c) => c.slug === line.slug);
          if (!course) return null;
          return {
            slug: course.slug,
            kind: line.kind,
            title: course.title,
            instructor: course.instructor.name,
            levelLabel: course.levelLabel,
            durationLabel: course.durationLabel,
            accent: course.accent,
            amount: course.price,
            currency: course.currency,
          };
        })
        .filter(Boolean),
    [lines],
  );

  const value = useMemo(() => ({ items, add, remove, clear }), [items, add, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
