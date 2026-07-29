import {
  FaScaleBalanced,
  FaUsers,
  FaLocationDot,
  FaShieldHalved,
} from 'react-icons/fa6';

export const STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

// Rule categories. `Icon` is the mark shown top-right on each card.
export const CATEGORIES = [
  { value: 'thresholds', label: 'Thresholds & tender types', Icon: FaScaleBalanced },
  { value: 'panels', label: 'Supplier panels & prequalification', Icon: FaUsers },
  { value: 'local-sme', label: 'Local / SME participation', Icon: FaLocationDot },
  { value: 'probity', label: 'Probity & disclosure', Icon: FaShieldHalved },
];

export const CATEGORY_BY_VALUE = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c]),
);
