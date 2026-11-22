/**
 * Live end-to-end smoke test against a running API and real database.
 *
 * Usage:
 *   npm run dev            # in one terminal
 *   npm run smoke          # in another terminal
 *
 * It creates a temporary expense, verifies it through every endpoint, then
 * deletes it. The cleanup runs even when an assertion fails.
 */
import { config } from '../src/config/env.js';

const API_URL = (
  process.env.API_URL || `http://localhost:${config.port}/api`
).replace(/\/$/, '');

const today = new Date().toISOString().slice(0, 10);
let createdId = null;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function call(method, path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  if (response.status !== 204) {
    data = await response.json().catch(() => null);
  }

  return { status: response.status, data };
}

function pass(message) {
  console.log(`PASS  ${message}`);
}

try {
  const health = await call('GET', '/health');
  assert(health.status === 200, `Health check returned ${health.status}`);
  pass('API health check');

  const created = await call('POST', '/expenses', {
    amount: 12.34,
    category: 'Other',
    description: `Smoke test ${new Date().toISOString()}`,
    expense_date: today,
  });
  assert(created.status === 201, `Create returned ${created.status}`);
  assert(created.data?.id, 'Create response did not include an id');
  createdId = created.data.id;
  pass('POST /expenses creates a record');

  const list = await call('GET', '/expenses');
  assert(list.status === 200, `List returned ${list.status}`);
  assert(
    list.data.expenses.some((expense) => expense.id === createdId),
    'Created record is missing from GET /expenses',
  );
  pass('GET /expenses returns the new record');

  const updated = await call('PUT', `/expenses/${createdId}`, {
    amount: 99.99,
    category: 'Bills',
    description: 'Updated by smoke test',
    expense_date: today,
  });
  assert(updated.status === 200, `Update returned ${updated.status}`);
  assert(updated.data.amount === 99.99, 'Updated amount is incorrect');
  pass('PUT /expenses/:id updates the record');

  const summary = await call('GET', '/summary');
  assert(summary.status === 200, `Summary returned ${summary.status}`);
  assert(
    summary.data.expenseCount >= 1,
    'Summary expense count should include the smoke-test record',
  );
  pass('GET /summary calculates totals');

  const removed = await call('DELETE', `/expenses/${createdId}`);
  assert(removed.status === 204, `Delete returned ${removed.status}`);
  createdId = null;
  pass('DELETE /expenses/:id removes the record');

  const missing = await call(
    'DELETE',
    '/expenses/00000000-0000-4000-8000-000000000000',
  );
  assert(missing.status === 404, `Missing delete returned ${missing.status}`);
  pass('DELETE for a missing record returns 404');

  console.log('\nSmoke test completed successfully.');
} catch (error) {
  console.error('\nSmoke test failed:', error.message);
  process.exitCode = 1;
} finally {
  if (createdId) {
    try {
      await call('DELETE', `/expenses/${createdId}`);
      console.log('Cleanup: temporary record deleted.');
    } catch {
      console.error('Cleanup failed: delete the smoke-test record manually.');
    }
  }
}
