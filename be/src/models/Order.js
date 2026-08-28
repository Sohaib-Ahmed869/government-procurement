import mongoose from 'mongoose';

/* ---------------------------------------------------------------------------
   A purchase (C1/C2).

   ---- Amounts are STORED, never recomputed ---------------------------------

   Every figure here is frozen at the moment of sale, including the GST rate.
   An invoice is a record of what was actually charged; if a course is re-priced
   next month, or the GST rate changes in some future budget, a past invoice
   must still show what that customer paid. Deriving these on read would quietly
   rewrite financial history, and the first person to notice would be an
   auditor.

   The same reasoning applies to the course TITLE on each line: it is copied,
   not populated. A course renamed after the sale must not retitle the receipt.

   ---- Cents ----------------------------------------------------------------

   Integers throughout, matching src/utils/gst.js and Stripe. Money in floats is
   money that is occasionally a cent out.

   ---- Prices are tax-INCLUSIVE ---------------------------------------------

   `total` is what the customer paid. `gst` is the component inside it, not an
   addition to it. `net + gst === total` always.
   ------------------------------------------------------------------------ */

export const ORDER_STATUS = {
  // Created, sent to Stripe, not yet paid. Confers nothing.
  PENDING: 'pending',
  PAID: 'paid',
  // The customer abandoned the Stripe page, or the card was declined.
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

const orderLineSchema = new mongoose.Schema(
  {
    /* One of `course` or `bundle`, never both — `kind` says which.

       A bundle is a commercial grouping, not a course, so it cannot be squeezed
       into the course field. `grants` is the courses it hands over, COPIED at
       purchase like the title and the price: re-editing a bundle next month
       must not change what somebody already bought. */
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    bundle: { type: mongoose.Schema.Types.ObjectId, ref: 'Bundle' },
    grants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    // Copied at purchase. See the note above about renames.
    title: { type: String, required: true },
    slug: { type: String, default: '' },
    kind: { type: String, enum: ['course', 'bundle'], default: 'course' },
    // Tax-inclusive, in cents.
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    /* The human-facing number, on the invoice and in any email about it.
       Sequential-looking rather than a raw ObjectId, because customers read
       these out over the phone. */
    reference: { type: String, required: true, unique: true, index: true },

    lines: { type: [orderLineSchema], default: [] },

    // net + gst === total. All cents, all inclusive of tax.
    net: { type: Number, required: true, min: 0 },
    gst: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    // Stored, not read from config: a rate change must not restate old orders.
    gstRate: { type: Number, required: true },
    currency: { type: String, default: 'AUD' },

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },

    /* Stripe's side of it.

       `sessionId` is what the redirect comes back with; `paymentIntent` is what
       a refund is issued against. Both stored because they answer different
       questions later, and neither can be derived from the other without an
       API call. */
    stripe: {
      sessionId: { type: String, default: '', index: true },
      paymentIntent: { type: String, default: '' },
      // Last four and brand, for the invoice. Never the full number — that
      // never touches this server, which is the point of Checkout.
      brand: { type: String, default: '' },
      last4: { type: String, default: '' },
    },

    // The address the receipt goes to, as given at checkout. Copied rather than
    // read off the user, who may change their email afterwards.
    buyerEmail: { type: String, default: '' },
    buyerName: { type: String, default: '' },

    paidAt: { type: Date },
    refundedAt: { type: Date },
    refundReason: { type: String, default: '' },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });

// What a learner's orders screen and the invoice both read. Cents are kept as
// cents; formatting is the client's job, and a server that pre-formats money
// forces every screen to parse it back to do arithmetic.
orderSchema.methods.toJSONSafe = function toJSONSafe() {
  return {
    _id: this._id,
    reference: this.reference,
    status: this.status,
    lines: this.lines.map((l) => ({
      course: l.course,
      bundle: l.bundle,
      grants: l.grants,
      title: l.title,
      slug: l.slug,
      kind: l.kind,
      amount: l.amount,
    })),
    net: this.net,
    gst: this.gst,
    total: this.total,
    gstRate: this.gstRate,
    currency: this.currency,
    // The invoice has to state this, and it is a property of the ORDER rather
    // than of the system — an order taken under a different regime would say
    // something else.
    taxInclusive: true,
    payment: { brand: this.stripe?.brand ?? '', last4: this.stripe?.last4 ?? '' },
    buyerEmail: this.buyerEmail,
    buyerName: this.buyerName,
    placedAt: this.createdAt,
    paidAt: this.paidAt,
    refundedAt: this.refundedAt,
  };
};

export const Order = mongoose.model('Order', orderSchema);
