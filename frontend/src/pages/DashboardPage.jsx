import { Link } from 'react-router-dom';
import CategoryBreakdown from '../components/CategoryBreakdown.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RecentExpenses from '../components/RecentExpenses.jsx';
import { dashboardGreeting } from '../utils/greeting.js';
import {
  ChartSkeleton,
  RecentListSkeleton,
  StatGridSkeleton,
} from '../components/Skeletons.jsx';
import StatCard from '../components/StatCard.jsx';
import {
  IconArrowRight,
  IconArrowUpRight,
  IconChartPie,
  IconPlus,
  IconReceipt,
  IconTrendingUp,
  IconWallet,
} from '../components/Icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { formatCurrency, percentage } from '../utils/format.js';

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuth();

  const { summary, recentExpenses, loading, error, refresh } =
    useDashboardData({ recentLimit: 5 });

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
        eyebrow="Overview"
        title="Dashboard"
        description={
          <>
            {initialLoading || !user ? (
              'A clear view of your spending, all in one place.'
            ) : (
              <span>
                {dashboardGreeting(user)} · A clear view of your spending, all
                in one place.
              </span>
            )}
          </>
        }
        actions={
          <Link to="/expenses" className="btn btn-primary">
            <IconPlus />
            Add expense
          </Link>
        }
      />

      {error && !summary ? (
        <section className="card">
          <ErrorState
            title="Could not load your dashboard"
            message={error}
            onRetry={refresh}
          />
        </section>
      ) : (
        <>
          {error && <InlineAlert message={error} onRetry={refresh} />}

          {!initialLoading && summary?.expenseCount === 0 && (
            <section className="welcome-banner">
              <div className="welcome-copy">
                <span className="welcome-icon">
                  <IconWallet />
                </span>
                <div>
                  <h2>Start tracking your spending</h2>
                  <p>
                    Add your first expense to unlock your dashboard and
                    category analytics.
                  </p>
                </div>
              </div>
              <Link to="/expenses" className="btn btn-primary">
                <IconPlus />
                Add your first expense
              </Link>
            </section>
          )}

          {initialLoading ? (
            <StatGridSkeleton />
          ) : (
            <section className="stat-grid" aria-label="Spending summary">
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
                label="Expenses"
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

          <div className="dashboard-grid">
            <section className="card" aria-labelledby="recent-expenses-title">
              <div className="card-header">
                <div>
                  <h2 id="recent-expenses-title">Recent expenses</h2>
                  <p>The latest activity in your workspace.</p>
                </div>
                <Link to="/expenses" className="text-link">
                  View all
                  <IconArrowRight />
                </Link>
              </div>

              {initialLoading ? (
                <RecentListSkeleton />
              ) : (
                <RecentExpenses
                  expenses={recentExpenses}
                  emptyAction={
                    <Link to="/expenses" className="btn btn-secondary btn-sm">
                      Add an expense
                    </Link>
                  }
                />
              )}
            </section>

            <section className="card" aria-labelledby="category-spending-title">
              <div className="card-header">
                <div>
                  <h2 id="category-spending-title">Spending by category</h2>
                  <p>Where your money is going.</p>
                </div>
                <Link to="/admin" className="text-link">
                  Analytics
                  <IconArrowUpRight />
                </Link>
              </div>

              {initialLoading ? (
                <ChartSkeleton />
              ) : summary?.expenseCount > 0 ? (
                <CategoryBreakdown
                  breakdown={summary.categoryBreakdown}
                  totalSpent={summary.totalSpent}
                />
              ) : (
                <EmptyState
                  icon={IconChartPie}
                  title="No spending to analyze"
                  description="Add an expense and the category breakdown will appear here."
                  action={
                    <Link to="/expenses" className="btn btn-secondary btn-sm">
                      Add an expense
                    </Link>
                  }
                />
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
