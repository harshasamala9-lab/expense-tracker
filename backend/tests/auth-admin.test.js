import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { AutomationClient } from '../src/services/automationClient.js';
import {
  ADMIN_EMAIL,
  ADMIN_ID,
  TEST_PASSWORD,
  VIEWER_EMAIL,
  buildTestApp,
  loginAs,
} from './helpers/buildTestApp.js';

const seed = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    amount: 250,
    category: 'Food',
    description: 'Team lunch',
    expense_date: '2026-11-20',
    created_at: '2026-11-20T09:00:00.000Z',
    source: 'manual',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    amount: 1000,
    category: 'Travel',
    description: 'Train tickets',
    expense_date: '2026-11-19',
    created_at: '2026-11-19T09:00:00.000Z',
    source: 'automation',
  },
];

describe('Authentication and admin RBAC', () => {
  it('signs in a valid admin and returns a token and user', async () => {
    const { app } = buildTestApp();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD });

    assert.equal(response.status, 200);
    assert.equal(typeof response.body.token, 'string');
    assert.equal(response.body.user.email, ADMIN_EMAIL);
    assert.equal(response.body.user.role, 'admin');
    assert.equal(response.body.user.id, ADMIN_ID);
    assert.equal(response.body.user.password_hash, undefined);
  });

  it('rejects an incorrect password and a malformed login body', async () => {
    const { app } = buildTestApp();

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'wrong-password' });
    assert.equal(wrongPassword.status, 401);
    assert.equal(wrongPassword.body.message, 'Invalid email or password.');

    const invalidBody = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email' });
    assert.equal(invalidBody.status, 400);
    assert.ok(
      invalidBody.body.details.some((detail) => detail.field === 'email'),
    );
    assert.ok(
      invalidBody.body.details.some((detail) => detail.field === 'password'),
    );
  });

  it('returns the current user for a valid token', async () => {
    const { app } = buildTestApp();
    const token = await loginAs(app);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, ADMIN_EMAIL);
    assert.equal(response.body.user.role, 'admin');
  });

  it('rejects missing, malformed, and tampered tokens', async () => {
    const { app } = buildTestApp();
    const token = await loginAs(app);

    const missing = await request(app).get('/api/auth/me');
    assert.equal(missing.status, 401);

    const malformed = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Token not-a-bearer');
    assert.equal(malformed.status, 401);

    const tampered = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token.slice(0, -2)}xx`);
    assert.equal(tampered.status, 401);
  });

  it('protects admin analytics with authentication and the admin role', async () => {
    const { app } = buildTestApp({ seed });

    const anonymous = await request(app).get('/api/admin/analytics');
    assert.equal(anonymous.status, 401);

    const viewerToken = await loginAs(app, VIEWER_EMAIL);
    const forbidden = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${viewerToken}`);
    assert.equal(forbidden.status, 403);

    const adminToken = await loginAs(app);
    const allowed = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.totals.totalSpent, 1250);
    assert.equal(allowed.body.totals.expenseCount, 2);
    assert.equal(allowed.body.totals.automatedTotal, 1000);
    assert.equal(allowed.body.categoryBreakdown.length, 2);
  });

  it('reports an unconfigured automation service without failing analytics', async () => {
    const { app } = buildTestApp({ seed });
    const token = await loginAs(app);

    const status = await request(app)
      .get('/api/admin/automation/status')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(status.status, 200);
    assert.equal(status.body.configured, false);
    assert.equal(status.body.reachable, false);

    const importResponse = await request(app)
      .post('/api/admin/automation/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('date,description,amount\n'), 'empty.csv');

    assert.equal(importResponse.status, 503);
  });

  it('forwards an authenticated CSV upload to the Python service', async () => {
    const calls = [];
    const automationClient = new AutomationClient({
      baseUrl: 'http://automation.test',
      apiKey: 'test-automation-key',
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(
          JSON.stringify({
            status: 'completed',
            importedCount: 1,
            skippedCount: 0,
            failedCount: 0,
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      },
    });

    const { app } = buildTestApp({ automationClient });
    const token = await loginAs(app);

    const response = await request(app)
      .post('/api/admin/automation/import')
      .set('Authorization', `Bearer ${token}`)
      .attach(
        'file',
        Buffer.from(
          'date,description,amount,transaction_id\n2026-11-20,Coffee,4.50,txn-1\n',
        ),
        { filename: 'expenses.csv', contentType: 'text/csv' },
      );

    assert.equal(response.status, 201);
    assert.equal(response.body.importedCount, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'http://automation.test/import');
    assert.equal(
      calls[0].options.headers['X-Automation-Key'],
      'test-automation-key',
    );
  });
});
