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
}
