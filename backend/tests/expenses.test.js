import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { buildTestApp } from './helpers/buildTestApp.js';

const FOOD_ID = '11111111-1111-4111-8111-111111111111';
const TRAVEL_ID = '22222222-2222-4222-8222-222222222222';
const FOOD_ID_2 = '33333333-3333-4333-8333-333333333333';
const MISSING_ID = '44444444-4444-4444-8444-444444444444';

const seed = [
  {
    id: FOOD_ID,
    amount: 250,
    category: 'Food',
    description: 'Lunch',
    expense_date: '2026-11-20',
    created_at: '2026-11-20T09:00:00.000Z',
  },
  {
    id: TRAVEL_ID,
    amount: 1000,
    category: 'Travel',
    description: 'Train tickets',
    expense_date: '2026-11-19',
    created_at: '2026-11-19T09:00:00.000Z',
  },
  {
    id: FOOD_ID_2,
    amount: 100,
    category: 'Food',
    description: 'Coffee',
    expense_date: '2026-11-18',
    created_at: '2026-11-18T09:00:00.000Z',
  },
];

const validPayload = {
  amount: 42.5,
  category: 'Shopping',
  description: 'New shoes',
  expense_date: '2026-11-21',
};

function buildExpenseTestApp(seedData = []) {
  const { app, expenseRepository } = buildTestApp({ seed: seedData });
  return { app, repository: expenseRepository };
}

