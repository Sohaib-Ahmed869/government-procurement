// A6.7 — the editable rule fields, described for people rather than for code.
//
// The advisor's thresholds are keyed by short identifiers (`agencyThreeQuotes`,
// `gipaDisclosureInclGst`) that mean nothing to the person who has to keep them
// current. This file is the translation layer: one entry per threshold, with
// the label an editor should see, the sentence explaining what it controls, and
// how the figure is written.
//
// Keys must match THRESHOLDS in rules/nsw.js. A key here that the pack doesn't
// define simply won't be offered for editing; a key in the pack that isn't here
// falls into "Other thresholds" so nothing becomes invisible just because this
// file wasn't updated.
//
// `format`:
//   money    — dollars, entered plain and shown with separators
//   percent  — a percentage
//   number   — a bare figure
export const THRESHOLD_GROUPS = [
  {
    title: 'Agency value bands',
    intro:
      'What an agency must do at each level of spend. These are the bands an unaccredited agency follows; accredited agencies often work to tighter internal rules.',
    fields: [
      {
        key: 'agencyAnySupplier',
        label: 'Buy from any supplier below',
        help: 'Under this value an agency may buy from any supplier, provided the rates are reasonable and consistent with the market.',
        format: 'money',
      },
      {
        key: 'agencySingleQuote',
        label: 'One written quotation required below',
        help: 'Between the value above and this one, at least one written quotation is required.',
        format: 'money',
      },
      {
        key: 'agencyThreeQuotes',
        label: 'Three written quotations required below',
        help: 'Between the value above and this one, at least three written quotations are required, or a process approved by the agency head or an accredited agency in the cluster.',
        format: 'money',
      },
      {
        key: 'wogExemptBelow',
        label: 'May go outside a whole-of-government contract below',
        help: 'An agency may contract any supplier below this value even where a whole-of-government arrangement covers the requirement.',
        format: 'money',
      },
    ],
  },
  {
    title: 'Direct engagement ceilings',
    intro:
      'The most that can be directly engaged under each set-aside policy. These are three separate figures and are not always the same.',
    fields: [
      { key: 'smeDirect', label: 'Small and medium enterprise', help: 'Ceiling for directly engaging an SME.', format: 'money' },
      { key: 'regionalDirect', label: 'Regional business', help: 'Ceiling for directly engaging a regional business.', format: 'money' },
      { key: 'aboriginalDirect', label: 'Aboriginal business', help: 'Ceiling for directly engaging an Aboriginal business.', format: 'money' },
    ],
  },
  {
    title: 'Participation requirements',
    intro: 'The values at which participation plans and weightings become required.',
    fields: [
      {
        key: 'smeParticipation',
        label: 'SME and Local Participation Plan required at or above',
        help: 'At or above this value a participation plan is required, along with the associated evaluation weighting.',
        format: 'money',
      },
      {
        key: 'appParticipation',
        label: 'Aboriginal participation required at or above',
        help: 'At or above this value the Aboriginal Procurement Policy participation requirement applies.',
        format: 'money',
      },
      {
        key: 'appParticipationPct',
        label: 'Aboriginal participation percentage',
        help: 'The percentage of contract value the participation requirement sets.',
        format: 'percent',
      },
    ],
  },
  {
    title: 'Enforceable procurement provisions',
    intro:
      'The values at which a procurement becomes “covered” under international procurement agreements, and an open approach to market is generally required.',
    fields: [
      { key: 'eppGoodsServices', label: 'Goods and other services (ex GST)', help: 'Covered procurement threshold for goods and services.', format: 'money' },
      { key: 'eppConstruction', label: 'Construction (ex GST)', help: 'Covered procurement threshold for construction.', format: 'money' },
    ],
  },
  {
    title: 'Disclosure and reporting',
    intro: 'These figures are inclusive of GST, unlike most others on this page.',
    fields: [
      { key: 'gipaDisclosureInclGst', label: 'Contract register disclosure (incl GST)', help: 'At or above this value a contract goes on the register of government contracts.', format: 'money' },
      { key: 'gipaClass3InclGst', label: 'Class 3 contract (incl GST)', help: 'At or above this value a class 2 contract becomes a class 3 contract.', format: 'money' },
      { key: 'modernSlaveryReportInclGst', label: 'Modern slavery reporting (incl GST)', help: 'At or above this value heightened due diligence reporting applies.', format: 'money' },
    ],
  },
  {
    title: 'ICT',
    fields: [
      { key: 'iafIctProject', label: 'ICT Assurance Framework applies at or above', help: 'The value at which an ICT project comes under the assurance framework.', format: 'money' },
      { key: 'ictaHighValue', label: 'High-value ICT engagement', help: 'The value at which the ICT framework treats an engagement as high value.', format: 'money' },
    ],
  },
  {
    title: 'Accreditation',
    fields: [
      {
        key: 'level1RiskMcv',
        label: 'Level 1 agency must set a risk-based maximum contract value above',
        help: 'Above this value a level 1 accredited agency works its maximum contract value out from the risk decision tree.',
        format: 'money',
      },
    ],
  },
  {
    title: 'Local government',
    intro: 'Set by the Local Government Act. Both figures are inclusive of GST.',
    fields: [
      { key: 'councilTenderInclGst', label: 'Council must tender at or above (incl GST)', help: 'The value at which a council must go to tender.', format: 'money' },
      { key: 'councilTenderStaffServices', label: 'Council staff services limb (incl GST)', help: 'The separate tendering threshold for the staff-services limb.', format: 'money' },
    ],
  },
  {
    title: 'Payment terms',
    fields: [
      { key: 'fpSmallBizInvoiceCap', label: 'Faster payment terms apply to invoices up to', help: 'Five-business-day payment terms apply to small business invoices up to this value.', format: 'money' },
      { key: 'sbShorterPayments', label: 'Shorter subcontractor payment terms at or above', help: 'Twenty-day subcontractor payment terms apply at or above this contract value.', format: 'money' },
    ],
  },
];

// Every key this file describes, for spotting the ones it doesn't.
export const DESCRIBED_KEYS = new Set(
  THRESHOLD_GROUPS.flatMap((g) => g.fields.map((f) => f.key)),
);

// "680000" / "$680,000" / "680,000" all mean the same thing to someone typing
// a threshold in, so all three are accepted. Returns null for anything that
// isn't a number, which the caller treats as "leave the default alone".
export function parseAmount(input) {
  const raw = String(input ?? '').replace(/[$,\s]/g, '');
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function formatAmount(value, format) {
  if (value === undefined || value === null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (format === 'percent') return String(n);
  return n.toLocaleString('en-AU');
}
