import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../services/api.js';

export function useNotifications({ pageSize = 20 } = {}) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize, total: 0, totalPages: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: 'all' });
  const requestId = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const id = ++requestId.current;
      if (silent) setRefreshing(true); else setLoading(true);
      setError(null);
      try {
        const [list, unread] = await Promise.all([
          api.listNotifications({ ...filters, page: 1, pageSize }),
          api.getNotificationUnreadCount(),
        ]);
        if (id === requestId.current) {
          setItems(list.notifications ?? []);
          setPagination(list.pagination ?? pagination);
          setUnreadCount(unread);
        }
      } catch (err) {
        if (id === requestId.current) setError(err.message);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, pageSize],
  );

  useEffect(() => { void load(); }, [load]);
  const refresh = useCallback(() => load({ silent: true }), [load]);

  const markRead = useCallback(
    async (id) => {
      const result = await api.markNotificationRead(id);
      await refresh();
      return result;
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    await api.markAllNotificationsRead();
    await refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => void refresh(), 120000);
    return () => clearInterval(id);
  }, [refresh]);

  return {
    items, pagination, unreadCount, loading, refreshing, error, filters, setFilters,
    refresh, markRead, markAllRead,
  };
}

export function useSSE(onEvent, onError) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const stream = api.openRealtimeStream(
      ({ type, data }) => {
        setOnline(true);
        onEvent?.(type, data);
      },
      (err) => {
        setOnline(false);
        onError?.(err);
      },
    );

    return () => stream.close();
  }, [onEvent, onError]);

  return online;
}
