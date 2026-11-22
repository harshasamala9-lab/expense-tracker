import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import {
  ADMIN_ID,
  TEST_INTERNAL_KEY,
  VIEWER_EMAIL,
  buildTestApp,
  loginAs,
} from './helpers/buildTestApp.js';

async function authed(build) {
  const { app } = build();
  const token = await loginAs(app);
  return { app, token, build };
}

describe('Admin tasks and notifications', () => {
  it('requires an authenticated admin for all task and notification routes', async () => {
    const { app } = buildTestApp();

    for (const path of [
      '/api/admin/tasks',
      '/api/admin/tasks/summary',
      '/api/admin/notifications',
      '/api/admin/notifications/unread-count',
      '/api/admin/realtime',
    ]) {
      const response = await request(app).get(path);
      assert.equal(response.status, 401, path);
    }

    const viewerToken = await loginAs(app, VIEWER_EMAIL);
    const forbidden = await request(app)
      .get('/api/admin/tasks')
      .set('Authorization', `Bearer ${viewerToken}`);
    assert.equal(forbidden.status, 403);
  });

  it('creates a task, notifies admins, and is idempotent by key', async () => {
    const ctx = await authed(buildTestApp);
    const app = ctx.app;
    const token = ctx.token;
    const payload = {
      title: 'Review duplicate expenses',
      description: 'Two matching rows were detected.',
      priority: 'HIGH',
      task_type: 'DUPLICATE_EXPENSE',
      idempotency_key: 'test:duplicate:1',
    };

    const first = await request(app)
      .post('/api/admin/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    assert.equal(first.status, 201);
    assert.equal(first.body.created, true);

    const second = await request(app)
      .post('/api/admin/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    assert.equal(second.status, 201);
    assert.equal(second.body.created, false);
    assert.equal(second.body.task.id, first.body.task.id);

    const list = await request(app)
      .get('/api/admin/tasks')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.tasks.length, 1);

    const notifications = await request(app)
      .get('/api/admin/notifications')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(notifications.status, 200);
    assert.ok(notifications.body.notifications.length >= 1);
    assert.equal(notifications.body.unreadCount, 1);
  });

  it('runs the full task lifecycle independently from notification read state', async () => {
    const ctx = await authed(buildTestApp);
    const app = ctx.app;
    const token = ctx.token;
    const created = await request(app)
      .post('/api/admin/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lifecycle task', task_type: 'GENERAL' });
    assert.equal(created.status, 201);
    const id = created.body.task.id;

    const start = await request(app)
      .post(`/api/admin/tasks/${id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .send({ note: 'Working' });
    assert.equal(start.status, 200);
    assert.equal(start.body.task.status, 'IN_PROGRESS');

    const complete = await request(app)
      .post(`/api/admin/tasks/${id}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ note: 'Done' });
    assert.equal(complete.status, 200);
    assert.equal(complete.body.task.status, 'COMPLETED');

    const inbox = await request(app)
      .get('/api/admin/notifications')
      .set('Authorization', `Bearer ${token}`);
    assert.ok(inbox.body.notifications.length >= 1);

    const notificationId = inbox.body.notifications[0].id;
    const read = await request(app)
      .post(`/api/admin/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    const beforeUnread = inbox.body.unreadCount;
    assert.equal(read.status, 200);
    assert.ok(read.body.notification.read_at);
    assert.equal(read.body.unreadCount, beforeUnread - 1);

    const detail = await request(app)
      .get(`/api/admin/tasks/${id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(detail.status, 200);
    assert.ok(detail.body.activities.some((a) => a.action === 'COMPLETED'));
    assert.equal(detail.body.task.status, 'COMPLETED');
  });

  it('rejects invalid filters and task payloads', async () => {
    const ctx = await authed(buildTestApp);
    const app = ctx.app;
    const token = ctx.token;

    const badFilter = await request(app)
      .get('/api/admin/tasks?status=NOT_A_STATUS')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(badFilter.status, 400);

    const badCreate = await request(app)
      .post('/api/admin/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'x' });
    assert.equal(badCreate.status, 400);
  });
});

describe('Internal automation events', () => {
  it('requires the shared internal key', async () => {
    const { app } = buildTestApp();
    const noKey = await request(app)
      .post('/api/internal/automation/events')
      .send({});
    assert.equal(noKey.status, 401);
  });

  it('turns an import failure event into one task, idempotently', async () => {
    const ctx = await authed(buildTestApp);
    const app = ctx.app;
    const token = ctx.token;
    const event = {
      eventId: 'import-failed-1',
      eventType: 'IMPORT_FAILED',
      source: 'python-automation',
      occurredAt: new Date().toISOString(),
      payload: {
        runId: 'run-1',
        fileName: 'bad.csv',
        failedCount: 2,
        errorSummary: 'Bad header row',
      },
    };

    const first = await request(app)
      .post('/api/internal/automation/events')
      .set('x-automation-key', TEST_INTERNAL_KEY)
      .send(event);
    assert.equal(first.status, 202);
    assert.equal(first.body.processed, true);
    assert.equal(first.body.taskIds.length, 1);

    const duplicate = await request(app)
      .post('/api/internal/automation/events')
      .set('x-automation-key', TEST_INTERNAL_KEY)
      .send(event);
    assert.equal(duplicate.status, 202);
    assert.equal(duplicate.body.duplicate, true);

    const list = await request(app)
      .get('/api/admin/tasks?task_type=IMPORT_FAILURE')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.tasks.length, 1);
    assert.equal(list.body.tasks[0].priority, 'HIGH');
  });

  it('does not create a task for benign diagnostic events', async () => {
    const ctx = await authed(buildTestApp);
    const app = ctx.app;
    const token = ctx.token;
    const response = await request(app)
      .post('/api/internal/automation/events')
      .set('x-automation-key', TEST_INTERNAL_KEY)
      .send({
        eventId: 'import-started-1',
        eventType: 'IMPORT_STARTED',
        payload: { runId: 'run-2', fileName: 'ok.csv' },
      });
    assert.equal(response.status, 202);

    const list = await request(app)
      .get('/api/admin/tasks')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(list.body.tasks.length, 0);
  });
});

describe('Duplicate expense detection', () => {
  it('creates a review task and never deletes an expense', async () => {
    const { app, token, expenseRepository } = buildTestApp({
      seed: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          amount: 250,
          category: 'Food',
          description: 'Lunch',
          expense_date: '2026-11-20',
          source: 'manual',
        },
      ],
    });
    const auth = await loginAs(app);

    const created = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${auth}`)
      .send({
        amount: 250,
        category: 'Food',
        description: 'Lunch',
        expense_date: '2026-11-20',
      });
    assert.equal(created.status, 201);

    const list = await request(app)
      .get('/api/admin/tasks?task_type=DUPLICATE_EXPENSE')
      .set('Authorization', `Bearer ${auth}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.tasks.length, 1);

    const expenses = await expenseRepository.findAll();
    assert.equal(expenses.length, 2);
  });
});

describe('Reminders', () => {
  it('sends a due reminder once per window and keeps it DB-backed', async () => {
    const { app, token, taskRepository, reminderService, notificationRepository } = buildTestApp();
    const overdue = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await taskRepository.create({
      title: 'Overdue task',
      description: 'Needs attention',
      task_type: 'GENERAL',
      priority: 'CRITICAL',
      status: 'PENDING',
      idempotency_key: 'reminder:task:1',
      due_at: overdue,
    });

    const first = await reminderService.run();
    assert.equal(first.overdue, 1);
    const second = await reminderService.run();
    assert.equal(second.overdue, 0);

    const unread = await notificationRepository.countUnread(ADMIN_ID);
    assert.equal(unread, 1);
  });
});
