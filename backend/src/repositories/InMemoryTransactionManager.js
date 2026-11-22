/**
 * In-memory transaction boundary for automated tests. Stores that implement
 * snapshot()/restore() are rolled back when a callback throws, which lets the
 * test suite exercise failure paths without PostgreSQL.
 */
export class InMemoryTransactionManager {
  constructor(stores = []) {
    this.stores = stores;
    this.lockHeld = false;
  }

  async run(callback, { advisoryLockKey = null } = {}) {
    if (advisoryLockKey && this.lockHeld) {
      return { skipped: true, reason: 'advisory_lock_not_acquired' };
    }

    this.lockHeld = true;
    const snapshots = this.stores.map((store) => store.snapshot?.());

    try {
      return await callback(null);
    } catch (error) {
      this.stores.forEach((store, index) => {
        store.restore?.(snapshots[index]);
      });
      throw error;
    } finally {
      this.lockHeld = false;
    }
  }
}
