// B7 — the Find a Bid Writer directory's vocabulary.

// B7.2 — exactly these four, as specified. Kept in step with
// BID_WRITER_CATEGORIES in be/src/models/BidWriter.js.
export const CATEGORIES = [
  { value: 'goods-and-services', label: 'Goods & Services' },
  { value: 'ict', label: 'ICT' },
  { value: 'construction', label: 'Construction' },
  { value: 'gs-related-to-construction', label: 'G&S Related to Construction' },
];

export const CATEGORY_BY_VALUE = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

// B7.3 — where the company's office is. States and territories only: there is
// no federal office to have one in, which is why this is not the shared
// JURISDICTIONS list (that one leads with FED).
export const STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'SA', label: 'South Australia' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'NT', label: 'Northern Territory' },
  { value: 'ACT', label: 'Australian Capital Territory' },
];

export const STATE_BY_VALUE = Object.fromEntries(STATES.map((s) => [s.value, s]));

export const CATEGORY_OPTIONS = CATEGORIES.map(({ value, label }) => ({ value, label }));
export const STATE_OPTIONS = STATES.map(({ value, label }) => ({ value, label }));

export const TIER_OPTIONS = [
  { value: 'standard', label: 'Standard placement' },
  { value: 'featured', label: 'Featured placement' },
];
