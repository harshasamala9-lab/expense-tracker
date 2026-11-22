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

function readGoogleCode() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) return null;
  const expected = window.sessionStorage?.getItem('google-oauth-state');
  return { code, state, expected };
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

  // Google redirects back to /login?code=...&state=... Exchange the code for
  // the local admin session and clear the query string.
  useEffect(() => {
    const result = readGoogleCode();
    if (!result || result.state !== result.expected) return;

    setPendingOAuth(true);
    window.history.replaceState({}, '', '/login');
    void api
      .googleLogin(result.code, `${window.location.origin}`)
      .then((session) => {
        try { window.localStorage.setItem(STORAGE_KEY, session.token); } catch {}
        navigate('/tasks', { replace: true });
        void refresh();
      })
      .catch(() => navigate('/login?error=google'))
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

  const sendEmailCode = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}`,
      },
    });

    if (error) {
      throw error;
    }
  }, []);

  const supabaseEmailLogin = useCallback(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }

      const session = await api.supabaseLogin(data.session.access_token);
      window.localStorage.setItem(STORAGE_KEY, session.token);
      setToken(session.token);
      await refresh();
      return session;
    },
    [refresh],
  );

  const loginWithGoogle = useCallback(async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('Google client ID is not configured.');
    }

    const state = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try { window.sessionStorage.setItem('google-oauth-state', state); } catch {}

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });

    window.location.assign(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
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
        sendEmailCode,
        supabaseEmailLogin,
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
