import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import CartSummary from '../../components/commerce/CartSummary.jsx';
import { formatMoney } from '../../utils/money.js';
import { useCart } from '../../context/CartContext.jsx';
import { useCheckout } from '../../hooks/useCheckout.js';

// Checkout (C1/C2). Where "Enrol now" lands.
//
// `?course=slug` adds that course to the basket on arrival, so the button can
// link straight here without a separate add-to-cart step, while the basket
// still supports more than one line.
export default function CheckoutPage() {
  const [params] = useSearchParams();
  const { items, add, remove } = useCart();
  const checkout = useCheckout(items);

  const wanted = params.get('course');
  useEffect(() => {
    if (wanted) add(wanted);
  }, [wanted, add]);

  /* Hands off to Stripe's hosted page. There is no local success state and
     nothing to clear here: on success the browser leaves this app entirely, and
     the basket is emptied by the confirmation screen once the order is known to
     be paid. Clearing it now would lose the basket of anyone who gets as far as
     Stripe and then changes their mind. */
  const payNow = () => checkout.submit();

  if (items.length === 0) {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">Checkout</h1>
            <p className="lms-page__subtitle">There’s nothing to check out.</p>
          </div>
        </div>
        <div className="lms-card">
          <div className="lms-blank">
            <LmsIcon name="cart" className="lms-blank__icon" />
            <h2>Your basket is empty</h2>
            <p>Find a course in the catalogue and choose “Enrol now” to come back here.</p>
            <Link className="lms-btn lms-btn--primary" to="/learn/courses">
              Browse the catalogue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <Link className="lms-backlink" to="/learn/courses">
            <LmsIcon name="chevron" className="lms-backlink__icon" />
            Back to the catalogue
          </Link>
          <h1 className="lms-page__title">Checkout</h1>
          <p className="lms-page__subtitle">
            All prices include GST. You’ll have access as soon as payment goes through.
          </p>
        </div>
      </div>

      <div className="lms-checkout">
        <div className="lms-checkout__main">
          <div className="lms-card lms-paypanel">
            <h2 className="lms-paypanel__title">Payment</h2>
            <p className="lms-paypanel__text">
              You’ll be taken to Stripe to pay by card, then straight back here. Your card
              details are entered on Stripe’s page and never reach us.
            </p>

            {checkout.commerce.ready === false ? (
              <p className="lms-alert lms-alert--error">
                {checkout.commerce.message ?? 'Payments are not available yet.'}
              </p>
            ) : null}

            {checkout.commerce.mode === 'test' ? (
              <p className="lms-paypanel__mode">
                Test mode — no money moves. Use card 4242 4242 4242 4242 with any future expiry
                and any CVC.
              </p>
            ) : null}

            {checkout.error ? (
              <p className="lms-alert lms-alert--error">{checkout.error}</p>
            ) : null}

            <button
              type="button"
              className="lms-btn lms-btn--primary lms-btn--block"
              onClick={payNow}
              disabled={checkout.status === 'processing' || checkout.commerce.ready === false}
            >
              {checkout.status === 'processing'
                ? 'Taking you to Stripe…'
                : `Pay ${formatMoney(checkout.totals.total)} securely`}
            </button>
          </div>
        </div>

        <CartSummary
          items={items}
          totals={checkout.totals}
          onRemoveItem={items.length > 1 ? remove : undefined}
        />
      </div>
    </div>
  );
}
