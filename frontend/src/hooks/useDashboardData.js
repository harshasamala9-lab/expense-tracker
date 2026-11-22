import { useCallback, useEffect, useRef, useState } from 'react';
import { getExpenses, getSummary } from '../services/api.js';

/**
 * Loads the summary and the latest expenses in parallel. Both dashboard pages
 * use this hook so their numbers always come from the backend, never from
 * hardcoded sample data.
 */
export function useDashboardData({ recentLimit = 5 } = {}) {
  const [summary, setSummary] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const id = requestId.current + 1;
      requestId.current = id;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [summaryData, expenses] = await Promise.all([
          getSummary(),
          getExpenses(),
        ]);

        if (id === requestId.current) {
          setSummary(summaryData);
          setRecentExpenses(expenses.slice(0, recentLimit));
        }
      } catch (requestError) {
        if (id === requestId.current) {
          setError(
            requestError.message || 'Could not load dashboard data.',
          );
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [recentLimit],
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load({ silent: true }), [load]);

  return {
    summary,
    recentExpenses,
    loading,
    refreshing,
    error,
    refresh,
  };
}
