import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { getSpokeStatus } from '../services/api'

/**
 * Layout wrapper component with sidebar navigation
 * Provides consistent navigation across all routes
 */
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [spokeStatus, setSpokeStatus] = useState({ spokes: {} })

  // Fetch spoke status for sidebar indicator
  useEffect(() => {
    const fetchStatus = async () => {
      const status = await getSpokeStatus()
      setSpokeStatus(status)
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close sidebar on route change (mobile)
  const handleToggle = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [sidebarOpen])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={handleToggle}
        spokeStatus={spokeStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen lg:ml-0 transition-all duration-200">
        <Outlet context={{ spokeStatus, sidebarOpen, toggleSidebar: handleToggle }} />
      </main>
    </div>
  )
}
