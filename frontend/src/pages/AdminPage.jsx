import { Link } from 'react-router-dom';
import CategoryPieChart from '../components/charts/CategoryPieChart.jsx';
import SpendingBarChart from '../components/charts/SpendingBarChart.jsx';
import CategorySummary from '../components/CategorySummary.jsx';
import ErrorState from '../components/ErrorState.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RecentExpenses from '../components/RecentExpenses.jsx';
import {
  ChartSkeleton,
  RecentListSkeleton,
  StatGridSkeleton,
} from '../components/Skeletons.jsx';
import StatCard from '../components/StatCard.jsx';
import {
  IconArrowRight,
  IconChartPie,
  IconInfo,
  IconReceipt,
  IconRefresh,
  IconTrendingUp,
  IconWallet,
} from '../components/Icons.jsx';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { formatCurrency, percentage } from '../utils/format.js';

export default function AdminPage() {
  usePageTitle('Admin analytics');

  const { summary, recentExpenses, loading, refreshing, error, refresh } =
    useDashboardData({ recentLimit: 6 });

  const topCategory = summary?.categoryBreakdown?.[0] ?? null;
  const averageExpense =
    summary?.expenseCount > 0
      ? summary.totalSpent / summary.expenseCount
      : 0;
  const topShare =
    topCategory && summary?.totalSpent
      ? percentage(topCategory.total, summary.totalSpent)
      : 0;
  const initialLoading = loading && !summary;

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Admin analytics"
        description="A deeper look at category performance and recent activity."
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={refresh}
            disabled={loading || refreshing}
          >
            <IconRefresh className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh data'}
          </button>
        }
      />

      <div className="admin-note">
        <IconInfo />
        <span>
          <strong>Scope note:</strong> this analytics page is intentionally
          public, as specified in the project brief. It is not an
          authenticated admin area.
        </span>
      </div>

      {error && !summary ? (
        <section className="card">
          <ErrorState
            title="Could not load analytics"
            message={error}
            onRetry={refresh}
          />
        </section>
      ) : (
        <>
          {error && <InlineAlert message={error} onRetry={refresh} />}

          {initialLoading ? (
            <StatGridSkeleton />
          ) : (
            <section className="stat-grid" aria-label="Analytics summary">
              <StatCard
                featured
                label="Total spent"
                value={formatCurrency(summary?.totalSpent ?? 0)}
                meta={`Across ${summary?.expenseCount ?? 0} recorded ${
                  summary?.expenseCount === 1 ? 'expense' : 'expenses'
                }`}
                icon={IconWallet}
              />
              <StatCard
                label="Total expenses"
                value={summary?.expenseCount ?? 0}
                meta="All time"
                icon={IconReceipt}
              />
              <StatCard
                label="Average expense"
                value={formatCurrency(averageExpense)}
                meta="Per recorded expense"
                icon={IconTrendingUp}
              />
              <StatCard
                label="Top category"
                value={topCategory?.category ?? '—'}
                meta={
                  topCategory
                    ? `${formatCurrency(topCategory.total)} · ${topShare}% of spending`
                    : 'No expenses yet'
                }
                icon={IconChartPie}
              />
            </section>
          )}

          <div className="charts-grid">
            <section className="card" aria-labelledby="bar-chart-title">
              <div className="card-header">
                <div>
                  <h2 id="bar-chart-title">Spending by category</h2>
                  <p>Totals calculated by the summary endpoint.</p>
                </div>
              </div>

              {initialLoading ? (
                <ChartSkeleton />
              ) : summary?.expenseCount > 0 ? (
                <SpendingBarChart breakdown={summary.categoryBreakdown} />
              ) : (
                <div className="chart-empty">
                  <IconChartPie />
                  <p>No spending data yet.</p>
                  <Link to="/expenses" className="text-link">
                    Add an expense
                    <IconArrowRight />
                  </Link>
                </div>
              )}
            </section>

            <section className="card" aria-labelledby="pie-chart-title">
              <div className="card-header">
                <div>
                  <h2 id="pie-chart-title">Category share</h2>
                  <p>How each category contributes to the total.</p>
                </div>
              </div>

              {initialLoading ? (
                <ChartSkeleton />
              ) : (
                <CategoryPieChart
                  breakdown={summary?.categoryBreakdown ?? []}
                />
              )}
            </section>
          </div>

          <section aria-labelledby="category-summary-title">
            <div className="section-heading">
              <div>
                <h2 id="category-summary-title">Category breakdown</h2>
                <p>Totals and share of overall spending.</p>
              </div>
            </div>

            {initialLoading ? (
              <ChartSkeleton />
            ) : (
              <CategorySummary
                breakdown={summary?.categoryBreakdown ?? []}
                totalSpent={summary?.totalSpent ?? 0}
              />
            )}
          </section>

          <section className="card" aria-labelledby="admin-recent-title">
            <div className="card-header">
              <div>
                <h2 id="admin-recent-title">Recent expenses</h2>
                <p>The newest records in the database.</p>
              </div>
              <Link to="/expenses" className="text-link">
                Manage expenses
                <IconArrowRight />
              </Link>
            </div>

            {initialLoading ? (
              <RecentListSkeleton rows={6} />
            ) : (
              <RecentExpenses expenses={recentExpenses} limit={6} />
            )}
          </section>
        </>
      )}
    </>
  );
}
