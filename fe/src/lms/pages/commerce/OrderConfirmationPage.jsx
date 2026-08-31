import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { formatCents } from '../../utils/money.js';
import { useOrder } from '../../hooks/useOrders.js';
import { useCart } from '../../context/CartContext.jsx';

function on(iso) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  });
}

// After payment (C1). Its job is to confirm the charge, say what happens next,
// and get the buyer into the course. A receipt that ends in a dead end wastes
// the moment someone is most motivated to start.
export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const { order } = useOrder(orderId);
  const { clear } = useCart();

  /* Empty the basket only once the SERVER says the order is paid.

     Not at checkout: someone who reaches Stripe and changes their mind should
     come back to the basket they had. Not on arriving here either, because this
     page is reachable with an unpaid order — Stripe redirects on cancel too,
     and a webhook can lag a second or two behind the browser. */
  useEffect(() => {
    if (order?.status === 'paid') clear();
  }, [order?.status, clear]);

  if (!order) {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">Order not found</h1>
            <p className="lms-page__subtitle">
              We couldn’t find that order. If you were charged, it will be in your orders.
            </p>
          </div>
        </div>
        <Link className="lms-btn lms-btn--primary" to="/learn/orders">
          View my orders
        </Link>
      </div>
    );
  }

  const first = order.lines.find((i) => i.slug);

  return (
    <div className="lms-confirm">
      <section className="lms-confirm__hero">
        <span className="lms-confirm__tick">
          <LmsIcon name="check" />
        </span>
        <h1 className="lms-confirm__title">
          {order.total > 0 ? 'Payment received' : 'You’re enrolled'}
        </h1>
        <p className="lms-confirm__sub">
          {order.total > 0
            ? `${formatCents(order.total, order.currency)} charged. A receipt is on its way to your email.`
            : 'Your enrolment is confirmed and your course is ready.'}
        </p>

        <div className="lms-confirm__actions">
          {first ? (
            <Link className="lms-btn lms-btn--mint" to={`/learn/courses/${first.slug}`}>
              <LmsIcon name="play" />
              Start learning
            </Link>
          ) : null}
          <Link className="lms-btn lms-confirm__ghost" to="/learn/my-courses">
            My courses
          </Link>
        </div>
      </section>

      <div className="lms-confirm__cols">
        <section className="lms-card">
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="cart" />
              What you bought
            </h2>
            <span className="lms-card__note">{order.reference}</span>
          </div>

          <ul className="lms-order__items" style={{ padding: 0 }}>
            {order.lines.map((item) => (
              <li key={item.title}>
                <span className="lms-order__item-icon">
                  <LmsIcon name={item.kind === 'membership' ? 'badge' : 'book'} />
                </span>
                <span className="lms-order__item-title">
                  {item.slug ? (
                    <Link to={`/learn/courses/${item.slug}`}>{item.title}</Link>
                  ) : (
                    item.title
                  )}
                </span>
                <span className="lms-order__item-amount">
                  {item.amount ? formatCents(item.amount, order.currency) : 'Free'}
                </span>
              </li>
            ))}
          </ul>

          <dl className="lms-totals" style={{ marginTop: 4 }}>
            <div>
              <dt>Price before GST</dt>
              <dd>{formatCents(order.net, order.currency)}</dd>
            </div>
            <div>
              <dt>Includes GST (10%)</dt>
              <dd>{formatCents(order.gst, order.currency)}</dd>
            </div>
            <div className="lms-totals__grand">
              <dt>Total paid</dt>
              <dd>{formatCents(order.total, order.currency)}</dd>
            </div>
          </dl>

          {order.total > 0 ? (
            <Link className="lms-btn lms-btn--sm" to={`/learn/orders/${order._id}/invoice`} style={{ marginTop: 16 }}>
              <LmsIcon name="doc" />
              View tax invoice
            </Link>
          ) : null}
        </section>

        <section className="lms-card">
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="check" />
              What happens next
            </h2>
          </div>

          <ol className="lms-next">
            <li>
              <span className="lms-next__num">1</span>
              <span>
                <strong>Access is live now.</strong> Everything you bought is already in My
                Courses, so there is nothing to activate.
              </span>
            </li>
            <li>
              <span className="lms-next__num">2</span>
              <span>
                <strong>Your receipt is on the way.</strong> A tax invoice for{' '}
                {order.reference}, dated {on(order.placedAt)}, is in your orders and in your
                inbox.
              </span>
            </li>
            <li>
              <span className="lms-next__num">3</span>
              <span>
                <strong>Work at your own pace.</strong> Access doesn’t expire. Progress saves
                as you go, and you’ll earn a certificate on completion.
              </span>
            </li>
          </ol>

          <p className="lms-detail__note">
            Changed your mind? You can request a refund within 7 days. Quote{' '}
            {order.reference}.
          </p>
        </section>
      </div>
    </div>
  );
}
