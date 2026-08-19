import mongoose from 'mongoose';
import { RULE_STATES } from './ProcurementRule.js';

// A6.7 — a versioned overlay of the advisor's rule data for one jurisdiction.
//
// WHAT THIS IS NOT. It is not the whole rule pack. The advisor's decision logic
// — which question follows which, how a pathway is ranked, what makes a ground
// for direct negotiation — lives in code (fe/src/features/advisor/rules/*.js)
// and is reviewed there. An admin form that could redefine control flow would
// be a code editor without any of the safeguards of one.
//
// What changes when policy moves is the numbers and the citations: a threshold
// rises, a direction is superseded, a source moves. That is what this holds,
// and what the site merges over the built-in pack at runtime, so a threshold
// change is published from the CMS rather than deployed.
//
// Versions are kept rather than overwritten: exactly one per jurisdiction is
// `active`, the rest are history you can look back at or restore.
// Every jurisdiction the site knows about, taken from RULE_STATES rather than
// restated, so the advisor can never offer a set the rest of the CMS doesn't.
// Lowercase because these appear in URLs (/advisory/nsw).
export const RULE_PACK_JURISDICTIONS = RULE_STATES.map((s) => s.toLowerCase());

const rulePackSchema = new mongoose.Schema(
  {
    jurisdiction: {
      type: String,
      enum: RULE_PACK_JURISDICTIONS,
      required: true,
      index: true,
    },
    // Shown on the result as "rules as at …", so it is the date an editor is
    // asserting the figures were correct — not the date the record was saved.
    version: { type: String, required: true, trim: true },
    asAt: { type: String, default: '', trim: true },
    // Free note for the editor: what changed and why.
    changeNote: { type: String, default: '', trim: true },

    // { thresholdKey: number }. Keys the built-in pack does not define are
    // ignored by the site rather than silently doing nothing visible.
    thresholds: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { sourceKey: { title, note, url, asAt } }
    sources: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Exactly one active version per jurisdiction — enforced in the controller,
    // which clears the flag on the others inside the same request.
    active: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

rulePackSchema.index({ jurisdiction: 1, active: 1 });

export const RulePack = mongoose.model('RulePack', rulePackSchema);
