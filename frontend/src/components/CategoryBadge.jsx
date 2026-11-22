import { getCategoryMeta } from '../constants/categories.js';

export default function CategoryBadge({ category }) {
  const meta = getCategoryMeta(category);

  return (
    <span
      className="category-badge"
      style={{
        '--badge-color': meta.color,
        '--badge-bg': meta.soft,
      }}
    >
      <span className="category-dot" aria-hidden="true" />
      {category}
    </span>
  );
}
