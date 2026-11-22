import { CATEGORIES } from '../constants/categories.js';

const FILTERS = ['All', ...CATEGORIES];

export default function CategoryFilter({ value, onChange }) {
  return (
    <div
      className="category-filter"
      role="group"
      aria-label="Filter expenses by category"
    >
      {FILTERS.map((option) => (
        <button
          key={option}
          type="button"
          className={`filter-chip${value === option ? ' is-active' : ''}`}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
