import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IconMenu, IconPlus, IconLogout } from './Icons.jsx';
import ScrollToTop from './ScrollToTop.jsx';
import Sidebar from './Sidebar.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [loading, user, navigate]);

  if (!loading && !user) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="main-column">
        <header className="mobile-topbar">
          <button
            type="button"
            className="icon-button"
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <IconMenu />
          </button>

          <Link to="/" className="mobile-brand" onClick={() => setSidebarOpen(false)}>
            <span className="brand-mark">
              <span className="brand-mark-inner">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                  <rect x="3" y="6" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="17" cy="14.5" r="1.25" fill="currentColor" />
                </svg>
              </span>
            </span>
            Expense Tracker
          </Link>

          <Link to="/expenses" className="mobile-add" aria-label="Add an expense">
            <IconPlus />
          </Link>

          <button
            type="button"
            className="icon-button"
            aria-label="Sign out"
            onClick={logout}
            title="Sign out"
          >
            <IconLogout />
          </button>
        </header>

        <main id="main-content" className="content">
          <ScrollToTop />
          <Outlet />
        </main>

        <footer className="app-footer">
          <span>Expense Tracker · Personal finance workspace</span>
          <button type="button" className="footer-logout" onClick={logout} aria-label="Sign out">
            Sign out
          </button>
        </footer>
      </div>
    </div>
  );
}
