import { EventEmitter } from 'node:events';

/**
 * In-process realtime fan-out. SSE clients subscribe with their admin ID;
 * events marked for all admins (no recipientId) are delivered to every
 * connected administrator. Durable state always remains in PostgreSQL.
 */
export function createRealtimeBus() {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);

  return {
    publish(event) {
      emitter.emit('event', {
        ...event,
        publishedAt: new Date().toISOString(),
      });
    },

    subscribe(listener) {
      emitter.on('event', listener);
      return () => emitter.off('event', listener);
    },
  };
}
