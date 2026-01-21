import { useState, useContext, createContext } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  LayoutDashboard,
  FileText,
  Megaphone,
  Target,
  Radio,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  Activity,
  Building2,
  Zap,
  ListTodo,
  History,
  Settings
} from 'lucide-react'

// Client/Portfolio Configuration
export const PORTFOLIOS = {
  s2p: { id: 's2p', name: 'Scan2Plan', color: '#3b82f6', icon: '🏗️' },
  bigmuddy: { id: 'bigmuddy', name: 'Big Muddy Inn', color: '#8b4513', icon: '🏨' },
  studioc: { id: 'studioc', name: 'Studio C', color: '#8b0000', icon: '🎬' },
  tuthill: { id: 'tuthill', name: 'Tuthill Design', color: '#c9a227', icon: '🎨' },
  utopia: { id: 'utopia', name: 'Utopia Studios', color: '#4a7c59', icon: '🎵' },
  cptv: { id: 'cptv', name: 'CPTV', color: '#ff0066', icon: '📺' }
}

// Portfolio Context for global state
export const PortfolioContext = createContext({
  activePortfolio: null,
  setActivePortfolio: () => {}
})

// Main Navigation - Core pages
const MAIN_NAV = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
    description: 'Executive Command Center'
  },
  {
    label: 'Tasks',
    icon: ListTodo,
    path: '/tasks',
    description: 'Asana task management',
    color: '#3b82f6'
  },
  {
    label: 'Review Queue',
    icon: FileText,
    path: '/review',
    description: 'Content approval workflow',
    color: '#f59e0b'
  },
  {
    label: 'Marketing Hub',
    icon: Megaphone,
    path: '/marketing',
    description: 'Content creation pipeline',
    color: '#10b981'
  },
  {
    label: 'S2P Lead Radar',
    icon: Target,
    path: '/s2p',
    description: 'Business development',
    color: '#3b82f6'
  },
  {
    label: 'Audit Log',
    icon: History,
    path: '/logs',
    description: 'System audit trail',
    color: '#6b7280'
  },
  {
    label: 'Settings',
    icon: Settings,
    path: '/settings',
    description: 'System configuration',
    color: '#71717a'
  }
]

// Intelligence section
const INTELLIGENCE_NAV = [
  {
    label: 'Voice Sparks',
    icon: Radio,
    path: '/sparks',
    description: 'Limitless Pendant feed',
    color: '#a855f7'
  },
  {
    label: 'Scout Insights',
    icon: Sparkles,
    path: '/insights',
    description: 'AI-extracted patterns',
    color: '#06b6d4'
  }
]

// Collapsible Section Header
function SectionHeader({ title, icon: Icon, isExpanded, onToggle, color }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800/30"
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" style={color ? { color } : {}} />}
        <span>{title}</span>
      </div>
      <motion.div
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown className="w-4 h-4" />
      </motion.div>
    </button>
  )
}

// Individual Nav Item
function NavItem({ item, onClick }) {
  const location = useLocation()
  const isActive = item.path && location.pathname === item.path
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-200 group touch-target
        ${isActive
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
        }
      `}
      title={item.description}
    >
      <Icon className="w-5 h-5 flex-shrink-0" style={item.color ? { color: item.color } : {}} />
      <span className="flex-1 truncate">{item.label}</span>
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="w-1.5 h-1.5 rounded-full bg-blue-400"
        />
      )}
    </NavLink>
  )
}

// Portfolio Wash Button - for client switching
function PortfolioWash({ portfolio, isActive, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-200 touch-target
        ${isActive
          ? 'border'
          : 'hover:bg-zinc-800/50'
        }
      `}
      style={isActive ? {
        backgroundColor: `${portfolio.color}20`,
        borderColor: `${portfolio.color}50`,
        color: portfolio.color
      } : {
        color: '#a1a1aa'
      }}
    >
      <span className="text-base">{portfolio.icon}</span>
      <span className="flex-1 text-left truncate">{portfolio.name}</span>
      {isActive && (
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: portfolio.color }}
        />
      )}
    </motion.button>
  )
}

