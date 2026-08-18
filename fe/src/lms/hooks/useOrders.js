import { useSyncExternalStore } from 'react';
import { createStore } from '../utils/localStore.js';

/* ---------------------------------------------------------------------------
   Orders and invoices (C1/C2).

   Amounts are STORED, not recomputed. An order is a record of what was actually
   charged at the time, if the GST rate or a course price changes later, a past
   invoice must still show what the customer paid. Deriving these numbers on
   read would silently rewrite financial history.

   TODO: swap for an orders endpoint. Nothing here should ever be authoritative:
   the server owns pricing, tax and payment state, and this is a view of it.
   ------------------------------------------------------------------------ */
const store = createStore('gp.lms.orders');

store.seedOnce([
  {
    id: 'o-1042',
    reference: 'GP-2026-1042',
    placedAt: '2026-08-08T10:12:00+10:00',
    status: 'paid',
    items: [{ slug: 'tender-writing-essentials', title: 'Tender Writing Essentials', kind: 'course', amount: 690 }],
    subtotal: 690,
    gst: 69,
    total: 759,
    currency: 'AUD',
    payment: { brand: 'Visa', last4: '4242' },
  },
  {
    id: 'o-1038',
    reference: 'GP-2026-1038',
    placedAt: '2026-08-02T14:40:00+10:00',
    status: 'paid',
    items: [{ slug: 'procurement-risk-and-assurance', title: 'Procurement Risk and Assurance', kind: 'course', amount: 890 }],
    subtotal: 890,
    gst: 89,
    total: 979,
    currency: 'AUD',
    payment: { brand: 'Visa', last4: '4242' },
  },
  {
    id: 'o-1015',
    reference: 'GP-2026-1015',
    placedAt: '2026-07-11T09:05:00+10:00',
    status: 'paid',
    items: [
      { slug: 'contract-management-fundamentals', title: 'Contract Management Fundamentals', kind: 'course', amount: 590 },
      { slug: null, title: 'Practitioner Membership, 12 months', kind: 'membership', amount: 240 },
    ],
    subtotal: 830,
    gst: 83,
    total: 913,
    currency: 'AUD',
    payment: { brand: 'Mastercard', last4: '8210' },
  },
  {
    id: 'o-0994',
    reference: 'GP-2026-0994',
    placedAt: '2026-06-19T16:22:00+10:00',
    status: 'refunded',
    items: [{ slug: 'negotiation-for-procurement', title: 'Negotiation for Procurement', kind: 'course', amount: 990 }],
    subtotal: 990,
    gst: 99,
    total: 1089,
    currency: 'AUD',
    payment: { brand: 'Visa', last4: '4242' },
    refundedAt: '2026-06-24T11:00:00+10:00',
    refundReason: 'Cancelled within the 14-day period',
  },
  {
    id: 'o-0961',
    reference: 'GP-2026-0961',
    placedAt: '2026-05-30T08:45:00+10:00',
    status: 'free',
    items: [{ slug: 'ethics-and-probity', title: 'Ethics & Probity in Procurement', kind: 'course', amount: 0 }],
    subtotal: 0,
    gst: 0,
    total: 0,
    currency: 'AUD',
    payment: null,
  },
]);

// The membership bought in order o-1015. Separate from the order because a
// membership has a life of its own. It renews, lapses and can be cancelled
// independently of the purchase that started it.
export const MEMBERSHIP = {
  name: 'Practitioner Membership',
  status: 'active',
  startedAt: '2026-07-11T09:05:00+10:00',
  renewsAt: '2027-07-11T09:05:00+10:00',
  amount: 240,
  currency: 'AUD',
  interval: 'year',
  includes: [
    'All foundational courses at no extra cost',
    'Early access to new releases',
    '20% off advanced courses and workshops',
  ],
};

// Records a completed order. Placeholder-only: on the real thing the order is
// written by the server when Stripe confirms payment, and this client never
// gets to decide that money changed hands.
export function createOrder({ items, subtotal, discount, gst, total, coupon, billing }) {
  const all = store.read();
  const seq = 1043 + all.length;
  const order = {
    id: `o-${seq}`,
    reference: `GP-2026-${seq}`,
    placedAt: new Date().toISOString(),
    status: total > 0 ? 'paid' : 'free',
    items,
    subtotal,
    discount: discount || 0,
    gst,
    total,
    currency: 'AUD',
    coupon: coupon ?? null,
    payment: total > 0 ? { brand: 'Visa', last4: '4242' } : null,
    billing: billing ?? null,
  };
  store.write([order, ...all]);
  return order;
}

export function useOrders() {
  const raw = useSyncExternalStore(store.subscribe, store.read, store.read);
  return [...raw].sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

export function useOrder(id) {
  const raw = useSyncExternalStore(store.subscribe, store.read, store.read);
  return raw.find((o) => o.id === id) ?? null;
}

export function money(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
}
