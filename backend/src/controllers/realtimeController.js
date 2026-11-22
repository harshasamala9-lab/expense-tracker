function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Server-sent events endpoint.
 *
 * The browser authenticates with a Bearer token and reads this stream with a
 * fetch-based reader (EventSource cannot set an Authorization header). The
 * durable state always lives in PostgreSQL; this stream only wakes the UI up.
 */
export function createRealtimeController({ realtimeBus, notificationService }) {
  return {
    stream: async (req, res, next) => {
      let unreadCount;

      try {
        unreadCount = await notificationService.getUnreadCount(req.user.id);
      } catch (error) {
        return next(error);
      }

      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      // Long-lived streams must not be closed by a socket idle timeout.
      req.socket?.setTimeout?.(0);
      req.socket?.setNoDelay?.(true);

      res.write('retry: 5000\n\n');
      sendEvent(res, 'connected', {
        userId: req.user.id,
        unreadCount,
        connectedAt: new Date().toISOString(),
      });

      const unsubscribe = realtimeBus.subscribe((event) => {
        if (event.recipientId && event.recipientId !== req.user.id) {
          return;
        }

        sendEvent(res, event.type, event.data);
      });

      const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
      }, 25_000);
      heartbeat.unref?.();

      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };

      res.on('close', cleanup);
      res.on('error', cleanup);
    },
  };
}
