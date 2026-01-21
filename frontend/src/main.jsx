import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout.jsx'
import App from './App.jsx'
import ReviewQueue from './components/ReviewQueue.jsx'
import MarketingHub from './components/MarketingHub.jsx'
import S2PPortal from './components/S2PPortal.jsx'
import LimitlessFeed from './components/LimitlessFeed.jsx'
import GSTDashboard from './components/GSTDashboard.jsx'
import ScoutInsights from './components/ScoutInsights.jsx'
import TasksPage from './components/TasksPage.jsx'
import AuditLog from './components/AuditLog.jsx'
import SettingsPage from './components/SettingsPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Core Pages */}
          <Route path="/" element={<App />} />
          <Route path="/review" element={<ReviewQueue />} />
          <Route path="/marketing" element={<MarketingHub />} />
          <Route path="/s2p" element={<S2PPortal />} />

          {/* Task & System Pages */}
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/logs" element={<AuditLog />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Intelligence Pages */}
          <Route path="/sparks" element={<LimitlessFeed />} />
          <Route path="/insights" element={<ScoutInsights />} />

          {/* Portfolio GST Dashboards */}
          <Route path="/gst/:clientId" element={<GSTDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
