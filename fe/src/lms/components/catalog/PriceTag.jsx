// Course price (C2). Free courses say so in words rather than showing "$0",
// and paid ones note that GST is added at checkout. The trading entity's GST
// is calculated server-side (C1), so the catalogue never asserts a tax figure
// it didn't compute.
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
      <span className="lms-price__note">+ GST</span>
    </span>
  );
}