describe('Expense Tracker API', () => {
  it('creates a valid expense and returns 201', async () => {
    const { app, repository } = buildExpenseTestApp();

    const response = await request(app)
      .post('/api/expenses')
      .send(validPayload);

    assert.equal(response.status, 201);
    assert.match(
      response.body.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    assert.equal(response.body.amount, 42.5);
    assert.equal(response.body.category, 'Shopping');
    assert.equal(response.body.description, 'New shoes');
    assert.equal(response.body.expense_date, '2026-11-21');
    assert.equal(repository.expenses.length, 1);
  });

  it('trims descriptions and stores an omitted description as null', async () => {
    const { app } = buildExpenseTestApp();

    const withSpaces = await request(app)
      .post('/api/expenses')
      .send({ ...validPayload, description: '  With spaces  ' });
    assert.equal(withSpaces.status, 201);
    assert.equal(withSpaces.body.description, 'With spaces');

    const withoutDescription = await request(app)
      .post('/api/expenses')
      .send({ ...validPayload, description: undefined });
    assert.equal(withoutDescription.status, 201);
    assert.equal(withoutDescription.body.description, null);
  });

  it('rejects zero, negative, non-numeric, and over-precise amounts', async () => {
    const { app, repository } = buildExpenseTestApp();

    for (const amount of [0, -5, 'not-a-number', null, 12.345]) {
      const response = await request(app)
        .post('/api/expenses')
        .send({ ...validPayload, amount });

      assert.equal(response.status, 400, `amount ${amount} should be rejected`);
      assert.equal(response.body.message, 'Please correct the highlighted fields.');
      assert.ok(
        response.body.details.some((detail) => detail.field === 'amount'),
        'amount error detail is missing',
      );
    }

    assert.equal(repository.expenses.length, 0);
  });

  it('rejects invalid categories, dates, and non-string descriptions', async () => {
    const { app, repository } = buildExpenseTestApp();

    const invalidCategory = await request(app)
      .post('/api/expenses')
      .send({ ...validPayload, category: 'Groceries' });
    assert.equal(invalidCategory.status, 400);
    assert.ok(
      invalidCategory.body.details.some(
        (detail) => detail.field === 'category',
      ),
    );

    const invalidDate = await request(app)
      .post('/api/expenses')
      .send({ ...validPayload, expense_date: '2026-02-30' });
    assert.equal(invalidDate.status, 400);
    assert.ok(
      invalidDate.body.details.some(
        (detail) => detail.field === 'expense_date',
      ),
    );

    const invalidDescription = await request(app)
      .post('/api/expenses')
      .send({ ...validPayload, description: 123 });
    assert.equal(invalidDescription.status, 400);
    assert.ok(
      invalidDescription.body.details.some(
        (detail) => detail.field === 'description',
      ),
    );

    assert.equal(repository.expenses.length, 0);
  });

  it('returns 404 for a valid UUID that does not exist', async () => {
    const { app } = buildExpenseTestApp();

    const updateResponse = await request(app)
      .put(`/api/expenses/${MISSING_ID}`)
      .send(validPayload);
    assert.equal(updateResponse.status, 404);
    assert.equal(updateResponse.body.message, 'Expense not found.');

    const deleteResponse = await request(app).delete(
      `/api/expenses/${MISSING_ID}`,
    );
    assert.equal(deleteResponse.status, 404);
    assert.equal(deleteResponse.body.message, 'Expense not found.');
  });

  it('returns 400 for an invalid UUID', async () => {
    const { app } = buildExpenseTestApp();

    const updateResponse = await request(app)
      .put('/api/expenses/not-a-uuid')
      .send(validPayload);
    assert.equal(updateResponse.status, 400);

    const deleteResponse = await request(app).delete(
      '/api/expenses/not-a-uuid',
    );
    assert.equal(deleteResponse.status, 400);
  });

  it('lists expenses newest first by expense date', async () => {
    const { app } = buildExpenseTestApp(seed);

    const response = await request(app).get('/api/expenses');

    assert.equal(response.status, 200);
    assert.equal(response.body.count, 3);
    assert.deepEqual(
      response.body.expenses.map((expense) => expense.id),
      [FOOD_ID, TRAVEL_ID, FOOD_ID_2],
    );
  });

  it('filters expenses by category and rejects invalid filters', async () => {
    const { app } = buildExpenseTestApp(seed);

    const filtered = await request(app).get('/api/expenses?category=Food');
    assert.equal(filtered.status, 200);
    assert.equal(filtered.body.count, 2);
    assert.ok(
      filtered.body.expenses.every((expense) => expense.category === 'Food'),
    );

    const invalid = await request(app).get(
      '/api/expenses?category=Groceries',
    );
    assert.equal(invalid.status, 400);
  });

  it('updates an existing expense', async () => {
    const { app, repository } = buildExpenseTestApp(seed);

    const response = await request(app)
      .put(`/api/expenses/${FOOD_ID}`)
      .send({
        amount: 300.25,
        category: 'Bills',
        description: 'Electricity',
        expense_date: '2026-11-22',
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.amount, 300.25);
    assert.equal(response.body.category, 'Bills');
    assert.equal(response.body.description, 'Electricity');

    const stored = await repository.findById(FOOD_ID);
    assert.equal(stored.category, 'Bills');
    assert.equal(stored.expense_date, '2026-11-22');
  });

  it('deletes an expense and returns 204, then 404 on repeat', async () => {
    const { app, repository } = buildExpenseTestApp(seed);

    const response = await request(app).delete(`/api/expenses/${TRAVEL_ID}`);
    assert.equal(response.status, 204);
    assert.equal(response.text, '');
    assert.equal(repository.expenses.length, 2);

    const repeat = await request(app).delete(`/api/expenses/${TRAVEL_ID}`);
    assert.equal(repeat.status, 404);
  });

  it('calculates the summary from stored expenses', async () => {
    const { app } = buildExpenseTestApp(seed);

    const response = await request(app).get('/api/summary');

    assert.equal(response.status, 200);
    assert.equal(response.body.totalSpent, 1350);
    assert.equal(response.body.expenseCount, 3);
    assert.deepEqual(response.body.categoryBreakdown, [
      { category: 'Travel', total: 1000, count: 1 },
      { category: 'Food', total: 350, count: 2 },
    ]);
  });

  it('returns an empty summary when there are no expenses', async () => {
    const { app } = buildExpenseTestApp();

    const response = await request(app).get('/api/summary');

    assert.equal(response.status, 200);
    assert.equal(response.body.totalSpent, 0);
    assert.equal(response.body.expenseCount, 0);
    assert.deepEqual(response.body.categoryBreakdown, []);
  });

  it('rejects malformed JSON with a helpful 400 response', async () => {
    const { app } = buildExpenseTestApp();

    const response = await request(app)
      .post('/api/expenses')
      .set('Content-Type', 'application/json')
      .send('{"amount": 12,');

    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'Request body contains invalid JSON.');
  });

  it('reports health and unknown routes as JSON', async () => {
    const { app } = buildExpenseTestApp();

    const health = await request(app).get('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');

    const missing = await request(app).get('/api/does-not-exist');
    assert.equal(missing.status, 404);
    assert.match(missing.body.message, /Route not found/);
  });

  it('allows configured origins and blocks unknown browser origins', async () => {
    const { app } = buildTestApp({
      frontendUrl: 'https://app.example.com',
    });

    const allowed = await request(app)
      .get('/api/expenses')
      .set('Origin', 'https://app.example.com');
    assert.equal(allowed.status, 200);
    assert.equal(
      allowed.headers['access-control-allow-origin'],
      'https://app.example.com',
    );

    const blocked = await request(app)
      .get('/api/expenses')
      .set('Origin', 'https://evil.example.com');
    assert.equal(blocked.status, 403);
  });
});
