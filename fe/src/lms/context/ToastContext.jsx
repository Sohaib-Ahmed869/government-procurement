import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Toasts for the LMS.

   Replaces window.alert(), which blocks the whole page, cannot be styled, says
   "localhost:5173 says" in front of your message, and on a phone looks like the
   browser is broken rather than like the app is talking.

   Scoped to the LMS rather than the whole site, matching how StudentAuthContext
   and CartContext are scoped. There is a site-wide `components/ui/` directory
   scaffolded for a shared design system, but every file in it is empty and
   nothing imports it — filling one in here would mean this feature depended on
   a system that does not exist yet.

   ---- What a toast is for ---------------------------------------------------

   Confirming something that already happened, or reporting something that
   failed, WITHOUT taking the page away from the reader. It is not for anything
   they must act on: a question needs a dialog, and an error they have to fix
   belongs next to the field that caused it. A toast the user must catch before
   it disappears is a design mistake.
   ------------------------------------------------------------------------ */

const ToastContext = createContext(null);

// Success reads and is gone. An error is usually a sentence worth finishing,
// and sometimes a server message longer than a glance.
const LIFETIME = { success: 4500, info: 5000, error: 9000 };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Ids from a counter, not Date.now(): two toasts raised in the same
  // millisecond would collide and React would warn about duplicate keys.
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (tone, message, { title } = {}) => {
      if (!message) return null;
      const id = ++nextId.current;

      setToasts((list) => {
        // A repeated message — clicking Retry twice on the same broken thing —
        // should not stack into a wall. Replace the identical one instead.
        const withoutDuplicate = list.filter((t) => !(t.tone === tone && t.message === message));
        // Four is about what fits without covering the page. Oldest goes.
        return [...withoutDuplicate, { id, tone, message, title }].slice(-4);
      });

      timers.current.set(
        id,
        setTimeout(() => dismiss(id), LIFETIME[tone] ?? LIFETIME.info),
      );
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      toast: {
        success: (message, opts) => push('success', message, opts),
        error: (message, opts) => push('error', message, opts),
        info: (message, opts) => push('info', message, opts),
      },
    }),
    [toasts, dismiss, push],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/* Returns { toast, toasts, dismiss }.

   Throws rather than returning a no-op when the provider is missing. A toast
   that silently does nothing is worse than a crash in development: the code
   looks like it reports errors and doesn't. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside a <ToastProvider>');
  return ctx;
}
