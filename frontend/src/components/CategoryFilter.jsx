import {
  IconCategoryBills,
  IconCategoryFood,
  IconCategoryOther,
  IconCategoryShopping,
  IconCategoryTravel,
} from './Icons.jsx';
import { CATEGORIES } from '../constants/categories.js';

const FILTERS = ['All', ...CATEGORIES];

const CATEGORY_ICONS = {
  Food: IconCategoryFood,
  Travel: IconCategoryTravel,
  Shopping: IconCategoryShopping,
  Bills: IconCategoryBills,
  Other: IconCategoryOther,
};

export default function CategoryFilter({ value, onChange }) {
  return (
    <div
      className="category-filter"
      role="group"
      aria-label="Filter expenses by category"
    >
      {FILTERS.map((option) => {
        const Icon = option === 'All' ? null : CATEGORY_ICONS[option] ?? IconCategoryOther;

        return (
          <button
            key={option}
            type="button"
            className={`filter-chip${value === option ? ' is-active' : ''}`}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {Icon ? <Icon className="filter-chip-icon" aria-hidden="true" /> : null}
            {option}
          </button>
        );
      })}
    </div>
  );
}
