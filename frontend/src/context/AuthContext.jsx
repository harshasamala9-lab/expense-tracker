import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as api from '../services/api.js';
import supabase from '../lib/supabaseClient.js';

const STORAGE_KEY = 'expense-tracker-access-token';
const AuthContext = createContext(null);

function readStoredToken() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function readAccessToken() {
  if (typeof window === 'undefined') return null;

  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const fromQuery = new URLSearchParams(window.location.search);
  const token = fromHash.get('access_token') || fromQuery.get('access_token');

  return token ? token : null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingOAuth, setPendingOAuth] = useState(false);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    const current = readStoredToken();
    setToken(current);
    if (!current) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const session = await api.me();
      setUser(session.user ?? null);
    } catch (error) {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
      setToken('');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // After a Google callback, Supabase returns an access token in the URL hash
  // (or query). Exchange it for the same local admin session the API uses,
  // then clear the URL and continue to the authenticated workspace.
  useEffect(() => {
    const result = readAccessToken();
    if (!result) return;

    setPendingOAuth(true);
    window.history.replaceState({}, '', '/login');
    void api
      .supabaseLogin(result)
      .then((session) => {
        try { window.localStorage.setItem(STORAGE_KEY, session.token); } catch {}
        navigate('/tasks', { replace: true });
        void refresh();
      })
      .catch(() => navigate('/login'))
      .finally(() => setPendingOAuth(false));
  }, [navigate, refresh]);

  const login = useCallback(
    async (email, password) => {
      const session = await api.login(email, password);
      window.localStorage.setItem(STORAGE_KEY, session.token);
      setToken(session.token);
      await refresh();
      return session;
    },
    [refresh],
  );

  const signup = useCallback(
    async (email, password) => {
      const session = await api.signup(email, password);
      window.localStorage.setItem(STORAGE_KEY, session.token);
      setToken(session.token);
      await refresh();
      return session;
    },
    [refresh],
  );

  const loginWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          import.meta.env.VITE_SUPABASE_REDIRECT_URL ||
          `${window.location.origin}/login`,
        skipBrowserRedirect: false,
      },
    });
    if (error) {
      throw error;
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    setToken('');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAdmin: user?.role === 'admin',
        loading,
        pendingOAuth,
        login,
        signup,
        loginWithGoogle,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="route-fallback">Loading…</div>;
  }

  if (!user || user.role !== 'admin') {
    const location = useLocation();
    return (
      <div className="route-fallback">
        <span>This admin area requires an administrator account.</span>
      </div>
    );
  }

  return children;
}
