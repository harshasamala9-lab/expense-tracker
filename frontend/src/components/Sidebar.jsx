import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  IconBell,
  IconChartPie,
  IconDashboard,
  IconLogo,
  IconLogout,
  IconReceipt,
  IconTasks,
  IconWallet,
  IconX,
} from './Icons.jsx';

const workspaceLinks = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/expenses', label: 'Expenses', icon: IconReceipt },
  { to: '/tasks', label: 'Tasks', icon: IconTasks },
  { to: '/notifications', label: 'Notifications', icon: IconBell },
];

const insightLinks = [
  { to: '/admin', label: 'Admin analytics', icon: IconChartPie },
];

function NavigationLink({ link, onNavigate }) {
  const LinkIcon = link.icon;

  return (
    <NavLink
      to={link.to}
      end={link.end}
      className={({ isActive }) =>
        `nav-link${isActive ? ' is-active' : ''}`
      }
      onClick={onNavigate}
    >
      <LinkIcon />
      <span>{link.label}</span>
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();

  return (
    <aside
      className={`sidebar${open ? ' sidebar--open' : ''}`}
      aria-label="Main navigation"
    >
      <div className="sidebar-brand">
        <Link to="/" className="brand" onClick={onClose}>
          <span className="brand-mark">
            <IconLogo />
          </span>
          <span>
            <span className="brand-name">Expense Tracker</span>
            <span className="brand-sub">Finance workspace</span>
          </span>
        </Link>

        <button
          type="button"
          className="sidebar-close"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <IconX />
        </button>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-section-label">Workspace</p>
        {workspaceLinks.map((link) => (
          <NavigationLink key={link.to} link={link} onNavigate={onClose} />
        ))}

        <p className="nav-section-label">Insights</p>
        {insightLinks.map((link) => (
          <NavigationLink key={link.to} link={link} onNavigate={onClose} />
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-card">
        <span className="sidebar-card-icon">
          <IconWallet />
        </span>
        <p className="sidebar-card-title">Cloud-backed records</p>
        <p className="sidebar-card-text">
          Expenses are saved through the API to PostgreSQL — not in your
          browser.
        </p>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-top">
          <span className="sidebar-footer-version">Expense Tracker v1.0</span>
          <button
            type="button"
            className="sidebar-signout"
            aria-label="Sign out"
            title="Sign out"
            onClick={logout}
          >
            <IconLogout />
          </button>
        </div>
        <span className="sidebar-footer-email">{user?.email ?? ''}</span>
      </div>
    </aside>
  );
}
