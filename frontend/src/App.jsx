import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Recharts is only needed on the analytics page. Lazy loading keeps the main
// dashboard bundle small for visitors who never open /admin.
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));

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
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route
            path="admin"
            element={
              <Suspense fallback={<AnalyticsFallback />}>
                <AdminPage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
