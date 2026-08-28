import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import OrderRow from '../../components/commerce/OrderRow.jsx';
import { formatCents } from '../../utils/money.js';
import { useOrders } from '../../hooks/useOrders.js';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
];

// Purchases, invoices and the active membership (C1/C2).
export default function OrdersPage() {
  const { orders, spentCents, status, error } = useOrders();
  // Surfaced rather than swallowed: an orders page that renders "no orders"
  // while a request is still in flight tells the reader something untrue.

  const [tab, setTab] = useState('all');

  const visible = useMemo(
    () => (tab === 'all' ? orders : orders.filter((o) => o.status === tab)),
    [orders, tab],
  );

  // Refunds are excluded. "spent" should mean money the customer is actually
  // out of pocket, not gross transaction volume.
  const spent = spentCents;

  if (status === 'error') {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">Orders</h1>
          </div>
        </div>
        <div className="lms-card">
          <p className="lms-empty">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Orders</h1>
          <p className="lms-page__subtitle">
            {orders.length} order{orders.length === 1 ? '' : 's'} · {formatCents(spent)} spent
            {' '}(including GST).
          </p>
        </div>
      </div>

      

      <div className="lms-filters">
        <div className="lms-segmented">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`lms-segmented__btn${tab === t.value ? ' is-active' : ''}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="lms-card">
          <div className="lms-blank">
            <LmsIcon name="cart" className="lms-blank__icon" />
            <h2>{tab === 'all' ? 'No orders yet' : `No ${tab} orders`}</h2>
            <p>Courses you buy will appear here with their invoices.</p>
            <Link className="lms-btn lms-btn--primary" to="/learn/courses">
              Browse the catalogue
            </Link>
          </div>
        </div>
      ) : (
        <div className="lms-orders">
          {visible.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </div>
      )}

      <p className="lms-detail__note" style={{ marginTop: 18 }}>
        Need a receipt reissued or have a billing question? Contact us and quote the order
        reference.
      </p>
    </div>
  );
}
