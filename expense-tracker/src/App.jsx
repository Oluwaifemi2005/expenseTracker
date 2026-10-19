import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './Layout'
import DashboardView from './pages/DashboardView'
import TransactionsView from './pages/TransactionsView'
import AnalyticsView from './pages/AnalyticsView'
import SettingsView from './pages/SettingsView'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardView />} />
        <Route path="transactions" element={<TransactionsView />} />
        <Route path="analytics" element={<AnalyticsView />} />
        <Route path="settings" element={<SettingsView />} />
      </Route>
    </Routes>
  )
}

export default App
