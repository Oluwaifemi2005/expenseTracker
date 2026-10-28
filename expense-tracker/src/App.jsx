import React, { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import useAuth from './context/useAuth'
import Layout from './Layout'
import DashboardView from './pages/DashboardView'
import TransactionsView from './pages/TransactionsView'
import BudgetsView from './pages/BudgetsView'
import GoalsView from './pages/GoalsView'
import RecurringView from './pages/RecurringView'
import AnalyticsView from './pages/AnalyticsView'
import ReportsView from './pages/ReportsView'
import SettingsView from './pages/SettingsView'
import AuthScreen from './pages/AuthScreen'
import LandingPage from './pages/LandingPage'

function AppContent() {
  const { isAuthenticated, loading, sessionExpiredMessage } = useAuth();
  const navigate = useNavigate();
  const prevAuthRef = useRef(isAuthenticated);

  // Handle transition from authenticated -> unauthenticated (logout vs session expiry)
  useEffect(() => {
    if (prevAuthRef.current && !isAuthenticated) {
      if (sessionExpiredMessage) {
        navigate('/login', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, sessionExpiredMessage, navigate]);

  // 1. Session verification pending: Never expose protected financial data
  if (loading) {
    return (
      <div className="auth-loading-screen" role="status" aria-live="polite">
        <div className="auth-loading-card">
          <div className="brand-icon loading-brand-icon">V</div>
          <div className="auth-loading-spinner" aria-hidden="true" />
          <p className="auth-loading-text">Verifying secure session...</p>
          <span className="auth-loading-subtext">Connecting to your private vault</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated visitors: Public landing page at /, dedicated /login and /register,
  // and redirect any protected routes to /login
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthScreen initialMode="login" />} />
        <Route path="/register" element={<AuthScreen initialMode="register" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // 3. Authenticated users: Open the dashboard and private routes
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardView />} />
        <Route path="transactions" element={<TransactionsView />} />
        <Route path="budgets" element={<BudgetsView />} />
        <Route path="goals" element={<GoalsView />} />
        <Route path="recurring" element={<RecurringView />} />
        <Route path="analytics" element={<AnalyticsView />} />
        <Route path="reports" element={<ReportsView />} />
        <Route path="settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App


