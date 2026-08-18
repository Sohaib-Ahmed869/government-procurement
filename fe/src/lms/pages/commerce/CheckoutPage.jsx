import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import CheckoutForm from '../../components/commerce/CheckoutForm.jsx';
import CartSummary from '../../components/commerce/CartSummary.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCheckout } from '../../hooks/useCheckout.js';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';

// Checkout (C1/C2). Where "Enrol now" lands.
//
// `?course=slug` adds that course to the basket on arrival, so the button can
// link straight here without a separate add-to-cart step, while the basket
// still supports more than one line.
export default function CheckoutPage() {
  const [params] = useSearchParams();
  const { items, add, remove, clear } = useCart();
  const { user } = useStudentAuth();
  const navigate = useNavigate();
  const checkout = useCheckout(items);

  const wanted = params.get('course');
  useEffect(() => {
    if (wanted) add(wanted);
  }, [wanted, add]);

  const placeOrder = async (billing) => {
    const order = await checkout.submit(billing);
    if (!order) return;
    clear();
    navigate(`/learn/checkout/confirmation/${order.id}`, { replace: true });
  };

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
            You’ll have access as soon as payment goes through.
          </p>
        </div>
      </div>

      <div className="lms-checkout">
        <div className="lms-checkout__main">
          <CheckoutForm
            user={user}
            total={checkout.totals.total}
            currency="AUD"
            status={checkout.status}
            error={checkout.error}
            onSubmit={placeOrder}
          />
        </div>

        <CartSummary
          items={items}
          totals={checkout.totals}
          coupon={checkout.coupon}
          couponError={checkout.couponError}
          onApplyCoupon={checkout.applyCoupon}
          onRemoveCoupon={checkout.removeCoupon}
          onRemoveItem={items.length > 1 ? remove : undefined}
        />
      </div>
    </div>
  );
}
