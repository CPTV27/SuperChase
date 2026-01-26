import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Layout from './components/Layout.jsx'
import App from './App.jsx'
import ReviewQueue from './components/ReviewQueue.jsx'
import MarketingHub from './components/MarketingHub.jsx'
import S2PPortal from './components/S2PPortal.jsx'
import S2PCommand from './components/s2p/S2PCommand.jsx'
import LimitlessFeed from './components/LimitlessFeed.jsx'
import GSTDashboard from './components/GSTDashboard.jsx'
import ScoutInsights from './components/ScoutInsights.jsx'
import TasksPage from './components/TasksPage.jsx'
import AuditLog from './components/AuditLog.jsx'
import SettingsPage from './components/SettingsPage.jsx'
import OnboardingWizard from './components/onboarding/OnboardingWizard.jsx'
import DiscoveryPortal from './pages/DiscoveryPortal.jsx'
import NotebooksPage from './components/NotebooksPage.jsx'
import OrchestratorPanel from './components/OrchestratorPanel.jsx'
import Gallery from './components/Gallery.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary
      title="Application Error"
      message="SuperChase encountered an unexpected error. Please refresh the page to continue."
      showHomeButton
    >
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Core Pages */}
            <Route path="/" element={
              <ErrorBoundary title="Dashboard Error">
                <App />
              </ErrorBoundary>
            } />
            <Route path="/review" element={
              <ErrorBoundary title="Review Queue Error">
                <ReviewQueue />
              </ErrorBoundary>
            } />
            <Route path="/marketing" element={
              <ErrorBoundary title="Marketing Hub Error">
                <MarketingHub />
              </ErrorBoundary>
            } />
            <Route path="/s2p" element={
              <ErrorBoundary title="S2P Portal Error">
                <S2PPortal />
              </ErrorBoundary>
            } />
            <Route path="/s2p/command" element={
              <ErrorBoundary title="S2P Command Error">
                <S2PCommand />
              </ErrorBoundary>
            } />

            {/* Task & System Pages */}
            <Route path="/tasks" element={
              <ErrorBoundary title="Tasks Error">
                <TasksPage />
              </ErrorBoundary>
            } />
            <Route path="/logs" element={
              <ErrorBoundary title="Audit Log Error">
                <AuditLog />
              </ErrorBoundary>
            } />
            <Route path="/settings" element={
              <ErrorBoundary title="Settings Error">
                <SettingsPage />
              </ErrorBoundary>
            } />
            <Route path="/onboard" element={
              <ErrorBoundary title="Onboarding Error">
                <OnboardingWizard />
              </ErrorBoundary>
            } />
            <Route path="/discover" element={
              <ErrorBoundary title="Discovery Portal Error">
                <DiscoveryPortal />
              </ErrorBoundary>
            } />
            <Route path="/discover/:businessId" element={
              <ErrorBoundary title="Discovery Portal Error">
                <DiscoveryPortal />
              </ErrorBoundary>
            } />
            <Route path="/notebooks" element={
              <ErrorBoundary title="Notebooks Error">
                <NotebooksPage />
              </ErrorBoundary>
            } />
            <Route path="/orchestrator" element={
              <ErrorBoundary title="Orchestrator Error">
                <OrchestratorPanel />
              </ErrorBoundary>
            } />
            <Route path="/gallery" element={
              <ErrorBoundary title="Gallery Error">
                <Gallery />
              </ErrorBoundary>
            } />

            {/* Intelligence Pages */}
            <Route path="/sparks" element={
              <ErrorBoundary title="Sparks Error">
                <LimitlessFeed />
              </ErrorBoundary>
            } />
            <Route path="/insights" element={
              <ErrorBoundary title="Insights Error">
                <ScoutInsights />
              </ErrorBoundary>
            } />

            {/* Portfolio GST Dashboards */}
            <Route path="/gst/:clientId" element={
              <ErrorBoundary title="GST Dashboard Error">
                <GSTDashboard />
              </ErrorBoundary>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
