/**
 * PostgreSQL implementation of the expense repository.
 *
 * Every value supplied by a user is passed through a parameter placeholder
 * ($1, $2, ...). That is what protects the application from SQL injection:
 * PostgreSQL treats the values as data, never as executable SQL.
 */
const COLUMNS = 'id, amount, category, description, expense_date, created_at';

function mapExpense(row) {
  return {
    id: row.id,
    amount: Number(row.amount),
    category: row.category,
    description: row.description,
    expense_date: row.expense_date,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
  };
}

export class PgExpenseRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findAll(category) {
    const params = [];
    let whereClause = '';

    if (category) {
      params.push(category);
      whereClause = 'WHERE category = $1';
    }

    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS}
         FROM expenses
         ${whereClause}
        ORDER BY expense_date DESC, created_at DESC`,
      params,
    );

    return rows.map(mapExpense);
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM expenses WHERE id = $1`,
      [id],
    );

    return rows[0] ? mapExpense(rows[0]) : null;
  }

  async create(expense) {
    const { rows } = await this.pool.query(
      `INSERT INTO expenses (amount, category, description, expense_date)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [
        expense.amount,
        expense.category,
        expense.description,
        expense.expense_date,
      ],
    );

    return mapExpense(rows[0]);
  }

  async update(id, expense) {
    const { rows } = await this.pool.query(
      `UPDATE expenses
          SET amount = $2,
              category = $3,
              description = $4,
              expense_date = $5
        WHERE id = $1
        RETURNING ${COLUMNS}`,
      [
        id,
        expense.amount,
        expense.category,
        expense.description,
        expense.expense_date,
      ],
    );

    return rows[0] ? mapExpense(rows[0]) : null;
  }

  async remove(id) {
    const result = await this.pool.query(
      'DELETE FROM expenses WHERE id = $1',
      [id],
    );

    return result.rowCount > 0;
  }

  async getSummary() {
    const [totalsResult, breakdownResult] = await Promise.all([
      this.pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_spent,
                COUNT(*) AS expense_count
           FROM expenses`,
      ),
      this.pool.query(
        `SELECT category,
                SUM(amount) AS total,
                COUNT(*) AS expense_count
           FROM expenses
          GROUP BY category
          ORDER BY total DESC, category ASC`,
      ),
    ]);

    const totals = totalsResult.rows[0];

    return {
      totalSpent: Number(totals.total_spent),
      expenseCount: Number(totals.expense_count),
      categoryBreakdown: breakdownResult.rows.map((row) => ({
        category: row.category,
        total: Number(row.total),
        count: Number(row.expense_count),
      })),
    };
  }
}
