import { getCategoryMeta } from '../constants/categories.js';
import {
  IconCategoryBills,
  IconCategoryFood,
  IconCategoryOther,
  IconCategoryShopping,
  IconCategoryTravel,
} from './Icons.jsx';

const CATEGORY_ICONS = {
  Food: IconCategoryFood,
  Travel: IconCategoryTravel,
  Shopping: IconCategoryShopping,
  Bills: IconCategoryBills,
  Other: IconCategoryOther,
};

export default function CategoryBadge({ category }) {
  const meta = getCategoryMeta(category);
  const Icon = CATEGORY_ICONS[category] ?? IconCategoryOther;

  return (
    <span
      className="category-badge"
      style={{
        '--badge-color': meta.color,
        '--badge-bg': meta.soft,
      }}
    >
      <Icon className="category-badge-icon" aria-hidden="true" />
      <span className="category-dot" aria-hidden="true" />
      {category}
    </span>
  );
}
