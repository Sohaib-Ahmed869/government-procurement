// Money and Australian GST (C1).
//
// The rate lives here so it appears once rather than as a scattered `* 0.1`.
// It is a display estimate only: the amount actually charged is computed by the
// server at payment, because a tax figure the client can change is a tax figure
// anyone can change. The checkout says as much on screen.
export const GST_RATE = 0.1;

export function formatMoney(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
}

// Applies a coupon, then GST on what's left. Rounded to whole cents at each
// step so the line items and the total always reconcile. Computing GST off an
// unrounded subtotal is how invoices end up a cent out.
export function priceBasket(items, coupon) {
  const round = (n) => Math.round(n * 100) / 100;

  const subtotal = round(items.reduce((s, i) => s + i.amount, 0));

  let discount = 0;
  if (coupon && subtotal > 0) {
    discount =
      coupon.kind === 'percent'
        ? round(subtotal * (coupon.value / 100))
        : Math.min(coupon.value, subtotal);
  }

  const taxable = round(subtotal - discount);
  const gst = round(taxable * GST_RATE);
  const total = round(taxable + gst);

  return { subtotal, discount, taxable, gst, total };
}
