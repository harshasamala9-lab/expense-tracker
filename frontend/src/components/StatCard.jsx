export default function StatCard({
  label,
  value,
  meta,
  icon: CardIcon,
  featured = false,
  loading = false,
}) {
  return (
    <article className={`stat-card${featured ? ' stat-card--featured' : ''}`}>
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {CardIcon && (
          <span className="stat-icon">
            <CardIcon />
          </span>
        )}
      </div>

      {loading ? (
        <span
          className={`skeleton skeleton-value${
            featured ? ' skeleton--dark' : ''
          }`}
          aria-hidden="true"
        />
      ) : (
        <strong className="stat-value">{value}</strong>
      )}

      {meta && <p className="stat-meta">{meta}</p>}
    </article>
  );
}
