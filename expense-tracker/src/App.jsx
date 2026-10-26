import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

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

  // 2. Unauthenticated visitors: Show exclusively the login / register screen
  if (!isAuthenticated) {
    return <AuthScreen />;
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

