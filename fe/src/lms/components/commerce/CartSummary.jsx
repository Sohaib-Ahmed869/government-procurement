import LmsIcon from '../LmsIcon.jsx';
import CartLineItem from './CartLineItem.jsx';
import GstBreakdown from './GstBreakdown.jsx';

// The order summary beside the checkout form (C1/C2). Sticky on desktop so the
// total stays visible while the buyer fills in their details. A total that
// scrolls away is a total people stop trusting.
/* Coupons are NOT rendered here. There is no server-side discount — the order
   endpoint prices from the Course record and ignores anything else — so a
   promotion-code box would be a field that silently does nothing. Coupons and
   promotions are C2 in the scope; the input comes back when the server can
   honour it. */
export default function CartSummary({ items, totals, onRemoveItem }) {
  return (
    <aside className="lms-summary">
      <div className="lms-card">
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="cart" />
            Order summary
          </h2>
          <span className="lms-card__note">
            {items.length} item{items.length === 1 ? '' : 's'}
          </span>
        </div>

        <ul className="lms-lines">
          {items.map((item) => (
            <CartLineItem key={item.slug} item={item} onRemove={onRemoveItem} />
          ))}
        </ul>

        <GstBreakdown totals={totals} />

        <ul className="lms-assurance">
          <li>
            <LmsIcon name="check" />
            Lifetime access to everything you buy
          </li>
          <li>
            <LmsIcon name="check" />
            14-day refund if it isn’t right for you
          </li>
          <li>
            <LmsIcon name="doc" />
            Tax invoice issued immediately
          </li>
        </ul>
      </div>
    </aside>
  );
}
