import { AppError } from '../utils/AppError.js';

/**
 * Business logic for expenses. Controllers deal with HTTP; this layer deals
 * with rules and repository calls; the repository deals with storage.
 */
export class ExpenseService {
  constructor(repository) {
    this.repository = repository;
  }

  list(category) {
    return this.repository.findAll(category);
  }

  create(expense) {
    return this.repository.create(expense);
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
