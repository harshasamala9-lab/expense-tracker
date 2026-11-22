export const CATEGORIES = Object.freeze([
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Other',
]);

export const CATEGORY_META = Object.freeze({
  Food: { color: '#f59e0b', soft: '#fffaeb' },
  Travel: { color: '#2e90fa', soft: '#eff8ff' },
  Shopping: { color: '#7a5af8', soft: '#f4f3ff' },
  Bills: { color: '#f04438', soft: '#fef3f2' },
  Other: { color: '#667085', soft: '#f2f4f7' },
});

export function getCategoryMeta(category) {
  return CATEGORY_META[category] ?? CATEGORY_META.Other;
}
