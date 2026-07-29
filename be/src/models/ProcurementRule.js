import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';

export const RULE_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

// Kept in step with CATEGORIES in fe/src/features/jurisdictions/data.js, which
// holds the display label and icon for each value.
export const RULE_CATEGORIES = ['thresholds', 'panels', 'local-sme', 'probity'];

// A single procurement rule shown on the Jurisdictional links page.
const procurementRuleSchema = new mongoose.Schema(
  {
    state: { type: String, enum: RULE_STATES, required: true, index: true },
    category: { type: String, enum: RULE_CATEGORIES, required: true, index: true },
    title: { type: String, required: true, trim: true },
    // Optional chip, e.g. "≥ $200,000".
    threshold: { type: String, default: '' },
    body: { type: String, default: '' },
    // "Read more" target — the official source for the rule. Optional: without
    // one the card simply doesn't show the action.
    sourceUrl: { type: String, default: '' },
    order: { type: Number, default: 0 },
    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.PUBLISHED, index: true },
  },
  { timestamps: true },
);

export const ProcurementRule = mongoose.model('ProcurementRule', procurementRuleSchema);
