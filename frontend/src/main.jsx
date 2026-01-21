import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout.jsx'
import App from './App.jsx'
import AgencyDemo from './components/AgencyDemo.jsx'
import ClientPortal from './components/ClientPortal.jsx'
import GSTDashboard from './components/GSTDashboard.jsx'
import LimitlessFeed from './components/LimitlessFeed.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<App />} />
          <Route path="/demo" element={<AgencyDemo />} />
          <Route path="/portal/:clientId" element={<ClientPortal />} />
          <Route path="/gst/:clientId" element={<GSTDashboard />} />
          <Route path="/sparks" element={<LimitlessFeed />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
