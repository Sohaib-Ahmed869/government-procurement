import { useCallback, useEffect, useMemo, useState } from 'react';
import { commerceApi } from '../../api/lms.js';
import { priceBasket } from '../utils/money.js';

/* ---------------------------------------------------------------------------
   Checkout (C1). Now a real one.

   What this hook does NOT do, on purpose:

     · price the order — it sends course ids and nothing else. The server reads
       every amount from the Course record. A total that arrives from a browser
       is a total anyone can edit;
     · grant the course — enrolment is created by the Stripe webhook when the
       payment settles. A learner who closes the tab mid-redirect still gets
       what they paid for, and somebody who types the success URL gets nothing.

   The totals below are a DISPLAY of what the basket should come to, shown
   before the server has been asked. They are tax-inclusive, so the figure here
   is the figure Stripe will show.

   Coupons are gone from this flow. There is no server-side discount yet, so a
   working-looking coupon box would have been a field that silently did nothing
   — see C2 in the scope.
   ------------------------------------------------------------------------ */
export function useCheckout(items) {
  const [status, setStatus] = useState('idle'); // idle | processing | error
  const [error, setError] = useState('');
  const [commerce, setCommerce] = useState({ ready: false });

  const totals = useMemo(() => priceBasket(items), [items]);

  // Whether payments are switched on at all, so the button can say why not
  // rather than failing when it is pressed.
  useEffect(() => {
    let cancelled = false;
    commerceApi
      .status()
      .then((s) => {
        if (!cancelled) setCommerce(s ?? { ready: false });
      })
      .catch(() => {
        if (!cancelled) setCommerce({ ready: false, message: 'Payments are unavailable.' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Creates the order and hands the browser to Stripe.

     There is deliberately no local "success" state: the next thing that should
     happen is a full navigation away from this app to Stripe's hosted page. If
     this resolves without navigating, something went wrong. */
  const submit = useCallback(async () => {
    setStatus('processing');
    setError('');
    try {
      const { checkoutUrl } = await commerceApi.createOrder(items.map((i) => i.courseId));
      if (!checkoutUrl) throw new Error('The payment page could not be opened.');
      window.location.assign(checkoutUrl);
      // Left in `processing` on purpose. The page is on its way out; flipping
      // back to idle would flash an enabled button at somebody mid-redirect.
      return true;
    } catch (err) {
      setStatus('error');
      setError(err?.message ?? 'We could not start the payment. Please try again.');
      return false;
    }
  }, [items]);

  return { totals, status, error, commerce, submit };
}
