import {
  FaCartShopping,
  FaFileContract,
  FaFileLines,
  FaGavel,
  FaHandshake,
  FaLocationDot,
  FaPeopleGroup,
  FaShieldHalved,
  FaSitemap,
  FaTriangleExclamation,
  FaUsers,
} from 'react-icons/fa6';

// Jurisdictions a rule can belong to, in the order they are shown. `value` is
// what the API stores (and what RULE_STATES in the backend accepts); `label` is
// what the site and the CMS show.
export const JURISDICTIONS = [
  { value: 'FED', label: 'Australian Federal Government' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'NT', label: 'Northern Territory' },
  { value: 'SA', label: 'South Australia' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'NSW', label: 'New South Wales' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'VIC', label: 'Victoria' },
];

export const JURISDICTION_BY_VALUE = Object.fromEntries(
  JURISDICTIONS.map((j) => [j.value, j]),
);

// Rule categories, listed alphabetically. `value` is what the API stores (and
// what RULE_CATEGORIES in the backend accepts); `Icon` is the mark shown
// top-right on each card.
export const CATEGORIES = [
  { value: 'aboriginal-procurement-policy', label: 'Aboriginal Procurement Policy', Icon: FaPeopleGroup },
  { value: 'bidding', label: 'Bidding', Icon: FaHandshake },
  { value: 'complaints', label: 'Complaints', Icon: FaTriangleExclamation },
  { value: 'contracting-frameworks', label: 'Contracting Frameworks', Icon: FaFileContract },
  { value: 'governance', label: 'Governance', Icon: FaSitemap },
  { value: 'local-content-policy', label: 'Local Content Policy', Icon: FaLocationDot },
  { value: 'other-procurement-policy', label: 'Other Procurement Policy', Icon: FaFileLines },
  { value: 'prequalification-panel', label: 'Prequalification / Panel', Icon: FaUsers },
  { value: 'probity', label: 'Probity', Icon: FaShieldHalved },
  { value: 'procurement-legislation', label: 'Procurement Legislation', Icon: FaGavel },
  { value: 'sourcing', label: 'Sourcing', Icon: FaCartShopping },
];

export const CATEGORY_BY_VALUE = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c]),
);
