import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { formatCents } from '../../utils/money.js';
import { ORDER_STATUS_LABEL } from '../../hooks/useOrders.js';

const PILL = {
  paid: 'lms-pill--done',
  refunded: 'lms-pill--due',
  pending: 'lms-pill--due',
  cancelled: '',
};

function on(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  });
}

/* One order in the list (C1).

   Amounts arrive in CENTS and are tax-inclusive, so the total is shown first
   and the GST underneath it as a component — never added on top. */
export default function OrderRow({ order }) {
  return (
    <article className="lms-order">
      <div className="lms-order__head">
        <div>
          <span className="lms-order__ref">{order.reference}</span>
          <span className="lms-order__date">{on(order.placedAt)}</span>
        </div>
        <span className={`lms-pill ${PILL[order.status] ?? ''}`}>
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <ul className="lms-order__items">
        {order.lines.map((line) => (
          <li key={`${order._id}-${line.title}`}>
            <span className="lms-order__item-icon">
              <LmsIcon name="book" />
            </span>
            <span className="lms-order__item-title">
              {line.slug ? (
                <Link to={`/learn/courses/${line.slug}`}>{line.title}</Link>
              ) : (
                line.title
              )}
            </span>
            <span className="lms-order__item-amount">
              {formatCents(line.amount, order.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="lms-order__foot">
        <div className="lms-order__totals">
          <span className="lms-order__grand">
            Total <strong>{formatCents(order.total, order.currency)}</strong>
          </span>
          <span>
            incl. GST <strong>{formatCents(order.gst, order.currency)}</strong>
          </span>
        </div>

        <div className="lms-order__actions">
          {order.payment?.last4 ? (
            <span className="lms-order__card">
              {order.payment.brand} ···· {order.payment.last4}
            </span>
          ) : null}
          {order.status === 'paid' ? (
            <Link className="lms-btn lms-btn--sm" to={`/learn/orders/${order._id}/invoice`}>
              <LmsIcon name="doc" />
              Invoice
            </Link>
          ) : null}
        </div>
      </div>

      {order.status === 'refunded' ? (
        <p className="lms-order__note">
          <LmsIcon name="clock" />
          Refunded {on(order.refundedAt)}. Access to these courses has been withdrawn.
        </p>
      ) : null}
    </article>
  );
}
