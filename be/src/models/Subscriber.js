import mongoose from 'mongoose';
import { SUBSCRIBER_STATUS, SUBSCRIBER_STATUSES } from '../constants/statuses.js';

// Newsletter subscribers with double opt-in (S11). `confirmToken` gates the
// pending→confirmed transition; `unsubscribeToken` powers one-click unsubscribe.
const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, default: '' },
    status: {
      type: String,
      enum: SUBSCRIBER_STATUSES,
      default: SUBSCRIBER_STATUS.PENDING,
      index: true,
    },
    audience: { type: String, enum: ['win', 'award', ''], default: '' },
    source: { type: String, default: 'website' },
    confirmToken: { type: String, select: false },
    unsubscribeToken: { type: String, select: false },
    confirmedAt: { type: Date },
    unsubscribedAt: { type: Date },
  },
  { timestamps: true },
);

export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
