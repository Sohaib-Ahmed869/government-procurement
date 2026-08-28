import { gstInside, formatMoney } from '../../utils/money.js';

/* Course price (C2). Free courses say so in words rather than showing "$0".

   The note used to read "+ GST", from when prices were tax-exclusive. They are
   inclusive now — the checkout charges exactly this figure — so "+ GST" was
   telling a buyer they would pay 10% more than they will, on the card that
   makes them decide. It also breaks the Australian Consumer Law expectation of
   one prominent total price. */
export default function PriceTag({ price, currency = 'AUD', size = 'md' }) {
  if (!price) {
    return <span className={`lms-price lms-price--free lms-price--${size}`}>Free</span>;
  }

  const formatted = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);

  return (
    <span className={`lms-price lms-price--${size}`}>
      {formatted}
      <span className="lms-price__note" title={`Includes ${formatMoney(gstInside(price))} GST`}>
        incl. GST
      </span>
    </span>
  );
}
