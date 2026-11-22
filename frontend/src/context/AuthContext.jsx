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

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // After a Google callback, supabase returns an access token. Exchange it for
  // the same local admin session the API uses, then continue to /tasks.
  useEffect(() => {
    if (window.location.hash.startsWith('#access_token=') || window.location.search.startsWith('?access_token=')) {
      const hashToken = window.location.hash.replace(/^#access_token=/, '').split('&')[0] || null;
      const queryToken = window.location.search.replace(/^\?access_token=/, '').split('&')[0] || null;
      const token = hashToken || queryToken;
      if (token) {
        window.history.replaceState({}, '', '/login');
        void api
          .supabaseLogin(token)
          .then((session) => {
            try { window.localStorage.setItem(STORAGE_KEY, session.token); } catch {}
            navigate('/tasks', { replace: true });
            void refresh();
          })
          .catch(() => navigate('/login'));
      }
    }
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
        login,
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
