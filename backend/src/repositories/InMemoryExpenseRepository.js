import { randomUUID } from 'node:crypto';

/**
 * In-memory repository used only by automated tests.
 *
 * It implements the same methods as PgExpenseRepository, so the application
 * can be tested deterministically without touching a real database.
 */
export class InMemoryExpenseRepository {
  constructor(seed = []) {
    this.expenses = seed.map((expense) => ({
      description: null,
      source: 'manual',
      import_run_id: null,
      created_at: new Date().toISOString(),
      ...expense,
    }));
  }

  async findAll(category) {
    return this.expenses
      .filter((expense) => !category || expense.category === category)
      .slice()
      .sort(
        (a, b) =>
          b.expense_date.localeCompare(a.expense_date) ||
          b.created_at.localeCompare(a.created_at),
      )
      .map((expense) => ({ ...expense }));
  }

  async findById(id) {
    const expense = this.expenses.find((item) => item.id === id);
    return expense ? { ...expense } : null;
  }

  async create(expense) {
    const created = {
      id: randomUUID(),
      amount: expense.amount,
      category: expense.category,
      description: expense.description ?? null,
      expense_date: expense.expense_date,
      created_at: new Date().toISOString(),
      source: 'manual',
    };

    this.expenses.push(created);
    return { ...created };
  }

  async update(id, expense) {
    const index = this.expenses.findIndex((item) => item.id === id);

    if (index === -1) {
      return null;
    }

    this.expenses[index] = {
      ...this.expenses[index],
      amount: expense.amount,
      category: expense.category,
      description: expense.description ?? null,
      expense_date: expense.expense_date,
    };

    return { ...this.expenses[index] };
  }

  async remove(id) {
    const index = this.expenses.findIndex((item) => item.id === id);

    if (index === -1) {
      return false;
    }

    this.expenses.splice(index, 1);
    return true;
  }

  async getSummary() {
    const totalSpent = this.expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const byCategory = new Map();
    for (const expense of this.expenses) {
      const current = byCategory.get(expense.category) ?? {
        category: expense.category,
        total: 0,
        count: 0,
      };

      current.total += expense.amount;
      current.count += 1;
      byCategory.set(expense.category, current);
    }

    return {
      totalSpent: Math.round(totalSpent * 100) / 100,
      expenseCount: this.expenses.length,
      categoryBreakdown: [...byCategory.values()]
        .map((item) => ({
          ...item,
          total: Math.round(item.total * 100) / 100,
        }))
        .sort(
          (a, b) =>
            b.total - a.total || a.category.localeCompare(b.category),
        ),
    };
  }

  async findPotentialDuplicates(expense) {
    const normalize = (value) =>
      String(value ?? '')
        .trim()
        .toLowerCase();

    return this.expenses
      .filter(
        (item) =>
          item.id !== expense.id &&
          item.amount === expense.amount &&
          item.category === expense.category &&
          item.expense_date === expense.expense_date &&
          normalize(item.description) === normalize(expense.description),
      )
      .slice(0, 5)
      .map((item) => ({ ...item }));
  }

  async findDuplicatePairsForImportRun(importRunId) {
    const normalize = (value) =>
      String(value ?? '')
        .trim()
        .toLowerCase();

    const runExpenses = this.expenses.filter(
      (expense) => expense.import_run_id === importRunId,
    );
    const pairs = [];

    for (let i = 0; i < runExpenses.length; i += 1) {
      for (let j = i + 1; j < runExpenses.length; j += 1) {
        const first = runExpenses[i];
        const second = runExpenses[j];

        const duplicate =
          first.amount === second.amount &&
          first.category === second.category &&
          first.expense_date === second.expense_date &&
          normalize(first.description) === normalize(second.description);

        if (!duplicate) {
          continue;
        }

        const [primary, other] =
          first.id < second.id ? [first, second] : [second, first];

        pairs.push({
          expense: { ...primary },
          duplicateIds: [other.id],
        });
      }
    }

    return pairs.slice(0, 25);
  }
}
