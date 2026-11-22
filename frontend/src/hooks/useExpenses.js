import { useCallback, useEffect, useRef, useState } from 'react';
import { getExpenses } from '../services/api.js';

/**
 * Loads expenses for the selected category. The backend does the filtering,
 * which also exercises the optional ?category= API parameter.
 */
export function useExpenses(category) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const id = requestId.current + 1;
      requestId.current = id;

      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await getExpenses(category);
        if (id === requestId.current) {
          setExpenses(data);
        }
      } catch (requestError) {
        if (id === requestId.current) {
          setError(
            requestError.message || 'Could not load expenses right now.',
          );
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false);
        }
      }
    },
    [category],
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load({ silent: true }), [load]);

  return { expenses, loading, error, refresh };
}
