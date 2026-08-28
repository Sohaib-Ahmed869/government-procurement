/* ---------------------------------------------------------------------------
   Money and Australian GST (C1).

   PRICES IN THIS SYSTEM ARE TAX-INCLUSIVE. A course priced at $690 costs $690
   at the checkout; the GST is a component already inside that number, not 10%
   waiting to be added on top.

   Two reasons it is this way round. Australian Consumer Law wants a single,
   prominent total price for consumers, so "$690 + GST" on a public page is a
   compliance problem rather than a formatting choice. And an inclusive price
   cannot drift — the number on the course card is the number on the card
   statement.

   ---- The arithmetic, and the mistake it avoids -----------------------------

     GST inside a total  =  total / 11        (for a 10% inclusive rate)
     ex-GST              =  total − GST

   NOT `total * 0.1`. That is the exclusive formula and it over-states the tax
   by 10% — $69.00 instead of $62.73 on a $690 sale.

   ---- This is a DISPLAY of the server's numbers -----------------------------

   Everything here is for showing a figure before the server has spoken. The
   amount actually charged, and the GST recorded against it, are computed by
   be/src/utils/gst.js at the point of sale and stored on the order. A tax
   figure the browser can change is a tax figure anyone can change.
   ------------------------------------------------------------------------ */

export const GST_RATE = 0.1;

// 10% inclusive means the tax is one eleventh of the total.
const INCLUSIVE_DIVISOR = (1 + GST_RATE) / GST_RATE;

export function formatMoney(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount || 0);
}

// Orders come back from the API in CENTS, matching Stripe and the server's own
// arithmetic. Screens that read an order use this rather than dividing inline.
export function formatCents(cents, currency = 'AUD') {
  return formatMoney((Number(cents) || 0) / 100, currency);
}

/* Prices a basket whose line amounts are already tax-inclusive dollars.

   `net + gst === total` holds because net is derived by SUBTRACTION. Rounding
   the two independently and hoping they sum to the third is how an invoice ends
   up a cent out. */
export function priceBasket(items) {
  const round = (n) => Math.round(n * 100) / 100;

  const total = round((items ?? []).reduce((sum, i) => sum + (i.amount || 0), 0));
  const gst = round(total / INCLUSIVE_DIVISOR);
  const net = round(total - gst);

  return { total, gst, net, taxInclusive: true };
}

// The GST component inside a single inclusive amount — for a course card that
// wants to say "incl. $62.73 GST" beside its price.
export function gstInside(amount) {
  return Math.round(((amount || 0) / INCLUSIVE_DIVISOR) * 100) / 100;
}
