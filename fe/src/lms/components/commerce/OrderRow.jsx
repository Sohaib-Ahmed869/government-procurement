import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { money } from '../../hooks/useOrders.js';

const STATUS = {
  paid: { label: 'Paid', cls: 'lms-pill--done' },
  refunded: { label: 'Refunded', cls: 'lms-pill--due' },
  free: { label: 'Free enrolment', cls: '' },
  pending: { label: 'Pending', cls: 'lms-pill--due' },
};

function on(iso) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  });
}

// One order in the list (C1/C2).
export default function OrderRow({ order }) {
  const status = STATUS[order.status] ?? STATUS.pending;

  return (
    <article className="lms-order">
      <div className="lms-order__head">
        <div>
          <span className="lms-order__ref">{order.reference}</span>
          <span className="lms-order__date">{on(order.placedAt)}</span>
        </div>
        <span className={`lms-pill ${status.cls}`}>{status.label}</span>
      </div>

      <ul className="lms-order__items">
        {order.items.map((item) => (
          <li key={`${order.id}-${item.title}`}>
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

      <div className="lms-order__foot">
        <div className="lms-order__totals">
          {order.total > 0 ? (
            <>
              <span>
                Subtotal <strong>{money(order.subtotal, order.currency)}</strong>
              </span>
              <span>
                GST <strong>{money(order.gst, order.currency)}</strong>
              </span>
              <span className="lms-order__grand">
                Total <strong>{money(order.total, order.currency)}</strong>
              </span>
            </>
          ) : (
            <span className="lms-order__grand">
              Total <strong>Free</strong>
            </span>
          )}
        </div>

        <div className="lms-order__actions">
          {order.payment ? (
            <span className="lms-order__card">
              {order.payment.brand} ···· {order.payment.last4}
            </span>
          ) : null}
          {order.total > 0 ? (
            <Link className="lms-btn lms-btn--sm" to={`/learn/orders/${order.id}/invoice`}>
              <LmsIcon name="doc" />
              Invoice
            </Link>
          ) : null}
        </div>
      </div>

      {order.status === 'refunded' ? (
        <p className="lms-order__note">
          <LmsIcon name="clock" />
          Refunded {on(order.refundedAt)}: {order.refundReason}
        </p>
      ) : null}
    </article>
  );
}
