import { formatMoney } from '../../utils/money.js';

/* The totals block (C1).

   Prices here are TAX-INCLUSIVE, so this reads top-down as: the total, then
   what it is made of. That ordering is deliberate — the number the buyer is
   about to be charged is the one they came to see, and burying it under a
   subtotal they never have to pay is how a checkout loses trust.

   The GST line stays itemised even though it is not an addition: an Australian
   business claiming the input tax credit needs the component stated, and it is
   what makes "includes GST" verifiable rather than a claim. */
export default function GstBreakdown({ totals, currency = 'AUD' }) {
  return (
    <dl className="lms-totals">
      <div className="lms-totals__grand">
        <dt>Total</dt>
        <dd>{formatMoney(totals.total, currency)}</dd>
      </div>

      <div className="lms-totals__note">
        <dt>Includes GST (10%)</dt>
        <dd>{formatMoney(totals.gst, currency)}</dd>
      </div>

      <div className="lms-totals__note">
        <dt>Price before GST</dt>
        <dd>{formatMoney(totals.net, currency)}</dd>
      </div>

      <p className="lms-totals__inclusive">
        All prices include GST. There is nothing added at the payment step.
      </p>
    </dl>
  );
}
