import { formatMoney } from '../../utils/money.js';

// Subtotal → discount → GST → total (C1). Shown in full rather than as one
// number because an Australian buyer claiming the credit needs the GST line
// itemised, and because a total that appears without its parts reads as a
// surprise at exactly the wrong moment.
export default function GstBreakdown({ totals, coupon, currency = 'AUD' }) {
  return (
    <dl className="lms-totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{formatMoney(totals.subtotal, currency)}</dd>
      </div>

      {totals.discount > 0 ? (
        <div className="lms-totals__discount">
          <dt>Discount {coupon ? `(${coupon.code})` : ''}</dt>
          <dd>−{formatMoney(totals.discount, currency)}</dd>
        </div>
      ) : null}

      <div>
        <dt>GST (10%)</dt>
        <dd>{formatMoney(totals.gst, currency)}</dd>
      </div>

      <div className="lms-totals__grand">
        <dt>Total</dt>
        <dd>{formatMoney(totals.total, currency)}</dd>
      </div>
    </dl>
  );
}
