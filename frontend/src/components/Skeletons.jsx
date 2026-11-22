export function Skeleton({ className = '' }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

export function StatGridSkeleton() {
  return (
    <section className="stat-grid" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="stat-card" key={index}>
          <div className="stat-card-top">
            <Skeleton className="skeleton-label" />
            <Skeleton className="skeleton-icon" />
          </div>
          <Skeleton className="skeleton-value" />
          <Skeleton className="skeleton-text skeleton-meta" />
        </div>
      ))}
    </section>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="table-skeleton" role="status">
      <span className="sr-only">Loading expenses…</span>
      {Array.from({ length: rows }, (_, index) => (
        <div className="table-skeleton-row" key={index}>
          <Skeleton className="skeleton-amount" />
          <Skeleton className="skeleton-badge" />
          <Skeleton className="skeleton-desc" />
          <Skeleton className="skeleton-date" />
          <Skeleton className="skeleton-actions" />
        </div>
      ))}
    </div>
  );
}

export function RecentListSkeleton({ rows = 5 }) {
  return (
    <div className="recent-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="recent-skeleton-row" key={index}>
          <Skeleton className="skeleton-dot" />
          <div className="recent-skeleton-copy">
            <Skeleton className="skeleton-text skeleton-title" />
            <Skeleton className="skeleton-text skeleton-subtitle" />
          </div>
          <Skeleton className="skeleton-amount-sm" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="chart-skeleton" aria-hidden="true">
      <Skeleton className="skeleton-chart" />
    </div>
  );
}
