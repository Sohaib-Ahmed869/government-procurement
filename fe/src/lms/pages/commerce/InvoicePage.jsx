import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { formatCents } from '../../utils/money.js';
import { useOrder } from '../../hooks/useOrders.js';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';
import { useProfile } from '../../hooks/useProfile.js';

function on(iso) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  });
}

// A tax invoice (C1). Printing is the download. The browser's own "Save as
// PDF" gives a proper vector PDF and the print stylesheet strips the app chrome,
// which beats adding a PDF dependency for one document.
//
// TODO: the issuer block is a placeholder. A compliant Australian tax invoice
// must carry the supplier's registered name and ABN, and those belong in
// settings on the server, not hardcoded here.
export default function InvoicePage() {
  const { orderId } = useParams();
  const { order } = useOrder(orderId);
  const { user } = useStudentAuth();
  const profile = useProfile();

  const print = useCallback(() => window.print(), []);

  if (!order) {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">Invoice not found</h1>
            <p className="lms-page__subtitle">That order doesn’t exist.</p>
          </div>
        </div>
        <Link className="lms-btn lms-btn--primary" to="/learn/orders">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="lms-page__head lms-noprint">
        <div>
          <Link className="lms-backlink" to="/learn/orders">
            <LmsIcon name="chevron" className="lms-backlink__icon" />
            Orders
          </Link>
          <h1 className="lms-page__title">Tax invoice</h1>
          <p className="lms-page__subtitle">{order.reference}</p>
        </div>
        <div className="lms-page__actions">
          <button type="button" className="lms-btn lms-btn--primary" onClick={print}>
            <LmsIcon name="download" />
            Download / print
          </button>
        </div>
      </div>

      <div className="lms-invoice">
        <div className="lms-invoice__head">
          <div>
            <p className="lms-invoice__kind">Tax invoice</p>
            <p className="lms-invoice__ref">{order.reference}</p>
          </div>
          <div className="lms-invoice__issuer">
            <strong>Government Procurement</strong>
            <span>ABN 00 000 000 000</span>
            <span>Canberra ACT, Australia</span>
          </div>
        </div>

        <div className="lms-invoice__parties">
          <div>
            <p className="lms-invoice__label">Billed to</p>
            <p className="lms-invoice__party">{user?.name ?? 'Your name'}</p>
            {profile.organisation ? <p>{profile.organisation}</p> : null}
            {user?.email ? <p>{user.email}</p> : null}
          </div>
          <div>
            <p className="lms-invoice__label">Issued</p>
            <p className="lms-invoice__party">{on(order.placedAt)}</p>
            {order.payment ? (
              <p>
                Paid by {order.payment.brand} ···· {order.payment.last4}
              </p>
            ) : (
              <p>No payment required</p>
            )}
          </div>
        </div>

        <table className="lms-invoice__table">
          <thead>
            <tr>
              <th scope="col">Description</th>
              <th scope="col" className="lms-invoice__num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((item) => (
              <tr key={item.title}>
                <td>{item.title}</td>
                <td className="lms-invoice__num">{formatCents(item.amount, order.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Subtotal</td>
              <td className="lms-invoice__num">{formatCents(order.net, order.currency)}</td>
            </tr>
            <tr>
              <td>GST (10%)</td>
              <td className="lms-invoice__num">{formatCents(order.gst, order.currency)}</td>
            </tr>
            <tr className="lms-invoice__total">
              <td>Total {order.currency}</td>
              <td className="lms-invoice__num">{formatCents(order.total, order.currency)}</td>
            </tr>
          </tfoot>
        </table>

        {order.status === 'refunded' ? (
          <p className="lms-invoice__refund">
            This order was refunded on {on(order.refundedAt)}. {order.refundReason}.
          </p>
        ) : null}

        <p className="lms-invoice__foot">
          This document is a tax invoice for GST purposes. Retain it for your records.
        </p>
      </div>
    </div>
  );
}
