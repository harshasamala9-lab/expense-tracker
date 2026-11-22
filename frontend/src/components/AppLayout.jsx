import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { IconMenu, IconPlus } from './Icons.jsx';
import ScrollToTop from './ScrollToTop.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth > 900) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', closeOnResize);
    return () => window.removeEventListener('resize', closeOnResize);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) {
      return undefined;
    }

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [sidebarOpen]);

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

          <Link to="/" className="mobile-brand">
            <span className="brand-mark">
              <span className="brand-mark-inner">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="6"
                    width="18"
                    height="13"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle cx="17" cy="14.5" r="1.2" fill="currentColor" />
                </svg>
              </span>
            </span>
            Expense Tracker
          </Link>

          <Link
            to="/expenses"
            className="mobile-add"
            aria-label="Add an expense"
          >
            <IconPlus />
          </Link>
        </header>

        <main id="main-content" className="content">
          <ScrollToTop />
          <Outlet />
        </main>

        <footer className="app-footer">
          <span>Expense Tracker · Personal finance workspace</span>
          <span>React · Express · PostgreSQL</span>
        </footer>
      </div>
    </div>
  );
}