// Status indicator for spokes
function SystemStatus({ status }) {
  const onlineCount = Object.values(status?.spokes || {}).filter(s => s.status === 'online').length
  const totalCount = Object.keys(status?.spokes || {}).length || 6

  return (
    <div className="px-3 py-3 border-t border-zinc-800/50">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Activity className="w-4 h-4" />
        <span>System Status</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${onlineCount === totalCount ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
          <span className="text-zinc-400">{onlineCount}/{totalCount}</span>
        </span>
      </div>
    </div>
  )
}

// Main Sidebar Component
export default function Sidebar({ isOpen, onToggle, spokeStatus }) {
  const [expandedSections, setExpandedSections] = useState({
    intelligence: true,
    portfolio: true
  })
  const [activePortfolio, setActivePortfolio] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const handlePortfolioSelect = (portfolioId) => {
    setActivePortfolio(portfolioId === activePortfolio ? null : portfolioId)
    // Navigate to GST dashboard for selected portfolio
    if (portfolioId !== activePortfolio) {
      navigate(`/gst/${portfolioId}`)
    }
  }

  // Close sidebar on mobile after navigation
  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      onToggle()
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-[280px] z-50
          flex flex-col
          bg-[rgba(9,9,11,0.97)] backdrop-blur-xl
          border-r border-zinc-800/50
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:relative
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">SuperChase</h1>
              <p className="text-xs text-zinc-500">Executive OS</p>
            </div>
          </div>

          {/* Close button - mobile only */}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors lg:hidden touch-target"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Main Navigation */}
          <div className="space-y-1">
            {MAIN_NAV.map((item) => (
              <NavItem key={item.label} item={item} onClick={handleNavClick} />
            ))}
          </div>

          {/* Intelligence Section */}
          <div className="space-y-1">
            <SectionHeader
              title="Intelligence"
              icon={Sparkles}
              color="#a855f7"
              isExpanded={expandedSections.intelligence}
              onToggle={() => toggleSection('intelligence')}
            />
            <AnimatePresence initial={false}>
              {expandedSections.intelligence && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 pl-2 pt-1">
                    {INTELLIGENCE_NAV.map((item) => (
                      <NavItem key={item.label} item={item} onClick={handleNavClick} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Portfolio Washes Section */}
          <div className="space-y-1">
            <SectionHeader
              title="Portfolio Washes"
              icon={Building2}
              color="#f97316"
              isExpanded={expandedSections.portfolio}
              onToggle={() => toggleSection('portfolio')}
            />
            <AnimatePresence initial={false}>
              {expandedSections.portfolio && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 pl-2 pt-1">
                    {Object.values(PORTFOLIOS).map((portfolio) => (
                      <PortfolioWash
                        key={portfolio.id}
                        portfolio={portfolio}
                        isActive={activePortfolio === portfolio.id || location.pathname === `/gst/${portfolio.id}`}
                        onClick={() => handlePortfolioSelect(portfolio.id)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Footer - System Status */}
        <SystemStatus status={spokeStatus} />

        {/* Version */}
        <div className="px-4 py-3 text-xs text-zinc-600 border-t border-zinc-800/50 flex items-center justify-between">
          <span>v3.0 • Executive Cockpit</span>
          <a
            href="https://railway.app/project/cc5389c6-ab33-4c79-8d52-c96f995b8d27"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-zinc-400"
          >
            <Zap className="w-3.5 h-3.5" />
          </a>
        </div>
      </aside>

      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className={`
          fixed top-4 left-4 z-30 p-3 rounded-xl
          glass hover:bg-zinc-700/50 transition-colors
          lg:hidden touch-target
          ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
      >
        <Menu className="w-5 h-5 text-zinc-300" />
      </button>
    </>
  )
}
