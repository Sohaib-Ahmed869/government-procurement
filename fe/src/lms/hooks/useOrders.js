import { commerceApi } from '../../api/lms.js';
import { useApi } from './useApi.js';

/* ---------------------------------------------------------------------------
   Orders and invoices (C1), from the API.

   Replaces a localStorage store that was seeded with three invented purchases —
   including a $759 invoice for a course that did not exist. Everything here is
   now the server's record of what was actually charged.

   AMOUNTS ARE IN CENTS and are TAX-INCLUSIVE. `net + gst === total`, with the
   GST being the component inside the total rather than an addition to it, and
   `gstRate` frozen at the rate that applied on the day. A re-priced course or a
   future rate change must never restate a past invoice.
   ------------------------------------------------------------------------ */

export function useOrders() {
  const { data, status, error, reload } = useApi(() => commerceApi.mine(), []);
  const orders = data ?? [];

  return {
    orders,
    // Money the customer is actually out of pocket. Refunds excluded, because
    // "spent" should not mean gross transaction volume.
    spentCents: orders
      .filter((o) => o.status === 'paid')
      .reduce((sum, o) => sum + (o.total || 0), 0),
    status,
    error,
    reload,
  };
}

export function useOrder(id) {
  const { data, status, error, reload } = useApi(() => commerceApi.get(id), [id], { skip: !id });
  return { order: data, status, error, reload };
}

// The words on a status pill. Kept here so the orders list and the invoice
// cannot describe the same order differently.
export const ORDER_STATUS_LABEL = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};
