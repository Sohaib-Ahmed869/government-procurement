import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { money, useOrder } from '../../hooks/useOrders.js';

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
  const order = useOrder(orderId);

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

  const first = order.items.find((i) => i.slug);

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
            ? `${money(order.total, order.currency)} charged. A receipt is on its way to your email.`
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
            {order.items.map((item) => (
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
                  {item.amount ? money(item.amount, order.currency) : 'Free'}
                </span>
              </li>
            ))}
          </ul>

          <dl className="lms-totals" style={{ marginTop: 4 }}>
            <div>
              <dt>Subtotal</dt>
              <dd>{money(order.subtotal, order.currency)}</dd>
            </div>
            {order.discount > 0 ? (
              <div className="lms-totals__discount">
                <dt>Discount {order.coupon ? `(${order.coupon})` : ''}</dt>
                <dd>−{money(order.discount, order.currency)}</dd>
              </div>
            ) : null}
            <div>
              <dt>GST (10%)</dt>
              <dd>{money(order.gst, order.currency)}</dd>
            </div>
            <div className="lms-totals__grand">
              <dt>Total paid</dt>
              <dd>{money(order.total, order.currency)}</dd>
            </div>
          </dl>

          {order.total > 0 ? (
            <Link className="lms-btn lms-btn--sm" to={`/learn/orders/${order.id}/invoice`} style={{ marginTop: 16 }}>
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
            Changed your mind? You can request a refund within 14 days. Quote{' '}
            {order.reference}.
          </p>
        </section>
      </div>
    </div>
  );
}
