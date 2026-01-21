import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  LayoutDashboard,
  BookOpen,
  Code2,
  Play,
  Users,
  Building2,
  Github,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Activity,
  Zap,
  FileText,
  Workflow,
  Target,
  Mic,
  Radio
} from 'lucide-react'

// Navigation structure
const NAV_SECTIONS = [
  {
    id: 'main',
    items: [
      {
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: '/',
        description: 'Executive Command Center'
      },
      {
        label: 'Voice Sparks',
        icon: Radio,
        path: '/sparks',
        description: 'Limitless Pendant feed',
        color: '#a855f7'
      },
      {
        label: 'Agency Demo',
        icon: Play,
        path: '/demo',
        description: 'Multi-tenant workflow demo'
      }
    ]
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        label: 'Documentation',
        icon: BookOpen,
        href: 'https://superchase-manual-production.up.railway.app',
        external: true,
        description: 'SuperChase Manual'
      },
      {
        label: 'API Reference',
        icon: Code2,
        href: 'https://superchase-manual-production.up.railway.app/docs/system/api',
        external: true,
        description: 'REST API documentation'
      },
      {
        label: 'Review Workflow',
        icon: Workflow,
        href: 'https://superchase-manual-production.up.railway.app/docs/system/review-workflow',
        external: true,
        description: 'Content approval pipeline'
      }
    ]
  },
  {
    id: 'strategy',
    label: 'GST Dashboards',
    items: [
      {
        label: 'Scan2Plan',
        icon: Target,
        path: '/gst/s2p',
        color: '#3b82f6'
      },
      {
        label: 'Big Muddy Inn',
        icon: Target,
        path: '/gst/bigmuddy',
        color: '#8b4513'
      },
      {
        label: 'Studio C',
        icon: Target,
        path: '/gst/studioc',
        color: '#8b0000'
      },
      {
        label: 'Tuthill Design',
        icon: Target,
        path: '/gst/tuthill',
        color: '#c9a227'
      },
      {
        label: 'Utopia Studios',
        icon: Target,
        path: '/gst/utopia',
        color: '#4a7c59'
      },
      {
        label: 'CPTV',
        icon: Target,
        path: '/gst/cptv',
        color: '#ff0066'
      }
    ]
  },
  {
    id: 'portals',
    label: 'Client Portals',
    items: [
      {
        label: 'Big Muddy Inn',
        icon: Building2,
        path: '/portal/bigmuddy',
        badge: 'bigmuddy',
        color: '#f97316'
      },
      {
        label: 'Studio C',
        icon: Building2,
        path: '/portal/studioc',
        badge: 'studioc',
        color: '#10b981'
      },
      {
        label: 'CPTV',
        icon: Building2,
        path: '/portal/cptv',
        badge: 'cptv',
        color: '#a855f7'
      },
      {
        label: 'Tuthill Design',
        icon: Building2,
        path: '/portal/tuthill',
        badge: 'tuthill',
        color: '#f97316'
      },
      {
        label: 'Utopia Studios',
        icon: Building2,
        path: '/portal/utopia',
        badge: 'utopia',
        color: '#3b82f6'
      }
    ]
  },
  {
    id: 'external',
    label: 'Resources',
    items: [
      {
        label: 'GitHub',
        icon: Github,
        href: 'https://github.com/CPTV27',
        external: true
      },
      {
        label: 'Railway',
        icon: Zap,
        href: 'https://railway.app/project/cc5389c6-ab33-4c79-8d52-c96f995b8d27',
        external: true
      }
    ]
  }
]

// Collapsible Section
function NavSection({ section, isExpanded, onToggle }) {
  const location = useLocation()

  // Check if any item in section is active
  const hasActiveItem = section.items.some(item =>
    item.path && location.pathname === item.path
  )

  // Main section (no header) - always show items
  if (!section.label) {
    return (
      <div className="space-y-1">
        {section.items.map((item) => (
          <NavItem key={item.label} item={item} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
          hasActiveItem ? 'text-zinc-300' : 'text-zinc-500 hover:text-zinc-400'
        }`}
      >
        <span>{section.label}</span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pl-2">
              {section.items.map((item) => (
                <NavItem key={item.label} item={item} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Individual Nav Item
function NavItem({ item }) {
  const location = useLocation()
  const isActive = item.path && location.pathname === item.path
  const Icon = item.icon

  const baseClasses = `
    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
    transition-all duration-200 group touch-target
  `

  const activeClasses = isActive
    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'

  // External link
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClasses} ${activeClasses}`}
        title={item.description}
      >
        <Icon className="w-5 h-5 flex-shrink-0" style={item.color ? { color: item.color } : {}} />
        <span className="flex-1 truncate">{item.label}</span>
        <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
      </a>
    )
  }

  // Internal NavLink
  return (
    <NavLink
      to={item.path}
      className={`${baseClasses} ${activeClasses}`}
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
    system: true,
    strategy: true,
    portals: false,
    external: false
  })

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
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
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : -280,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`
          fixed top-0 left-0 h-full w-[280px] z-50
          glass-sidebar flex flex-col
          lg:relative lg:translate-x-0 lg:opacity-100
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
          {NAV_SECTIONS.map((section) => (
            <NavSection
              key={section.id}
              section={section}
              isExpanded={section.label ? expandedSections[section.id] : true}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </nav>

        {/* Footer - System Status */}
        <SystemStatus status={spokeStatus} />

        {/* Version */}
        <div className="px-4 py-3 text-xs text-zinc-600 border-t border-zinc-800/50">
          v2.4 • Railway Production
        </div>
      </motion.aside>

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
