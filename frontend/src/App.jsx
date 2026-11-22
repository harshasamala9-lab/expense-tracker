import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { useAuth, AdminRoute } from './context/AuthContext.jsx';

function AnalyticsFallback() {
  return (
    <div className="route-fallback" role="status">
      <span className="spinner spinner--dark" aria-hidden="true" />
      <span>Loading analytics…</span>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <Suspense fallback={<AnalyticsFallback />}>
                  <AdminPage />
                </Suspense>
              </AdminRoute>
            }
          />
          <Route
            path="tasks"
            element={
              <AdminRoute>
                <TasksPage />
              </AdminRoute>
            }
          />
          <Route
            path="notifications"
            element={
              <AdminRoute>
                <NotificationsPage />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
