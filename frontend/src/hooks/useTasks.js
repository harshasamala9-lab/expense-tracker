import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../services/api.js';

function mergeFilters(a, b) {
  const merged = { ...a };
  for (const [key, value] of Object.entries(b ?? {})) {
    if (value !== undefined && value !== null) {
      merged[key] = value;
    }
  }
  return merged;
}

export function useTasks({ pageSize = 20 } = {}) {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const requestId = useRef(0);
  const refreshTimer = useRef(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const id = ++requestId.current;
      if (silent) setRefreshing(true); else setLoading(true);
      setError(null);
      try {
        const [list, summaryData] = await Promise.all([
          api.listTasks({ ...filters, page: 1, pageSize }),
          api.getTaskSummary(),
        ]);
        if (id === requestId.current) {
          setTasks(list.tasks ?? []);
          setPagination(list.pagination ?? pagination);
          setSummary(summaryData ?? null);
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
  const setFilter = useCallback((patch) => setFilters((current) => mergeFilters(current, patch)), []);
  const act = useCallback(
    async (fn) => {
      setRefreshing(true);
      try {
        const result = await fn();
        await refresh();
        return result;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setRefreshing(false);
      }
    },
    [refresh],
  );

  useEffect(() => {
    const id = setInterval(() => void refresh(), 120000);
    return () => clearInterval(id);
  }, [refresh]);

  return { tasks, pagination, summary, loading, refreshing, error, filters, setFilter, refresh, act };
}
