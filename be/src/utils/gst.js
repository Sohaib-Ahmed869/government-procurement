/* ---------------------------------------------------------------------------
   Australian GST, on TAX-INCLUSIVE prices (C1).

   The decision this file encodes: a price in this system is what the customer
   pays. $690 means $690 at the checkout, and the GST is a component already
   inside it — not 10% waiting to be added on top.

   That is the right way round for two reasons. Australian Consumer Law requires
   a single, prominent total price for consumers, so "$690 + GST" on a page a
   member of the public can reach is a compliance problem. And an inclusive
   price cannot drift: the number on the course page is the number on the card
   statement, whatever happens between them.

   ---- The arithmetic --------------------------------------------------------

   For a total T that already includes 10% GST:

     ex-GST  = T / 1.1        = T * 10/11
     GST     = T - ex-GST     = T / 11

   NOT `T * 0.1`. That is the exclusive formula and it over-states the tax by
   10% — on a $690 sale it reports $69.00 instead of $62.73, which is a real
   number on a real BAS.

   ---- Everything is in CENTS ------------------------------------------------

   Integers throughout. `0.1 + 0.2 !== 0.3` in floating point, and money that
   is a cent out is money an auditor asks about. Stripe works in the smallest
   currency unit for the same reason, so this also removes a conversion at the
   boundary that would otherwise be a place to round twice.
   ------------------------------------------------------------------------ */

// The current Australian rate. One place, so a change is one line — and a rate
// change means new orders only: past orders keep the rate they were charged at,
// which is why `gstRate` is stored on the order rather than read from here.
export const GST_RATE = 0.1;

// 10% inclusive means the tax is one eleventh of the total. Derived rather than
// written as `11` so that changing GST_RATE alone stays correct.
const inclusiveDivisor = (rate = GST_RATE) => (1 + rate) / rate;

export const toCents = (dollars) => Math.round(Number(dollars || 0) * 100);
export const toDollars = (cents) => Math.round(Number(cents || 0)) / 100;

/* The GST component inside a tax-inclusive total.

   Rounded half-up to the nearest cent. Rounding at this single point, rather
   than per line and again at the end, is what makes the components add back to
   the total exactly — see splitInclusive below. */
export function gstFromInclusive(totalCents, rate = GST_RATE) {
  return Math.round(Number(totalCents || 0) / inclusiveDivisor(rate));
}

/* Splits a tax-inclusive total into what the invoice has to print.

   `net + gst === total` is guaranteed because net is derived by SUBTRACTION
   rather than computed independently. Two independently rounded figures that
   happen to sum to a third is a coincidence, not an invariant, and it fails on
   totals like $0.05. */
export function splitInclusive(totalCents, rate = GST_RATE) {
  const total = Math.round(Number(totalCents || 0));
  const gst = gstFromInclusive(total, rate);
  return { total, gst, net: total - gst };
}

// For screens and emails: "$690.00", "$62.73".
export function formatCents(cents, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(toDollars(cents));
}
