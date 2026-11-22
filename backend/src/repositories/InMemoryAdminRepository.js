function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function dayKey(dateString) {
  return String(dateString).slice(0, 10);
}

/**
 * In-memory analytics repository for API tests. It intentionally computes a
 * smaller but shape-compatible response from the test expense repository.
 */
export class InMemoryAdminRepository {
  constructor(expenseRepository, importRuns = []) {
    this.expenseRepository = expenseRepository;
    this.importRuns = importRuns;
  }

  async getAnalytics() {
    const expenses = this.expenseRepository.expenses ?? [];
    const totalSpent = roundMoney(
      expenses.reduce((sum, expense) => sum + expense.amount, 0),
    );
    const expenseCount = expenses.length;

    const byCategory = new Map();
    const bySource = new Map();
    const byDay = new Map();

    for (const expense of expenses) {
      const category = byCategory.get(expense.category) ?? {
        category: expense.category,
        total: 0,
        count: 0,
      };
      category.total += expense.amount;
      category.count += 1;
      byCategory.set(expense.category, category);

      const sourceName = expense.source ?? 'manual';
      const source = bySource.get(sourceName) ?? {
        source: sourceName,
        total: 0,
        count: 0,
      };
      source.total += expense.amount;
      source.count += 1;
      bySource.set(sourceName, source);

      const key = dayKey(expense.expense_date);
      const day = byDay.get(key) ?? { date: key, total: 0, count: 0 };
      day.total += expense.amount;
      day.count += 1;
      byDay.set(key, day);
    }

    const recentExpenses = [...expenses]
      .sort(
        (a, b) =>
          b.expense_date.localeCompare(a.expense_date) ||
          b.created_at.localeCompare(a.created_at),
      )
      .slice(0, 8);

    const automatedTotal = roundMoney(
      expenses
        .filter((expense) => expense.source === 'automation')
        .reduce((sum, expense) => sum + expense.amount, 0),
    );

    return {
      generatedAt: new Date().toISOString(),
      rangeDays: 30,
      totals: {
        totalSpent,
        expenseCount,
        averageExpense: expenseCount > 0 ? totalSpent / expenseCount : 0,
        thisMonthTotal: totalSpent,
        lastMonthTotal: 0,
        monthChangePercent: null,
        automatedTotal,
        manualTotal: roundMoney(totalSpent - automatedTotal),
      },
      categoryBreakdown: [...byCategory.values()]
        .map((item) => ({ ...item, total: roundMoney(item.total) }))
        .sort(
          (a, b) =>
            b.total - a.total || a.category.localeCompare(b.category),
        ),
      dailyTrend: [...byDay.values()]
        .map((item) => ({ ...item, total: roundMoney(item.total) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      monthlyTrend: [],
      sources: [...bySource.values()]
        .map((item) => ({ ...item, total: roundMoney(item.total) }))
        .sort((a, b) => b.total - a.total),
      recentExpenses: recentExpenses.map((expense) => ({ ...expense })),
      topExpenses: [...expenses]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map((expense) => ({ ...expense })),
      importRuns: this.importRuns,
      automation: {
        totalImported: 0,
        importedThisMonth: 0,
        completedRuns: 0,
        failedRuns: 0,
        lastImport: this.importRuns[0] ?? null,
      },
    };
  }
}
