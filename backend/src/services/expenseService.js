import { AppError } from '../utils/AppError.js';

/**
 * Business logic for expenses. Controllers deal with HTTP; this layer deals
 * with rules and repository calls; the repository deals with storage.
 */
export class ExpenseService {
  constructor(repository, { onExpenseCreated = null, logger = console } = {}) {
    this.repository = repository;
    this.onExpenseCreated = onExpenseCreated;
    this.logger = logger;
  }

  list(category) {
    return this.repository.findAll(category);
  }

  async create(expense) {
    const created = await this.repository.create(expense);

    if (this.onExpenseCreated) {
      try {
        await this.onExpenseCreated(created);
      } catch (error) {
        // An expense is never rolled back because a follow-up task could not
        // be created. The error is logged so it can be retried by operations.
        this.logger.error(
          '[expenses] Could not run post-create task detection:',
          error.message,
        );
      }
    }

    return created;
  }

  async update(id, expense) {
    const updated = await this.repository.update(id, expense);

    if (!updated) {
      throw new AppError(404, 'Expense not found.');
    }

    return updated;
  }

  async remove(id) {
    const removed = await this.repository.remove(id);

    if (!removed) {
      throw new AppError(404, 'Expense not found.');
    }
  }

  getSummary() {
    return this.repository.getSummary();
  }
}
