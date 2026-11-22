function toIso(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function mapRecentExpense(row) {
  return {
    id: row.id,
    amount: Number(row.amount),
    category: row.category,
    description: row.description,
    expense_date: row.expense_date,
    created_at: toIso(row.created_at),
    source: row.source,
  };
}

function mapImportRun(row) {
  return {
    id: row.id,
    source: row.source,
    fileName: row.file_name,
    status: row.status,
    importedCount: Number(row.imported_count),
    skippedCount: Number(row.skipped_count),
    failedCount: Number(row.failed_count),
    totalAmount: Number(row.total_amount),
    errorMessage: row.error_message,
    startedAt: toIso(row.started_at),
    finishedAt: toIso(row.finished_at),
  };
}

/**
 * Read-only SQL used by the protected admin dashboard. Keeping it in its own
 * repository makes the public expense CRUD queries easier to reason about.
 */
export class PgAdminRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async getAnalytics({ days = 30 } = {}) {
    const rangeDays = Math.min(Math.max(Number(days) || 30, 7), 90);

    const [
      totalsResult,
      categoryResult,
      dailyResult,
      monthlyResult,
      sourceResult,
      recentResult,
      topResult,
      importRunsResult,
      automationResult,
    ] = await Promise.all([
      this.pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_spent,
                COUNT(*)::int AS expense_count,
                COALESCE(SUM(amount) FILTER (
                  WHERE expense_date >= date_trunc('month', CURRENT_DATE)
                ), 0) AS this_month_total,
                COALESCE(SUM(amount) FILTER (
                  WHERE expense_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                    AND expense_date < date_trunc('month', CURRENT_DATE)
                ), 0) AS last_month_total,
                COALESCE(SUM(amount) FILTER (
                  WHERE source = 'automation'
                ), 0) AS automated_total
           FROM expenses`,
      ),
      this.pool.query(
        `SELECT category,
                SUM(amount) AS total,
                COUNT(*)::int AS expense_count
           FROM expenses
          GROUP BY category
          ORDER BY total DESC, category ASC`,
      ),
      this.pool.query(
        `WITH days AS (
           SELECT generate_series(
             CURRENT_DATE - ($1::int - 1),
             CURRENT_DATE,
             INTERVAL '1 day'
           )::date AS day
         )
         SELECT TO_CHAR(days.day, 'YYYY-MM-DD') AS day,
                COALESCE(SUM(expenses.amount), 0) AS total,
                COUNT(expenses.id)::int AS expense_count
           FROM days
           LEFT JOIN expenses ON expenses.expense_date = days.day
          GROUP BY days.day
          ORDER BY days.day ASC`,
        [rangeDays],
      ),
      this.pool.query(
        `WITH months AS (
           SELECT generate_series(
             date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
             date_trunc('month', CURRENT_DATE),
             INTERVAL '1 month'
           ) AS month
         )
         SELECT TO_CHAR(months.month, 'YYYY-MM') AS month,
                COALESCE(SUM(expenses.amount), 0) AS total,
                COUNT(expenses.id)::int AS expense_count
           FROM months
           LEFT JOIN expenses
             ON expenses.expense_date >= months.month
            AND expenses.expense_date < months.month + INTERVAL '1 month'
          GROUP BY months.month
          ORDER BY months.month ASC`,
      ),
      this.pool.query(
        `SELECT source,
                SUM(amount) AS total,
                COUNT(*)::int AS expense_count
           FROM expenses
          GROUP BY source
          ORDER BY total DESC, source ASC`,
      ),
      this.pool.query(
        `SELECT id, amount, category, description, expense_date, created_at, source
           FROM expenses
          ORDER BY expense_date DESC, created_at DESC
          LIMIT 8`,
      ),
      this.pool.query(
        `SELECT id, amount, category, description, expense_date, created_at, source
           FROM expenses
          ORDER BY amount DESC, expense_date DESC
          LIMIT 5`,
      ),
      this.pool.query(
        `SELECT id, source, file_name, status, imported_count, skipped_count,
                failed_count, total_amount, error_message, started_at, finished_at
           FROM import_runs
          ORDER BY started_at DESC
          LIMIT 6`,
      ),
      this.pool.query(
        `SELECT COALESCE(SUM(imported_count), 0)::int AS total_imported,
                COALESCE(SUM(imported_count) FILTER (
                  WHERE started_at >= date_trunc('month', CURRENT_DATE)
                ), 0)::int AS imported_this_month,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_runs,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_runs
           FROM import_runs`,
      ),
    ]);

    const totals = totalsResult.rows[0];
    const totalSpent = Number(totals.total_spent);
    const expenseCount = Number(totals.expense_count);
    const thisMonthTotal = Number(totals.this_month_total);
    const lastMonthTotal = Number(totals.last_month_total);
    const automatedTotal = Number(totals.automated_total);

    const importRuns = importRunsResult.rows.map(mapImportRun);
    const automationTotals = automationResult.rows[0];

    return {
      generatedAt: new Date().toISOString(),
      rangeDays,
      totals: {
        totalSpent,
        expenseCount,
        averageExpense: expenseCount > 0 ? totalSpent / expenseCount : 0,
        thisMonthTotal,
        lastMonthTotal,
        monthChangePercent:
          lastMonthTotal > 0
            ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
            : null,
        automatedTotal,
        manualTotal: Math.max(totalSpent - automatedTotal, 0),
      },
      categoryBreakdown: categoryResult.rows.map((row) => ({
        category: row.category,
        total: Number(row.total),
        count: Number(row.expense_count),
      })),
      dailyTrend: dailyResult.rows.map((row) => ({
        date: row.day,
        total: Number(row.total),
        count: Number(row.expense_count),
      })),
      monthlyTrend: monthlyResult.rows.map((row) => ({
        month: row.month,
        total: Number(row.total),
        count: Number(row.expense_count),
      })),
      sources: sourceResult.rows.map((row) => ({
        source: row.source,
        total: Number(row.total),
        count: Number(row.expense_count),
      })),
      recentExpenses: recentResult.rows.map(mapRecentExpense),
      topExpenses: topResult.rows.map(mapRecentExpense),
      importRuns,
      automation: {
        totalImported: Number(automationTotals.total_imported),
        importedThisMonth: Number(automationTotals.imported_this_month),
        completedRuns: Number(automationTotals.completed_runs),
        failedRuns: Number(automationTotals.failed_runs),
        lastImport: importRuns[0] ?? null,
      },
    };
  }
}
