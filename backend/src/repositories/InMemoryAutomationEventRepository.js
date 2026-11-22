import { randomUUID } from 'node:crypto';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class InMemoryAutomationEventRepository {
  constructor(seed = [], { now = () => new Date() } = {}) {
    this.now = now;
    this.events = seed.map((event) => ({
      id: event.id ?? randomUUID(),
      event_id: event.event_id,
      event_type: event.event_type,
      source: event.source ?? 'python-automation',
      status: event.status ?? 'pending',
      payload: event.payload ?? {},
      attempts: event.attempts ?? 0,
      last_error: event.last_error ?? null,
      task_id: event.task_id ?? null,
      received_at: event.received_at ?? this.now().toISOString(),
      processed_at: event.processed_at ?? null,
      next_attempt_at:
        event.next_attempt_at ?? event.received_at ?? this.now().toISOString(),
    }));
  }

  snapshot() {
    return clone(this.events);
  }

  restore(snapshot) {
    if (snapshot) {
      this.events = snapshot;
    }
  }

  async enqueue(event) {
    const existing = this.events.find(
      (item) => item.event_id === event.event_id,
    );

    if (existing) {
      return { event: clone(existing), created: false };
    }

    const entry = {
      id: randomUUID(),
      event_id: event.event_id,
      event_type: event.event_type,
      source: event.source ?? 'python-automation',
      status: 'pending',
      payload: clone(event.payload ?? {}),
      attempts: 0,
      last_error: null,
      task_id: null,
      received_at: this.now().toISOString(),
      processed_at: null,
      next_attempt_at: this.now().toISOString(),
    };

    this.events.push(entry);
    return { event: clone(entry), created: true };
  }

  async findByEventId(eventId) {
    const event = this.events.find((item) => item.event_id === eventId);
    return event ? clone(event) : null;
  }

  async listPendingIds(limit = 20, { maxAttempts = 10 } = {}) {
    const now = this.now().getTime();

    return this.events
      .filter(
        (item) =>
          ['pending', 'failed'].includes(item.status) &&
          item.attempts < maxAttempts &&
          new Date(item.next_attempt_at).getTime() <= now,
      )
      .sort((a, b) => a.received_at.localeCompare(b.received_at))
      .slice(0, limit)
      .map((item) => item.event_id);
  }

  async markProcessed(id, taskId) {
    const event = this.events.find((item) => item.id === id);
    if (!event) {
      return null;
    }

    Object.assign(event, {
      status: 'processed',
      task_id: taskId ?? null,
      processed_at: this.now().toISOString(),
      last_error: null,
    });

    return clone(event);
  }

  async markIgnored(id, reason) {
    const event = this.events.find((item) => item.id === id);
    if (!event) {
      return null;
    }

    Object.assign(event, {
      status: 'ignored',
      last_error: reason ?? null,
      processed_at: this.now().toISOString(),
    });

    return clone(event);
  }

  async markFailed(id, errorMessage, nextAttemptAt) {
    const event = this.events.find((item) => item.id === id);
    if (!event) {
      return null;
    }

    Object.assign(event, {
      status: 'failed',
      attempts: event.attempts + 1,
      last_error: errorMessage,
      next_attempt_at: nextAttemptAt,
    });

    return clone(event);
  }

  async countFailed() {
    return this.events.filter((item) => item.status === 'failed').length;
  }
}
