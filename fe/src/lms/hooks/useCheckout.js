import { useCallback, useMemo, useState } from 'react';
import { COUPONS, grantEnrolment } from './placeholderData.js';
import { priceBasket } from '../utils/money.js';
import { createOrder } from './useOrders.js';

/* ---------------------------------------------------------------------------
   Checkout (C1).

   Holds the coupon, the billing details and the submission state, and turns a
   basket into an order.

   TODO: `POST /api/lms/checkout` should create a Stripe PaymentIntent from the
   server-side basket and return its client secret. Two rules that cannot live
   here: the server prices the order (never trust a total that arrived from the
   browser), and enrolment is granted on the webhook when payment settles, not
   when this promise resolves. A client that closes its tab mid-redirect must
   still get the course it paid for.
   ------------------------------------------------------------------------ */
export function useCheckout(items) {
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | processing | error
  const [error, setError] = useState('');

  const totals = useMemo(() => priceBasket(items, coupon), [items, coupon]);

  const applyCoupon = useCallback((raw) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    const found = COUPONS[code];
    if (!found) {
      setCoupon(null);
      setCouponError('That code isn’t valid, or it has expired.');
      return;
    }
    setCoupon(found);
    setCouponError('');
  }, []);

  const removeCoupon = useCallback(() => {
    setCoupon(null);
    setCouponError('');
  }, []);

  const submit = useCallback(
    async (billing) => {
      setStatus('processing');
      setError('');
      try {
        // Stands in for the PaymentIntent round-trip.
        await new Promise((r) => setTimeout(r, 900));

        const order = createOrder({
          items: items.map((i) => ({
            slug: i.slug,
            title: i.title,
            kind: i.kind,
            amount: i.amount,
          })),
          ...totals,
          coupon: coupon?.code ?? null,
          billing,
        });

        items.forEach((i) => grantEnrolment(i.slug));
        setStatus('idle');
        return order;
      } catch {
        setStatus('error');
        setError('We couldn’t complete your payment. No charge was made.');
        return null;
      }
    },
    [items, totals, coupon],
  );

  return { coupon, couponError, applyCoupon, removeCoupon, totals, submit, status, error };
}
