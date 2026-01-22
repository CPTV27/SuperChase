import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, AreaChart, Area, ResponsiveContainer, Tooltip, XAxis
} from 'recharts'
import {
  Activity,
  Brain,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Bell,
  Info,
  Zap,
  MessageSquare,
  Send,
  RefreshCw,
  Mic,
  Radio,
  Target,
  TrendingUp,
  Users,
  Flame,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  Building2,
  Video,
  Tv,
  Palette,
  FileCheck,
  ExternalLink,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import api, { getLogs, getStrategy, getSpokeStatus, triggerBriefing, getReviewPulse } from './services/api'
import AgencyPulse from './components/AgencyPulse'
import BriefingWidget from './components/BriefingWidget'
import TodaysFocus from './components/TodaysFocus'

// Business Unit Configuration
const BUSINESS_UNITS = {
  all: { label: 'All', color: '#a1a1aa', icon: Building2 },
  s2p: { label: 'Scan2Plan', color: '#3b82f6', icon: Target, badge: 'badge-s2p' },
  studio: { label: 'Studio C', color: '#10b981', icon: Video, badge: 'badge-studio' },
  cptv: { label: 'CPTV', color: '#a855f7', icon: Tv, badge: 'badge-cptv' },
  tuthill: { label: 'Tuthill', color: '#f97316', icon: Palette, badge: 'badge-tuthill' }
}

// Time-based work pattern prediction
function getSuggestedFilter() {
  const hour = new Date().getHours()
  const day = new Date().getDay() // 0 = Sunday

  // Weekend = lighter work, likely content/creative
  if (day === 0 || day === 6) {
    return { filter: 'cptv', reason: 'Weekend creative time' }
  }

  // Morning (6am-12pm) = Scan2Plan operations focus
  if (hour >= 6 && hour < 12) {
    return { filter: 's2p', reason: 'Morning ops focus' }
  }

  // Afternoon (12pm-5pm) = Studio C / production
  if (hour >= 12 && hour < 17) {
    return { filter: 'studio', reason: 'Afternoon production' }
  }

  // Evening (5pm-10pm) = CPTV content / personal brand
  if (hour >= 17 && hour < 22) {
    return { filter: 'cptv', reason: 'Evening content time' }
  }

  // Late night / early morning = all
  return { filter: 'all', reason: null }
}

// Animated George Orb Component with SVG Waves
function GeorgeOrb({ onClick, isLoading }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={isLoading}
      className="orb-container relative w-24 h-24 rounded-full cursor-pointer focus:outline-none touch-target"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title="Click to generate new briefing"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Base circle */}
        <circle cx="50" cy="50" r="45" fill="url(#orbGradient)" filter="url(#glow)" />

        {/* Animated wave layers */}
        <g className="wave-1" opacity="0.6">
          <path
            d="M20,50 Q35,40 50,50 T80,50"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2"
          />
        </g>
        <g className="wave-2" opacity="0.5">
          <path
            d="M15,55 Q32,65 50,55 T85,55"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.5"
          />
        </g>
        <g className="wave-3" opacity="0.4">
          <path
            d="M18,45 Q35,35 50,45 T82,45"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
          />
        </g>

        {/* Center brain icon area */}
        <circle cx="50" cy="50" r="20" fill="rgba(0,0,0,0.2)" />
      </svg>

      {/* Brain icon overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isLoading ? (
          <RefreshCw className="w-8 h-8 text-white animate-spin" />
        ) : (
          <Brain className="w-8 h-8 text-white" />
        )}
      </div>
    </motion.button>
  )
}

// Status indicator component
function StatusDot({ status }) {
  const colors = {
    online: 'bg-emerald-500',
    offline: 'bg-red-500',
    warning: 'bg-yellow-500',
    loading: 'bg-blue-500'
  }
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || colors.offline} ${status === 'online' ? 'pulse-glow' : ''}`} />
  )
}

// Glassmorphism Card wrapper
function Card({ title, icon: Icon, children, className = '', accentColor }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl overflow-hidden card-hover ${className}`}
      style={accentColor ? { borderColor: `${accentColor}30` } : {}}
    >
      {title && (
        <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5" style={{ color: accentColor || '#60a5fa' }} />}
          <h3 className="font-semibold text-zinc-100">{title}</h3>
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </motion.div>
  )
}

// Business Unit Filter Pills
function BusinessFilter({ active, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.entries(BUSINESS_UNITS).map(([key, unit]) => {
        const Icon = unit.icon
        return (
          <motion.button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all touch-target ${
              active === key
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/50'
            }`}
            style={active === key ? { backgroundColor: unit.color } : {}}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon className="w-4 h-4" />
            {unit.label}
          </motion.button>
        )
      })}
    </div>
  )
}

// Sparkline Component
function Sparkline({ data, color = '#3b82f6', height = 40 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#spark-${color})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Business Velocity Chart
function VelocityChart({ triageData, completionData }) {
  const data = triageData.map((t, i) => ({
    name: `D${i + 1}`,
    triage: t,
    completed: completionData[i] || 0
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="triageGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: 'rgba(24, 24, 27, 0.9)',
            border: '1px solid rgba(63, 63, 70, 0.5)',
            borderRadius: '8px',
            backdropFilter: 'blur(8px)'
          }}
        />
        <Area type="monotone" dataKey="triage" stroke="#3b82f6" strokeWidth={2} fill="url(#triageGrad)" name="Triaged" />
        <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fill="url(#completedGrad)" name="Completed" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Quick Ingest Modal
function QuickIngestModal({ isOpen, onClose }) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!note.trim()) return

    setLoading(true)
    try {
      // POST to tasks endpoint
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'sc_676782661b25ced4ffaa25c0a5b4bfa7b07985f6b49fe0ee' },
        body: JSON.stringify({ note: note.trim() })
      })
      setSuccess(true)
      setTimeout(() => {
        setNote('')
        setSuccess(false)
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Ingest error:', error)
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass rounded-2xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Plus className="w-6 h-6 text-blue-400" />
                Quick Ingest
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors touch-target">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Type a note, task, or idea..."
                className="w-full h-32 px-4 py-3 bg-zinc-900/50 border border-zinc-700/50 rounded-xl text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-blue-500/50 text-lg"
                autoFocus
              />

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors font-medium touch-target"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !note.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 touch-target"
                >
                  {success ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Captured!
                    </>
                  ) : loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Ingest
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Expandable Roadmap Item
function RoadmapItem({ item, isExpanded, onToggle }) {
  return (
    <motion.div
      className="border-b border-zinc-800/50 last:border-0"
      layout
    >
      <button
        onClick={onToggle}
        className="w-full py-4 flex items-center justify-between text-left hover:bg-zinc-800/30 px-2 -mx-2 rounded-lg transition-colors touch-target"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-zinc-200 font-medium">{item.title || item}</span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-zinc-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4 pl-11 pr-2">
              <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                <p className="text-sm text-zinc-400 italic">
                  {item.sourceQuote || item.description || 'No additional context available.'}
                </p>
                {item.status && (
                  <span className="inline-block mt-3 px-2 py-1 text-xs rounded-md bg-emerald-500/20 text-emerald-400">
                    {item.status}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Task item component
function TaskItem({ task }) {
  const priorityColors = {
    high: 'border-l-red-500 bg-red-500/5',
    medium: 'border-l-yellow-500 bg-yellow-500/5',
    low: 'border-l-zinc-600'
  }
  const priority = task.dueOn && new Date(task.dueOn) < new Date() ? 'high' : 'medium'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border-l-2 ${priorityColors[priority]} pl-4 py-3 rounded-r-lg`}
    >
      <div className="text-sm text-zinc-200 font-medium">{task.name}</div>
      <div className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
        <span>{task.project}</span>
        {task.dueOn && (
          <>
            <span>•</span>
            <Clock className="w-3 h-3" />
            <span>{task.dueOn}</span>
          </>
        )}
      </div>
    </motion.div>
  )
}

// Friction item component
function FrictionItem({ friction }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-start gap-3 py-3"
    >
      <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-sm text-zinc-200 font-medium">{friction.area}</div>
        <div className="text-xs text-zinc-500 mt-1">{friction.symptom}</div>
      </div>
    </motion.div>
  )
}

// System Alert item component
function AlertItem({ alert, isNew }) {
  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      style: 'alert-critical border-l-red-500',
      iconColor: 'text-red-500'
    },
    warning: {
      icon: AlertCircle,
      style: 'alert-warning border-l-yellow-500',
      iconColor: 'text-yellow-500'
    },
    info: {
      icon: Info,
      style: 'alert-info border-l-blue-500',
      iconColor: 'text-blue-400'
    },
    success: {
      icon: CheckCircle2,
      style: 'alert-success border-l-emerald-500',
      iconColor: 'text-emerald-500'
    }
  }

  const config = severityConfig[alert.severity] || severityConfig.info
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border-l-2 pl-3 py-2 rounded-r ${config.style} ${isNew ? 'alert-new' : ''}`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-zinc-200">{alert.message}</div>
          <div className="text-xs text-zinc-500 mt-1">{alert.timestamp}</div>
        </div>
      </div>
    </motion.div>
  )
}

// Leverage opportunity component
function LeverageItem({ opportunity }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-3 border-b border-zinc-800/30 last:border-0"
    >
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-cyan-400" />
        <span className="text-sm text-zinc-200 font-medium">{opportunity.title}</span>
      </div>
      <div className="text-xs text-zinc-500 mt-2 flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-zinc-800">{opportunity.fromBusiness}</span>
        <ChevronRight className="w-3 h-3" />
        <span className="px-2 py-0.5 rounded bg-zinc-800">{opportunity.toBusiness}</span>
        <span className={`ml-auto px-2 py-0.5 rounded text-xs ${
          opportunity.impact === 'high' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {opportunity.impact} impact
        </span>
      </div>
    </motion.div>
  )
}

// Review Pulse Widget - Agency Mode Content Workflow
function ReviewPulseWidget({ pulse }) {
  const { counts, agencyPending, clientPending, readyToPublish, needsRevision } = pulse
  const totalPending = (counts.agencyReview || 0) + (counts.clientReview || 0) + (counts.needsRevision || 0)

  return (
    <div className="space-y-4">
      {/* Status Badges */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <Clock className="w-4 h-4 text-yellow-400" />
          <div>
            <div className="text-lg font-bold text-yellow-400">{counts.agencyReview || 0}</div>
            <div className="text-xs text-zinc-500">Your Review</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Users className="w-4 h-4 text-blue-400" />
          <div>
            <div className="text-lg font-bold text-blue-400">{counts.clientReview || 0}</div>
            <div className="text-xs text-zinc-500">Client Review</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-lg font-bold text-emerald-400">{counts.readyToPublish || 0}</div>
            <div className="text-xs text-zinc-500">Ready to Publish</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <AlertCircle className="w-4 h-4 text-orange-400" />
          <div>
            <div className="text-lg font-bold text-orange-400">{counts.needsRevision || 0}</div>
            <div className="text-xs text-zinc-500">Needs Revision</div>
          </div>
        </div>
      </div>

      {/* Pending Items */}
      {agencyPending && agencyPending.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Awaiting Your Approval</div>
          {agencyPending.slice(0, 3).map((item, i) => (
            <motion.div
              key={item.id || i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-200 font-medium truncate">{item.title}</div>
                  <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800">{item.clientId}</span>
                    <span>{item.type}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {item.approveUrl && (
                    <a
                      href={item.approveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors touch-target"
                      title="Approve"
                    >
                      <ThumbsUp className="w-4 h-4 text-emerald-400" />
                    </a>
                  )}
                  {item.rejectUrl && (
                    <a
                      href={item.rejectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors touch-target"
                      title="Reject"
                    >
                      <ThumbsDown className="w-4 h-4 text-red-400" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Ready to Publish */}
      {readyToPublish && readyToPublish.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Ready to Publish</div>
          {readyToPublish.slice(0, 2).map((item, i) => (
            <motion.div
              key={item.id || i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-zinc-200 truncate">{item.title}</div>
                <div className="text-xs text-zinc-500">{item.clientId}</div>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {totalPending === 0 && (
        <div className="text-center py-4 text-zinc-500 text-sm">
          <FileCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
          All content approved
        </div>
      )}
    </div>
  )
}

// Main Dashboard Component
function App() {
  const [health, setHealth] = useState({ status: 'loading' })
  const [tasks, setTasks] = useState([])
  const [briefing, setBriefing] = useState(null)
  const [query, setQuery] = useState('')
  const [georgeResponse, setGeorgeResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Live data from backend
  const [spokeStatus, setSpokeStatus] = useState({ spokes: {} })
  const [strategy, setStrategy] = useState(null)
  const [logs, setLogs] = useState([])
  const [triggeringBriefing, setTriggeringBriefing] = useState(false)

  // UI State - Initialize with time-based suggestion
  const [filterSuggestion] = useState(() => getSuggestedFilter())
  const [activeFilter, setActiveFilter] = useState(() => getSuggestedFilter().filter)
  const [showQuickIngest, setShowQuickIngest] = useState(false)
  const [expandedRoadmap, setExpandedRoadmap] = useState(null)

  // System Alerts
  const [alerts, setAlerts] = useState([])
  const [seenAlertIds, setSeenAlertIds] = useState(new Set())

  // Review Pulse (Agency Mode)
  const [reviewPulse, setReviewPulse] = useState({
    counts: { agencyReview: 0, clientReview: 0, readyToPublish: 0, needsRevision: 0 },
    agencyPending: [],
    clientPending: [],
    readyToPublish: [],
    needsRevision: []
  })

  // Generate alerts from spoke status changes
  useEffect(() => {
    if (!spokeStatus.spokes || Object.keys(spokeStatus.spokes).length === 0) return

    const newAlerts = []
    const spokeNames = {
      hub: 'Hub (Gemini)',
      asana: 'Asana',
      gmail: 'Gmail',
      voice: 'Voice (ElevenLabs)',
      twitter: 'Twitter',
      sheets: 'Sheets'
    }

    Object.entries(spokeStatus.spokes).forEach(([key, spoke]) => {
      const alertId = `${key}-${spoke.status}`
      const spokeName = spokeNames[key] || key

      if (spoke.status === 'offline') {
        newAlerts.push({
          id: alertId,
          severity: 'critical',
          message: `${spokeName} spoke is offline`,
          detail: spoke.message,
          timestamp: new Date().toLocaleTimeString()
        })
      } else if (spoke.status === 'warning') {
        newAlerts.push({
          id: alertId,
          severity: 'warning',
          message: `${spokeName}: ${spoke.message}`,
          timestamp: new Date().toLocaleTimeString()
        })
      }
    })

    // Only add truly new alerts
    const unseenAlerts = newAlerts.filter(a => !seenAlertIds.has(a.id))
    if (unseenAlerts.length > 0) {
      setAlerts(prev => [...unseenAlerts, ...prev].slice(0, 10))
      setSeenAlertIds(prev => new Set([...prev, ...unseenAlerts.map(a => a.id)]))
    }
  }, [spokeStatus])

  // Mock velocity data (would come from logs analysis)
  const triageData = [12, 8, 15, 10, 18, 14, 20]
  const completionData = [10, 6, 12, 8, 15, 12, 16]

  // Fetch data on mount and every 30 seconds
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [healthData, tasksData, briefingData, statusData, strategyData, logsData, pulseData] = await Promise.all([
        api.getHealth(),
        api.getTasks(8),
        api.getBriefing(),
        getSpokeStatus(),
        getStrategy(),
        getLogs(10),
        getReviewPulse()
      ])
      setHealth(healthData)
      setTasks(tasksData.tasks || [])
      setBriefing(briefingData)
      setSpokeStatus(statusData)
      setStrategy(strategyData)
      setLogs(logsData.logs || [])
      setReviewPulse(pulseData)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Fetch error:', error)
    }
    setLoading(false)
  }, [])

  async function handleTriggerBriefing() {
    setTriggeringBriefing(true)
    try {
      const result = await triggerBriefing()
      if (result.success) {
        await fetchData()
      }
    } catch (error) {
      console.error('Briefing trigger error:', error)
    }
    setTriggeringBriefing(false)
  }

  async function handleQuery(e) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    const response = await api.queryGeorge(query)
    setGeorgeResponse(response)
    setLoading(false)
  }

  // Stats with sparkline data
  const stats = [
    { label: 'Tasks Active', value: tasks.length, color: '#3b82f6', data: [3, 5, 4, 6, 8, 7, tasks.length].map(v => ({ value: v })) },
    { label: 'Triaged Today', value: 12, color: '#10b981', data: [8, 10, 9, 11, 10, 12, 12].map(v => ({ value: v })) },
    { label: 'Friction Points', value: strategy?.friction?.length || 0, color: '#eab308', data: [5, 4, 6, 5, 4, 3, strategy?.friction?.length || 0].map(v => ({ value: v })) },
    { label: 'Spokes Online', value: Object.values(spokeStatus.spokes || {}).filter(s => s.status === 'online').length, color: '#06b6d4', data: [4, 5, 4, 5, 6, 5, 6].map(v => ({ value: v })) }
  ]

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Quick Ingest Modal */}
      <QuickIngestModal isOpen={showQuickIngest} onClose={() => setShowQuickIngest(false)} />

      {/* Header - Simplified since branding is in sidebar */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Page Title - visible on mobile, hidden on desktop where sidebar shows */}
          <div className="flex items-center gap-3 lg:hidden">
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <span className="text-sm text-zinc-500">v2.4</span>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 sm:ml-auto">
            {/* Business Filter */}
            <div className="flex flex-col gap-1">
              <BusinessFilter active={activeFilter} onChange={setActiveFilter} />
              {filterSuggestion.reason && activeFilter === filterSuggestion.filter && (
                <span className="text-xs text-zinc-600 pl-1">
                  Auto-focused: {filterSuggestion.reason}
                </span>
              )}
            </div>

            {/* Quick Ingest */}
            <button
              onClick={() => setShowQuickIngest(true)}
              className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/25 touch-target"
              title="Quick Ingest"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>

            {/* Status Indicator */}
            <div className="flex items-center gap-3 px-4 py-2 glass rounded-xl">
              <StatusDot status={health.status === 'ok' ? 'online' : 'offline'} />
              <span className="text-sm text-zinc-400">
                {health.status === 'ok' ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-3 rounded-xl glass hover:bg-zinc-700/50 transition-colors touch-target"
            >
              <RefreshCw className={`w-5 h-5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* George's Briefing - Top of Dashboard */}
      <div className="mb-8">
        <BriefingWidget />
      </div>

      {/* Today's Focus - Priority 1 UX: Unified action items */}
      <div className="mb-8">
        <TodaysFocus />
      </div>

      {/* Stats with Sparklines */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {stats.map((stat, i) => (
          <div key={i} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-zinc-500 mt-1">{stat.label}</div>
              </div>
              <div className="w-20 h-10">
                <Sparkline data={stat.data} color={stat.color} />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Main Grid - iPad Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 ipad-grid">
        {/* Left Column - George & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* George Panel */}
          <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* George Orb */}
              <GeorgeOrb onClick={handleTriggerBriefing} isLoading={triggeringBriefing} />

              {/* Briefing & Query */}
              <div className="flex-1 space-y-4 w-full">
                {briefing?.briefing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50"
                  >
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                      <Radio className="w-3 h-3" />
                      <span>Daily Briefing</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {briefing.briefing}
                    </p>
                  </motion.div>
                )}

                <form onSubmit={handleQuery} className="flex gap-3">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask George anything..."
                    className="flex-1 px-4 py-3 bg-zinc-900/50 border border-zinc-700/50 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-base"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors flex items-center gap-2 touch-target"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>

                <AnimatePresence>
                  {georgeResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
                    >
                      <div className="flex items-center gap-2 text-xs text-blue-400 mb-2">
                        <MessageSquare className="w-3 h-3" />
                        <span>George says</span>
                        {georgeResponse.confidence && (
                          <span className="ml-auto opacity-60">{Math.round(georgeResponse.confidence * 100)}%</span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-300">{georgeResponse.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Card>

          {/* Business Velocity Chart */}
          <Card title="Business Velocity" icon={TrendingUp} accentColor="#3b82f6">
            <VelocityChart triageData={triageData} completionData={completionData} />
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-zinc-400">Triaged</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-zinc-400">Completed</span>
              </div>
            </div>
          </Card>

          {/* Tasks */}
          <Card title="Task Pipeline" icon={CheckCircle2} accentColor="#10b981">
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {tasks.length > 0 ? (
                tasks.map((task, i) => <TaskItem key={i} task={task} />)
              ) : (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  {loading ? 'Loading tasks...' : 'No active tasks'}
                </div>
              )}
            </div>
          </Card>

          {/* Friction Radar */}
          <Card title="Friction Radar" icon={AlertTriangle} accentColor="#eab308">
            <div className="space-y-1 divide-y divide-zinc-800/30">
              {(strategy?.friction || []).length > 0 ? (
                strategy.friction.map((friction, i) => (
                  <FrictionItem key={i} friction={friction} />
                ))
              ) : (
                <div className="text-center py-6 text-zinc-500 text-sm">
                  No friction data available
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Status & Intelligence */}
        <div className="space-y-6">
          {/* System Alerts */}
          <Card title="System Alerts" icon={Bell} accentColor="#ef4444">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alerts.length > 0 ? (
                alerts.map((alert, i) => (
                  <AlertItem key={alert.id || i} alert={alert} isNew={i === 0} />
                ))
              ) : (
                <div className="text-center py-4 text-zinc-500 text-sm">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  All systems operational
                </div>
              )}
            </div>
          </Card>

          {/* Agency Pulse - George's Reasoning */}
          <AgencyPulse />

          {/* Review Pulse - Agency Mode */}
          <Card title="Review Pulse" icon={FileCheck} accentColor="#10b981">
            <ReviewPulseWidget pulse={reviewPulse} />
          </Card>

          {/* System Status */}
          <Card title="System Status" icon={Activity} accentColor="#06b6d4">
            <div className="space-y-4">
              {[
                { name: 'Hub (Gemini)', key: 'hub' },
                { name: 'Asana Spoke', key: 'asana' },
                { name: 'Gmail Spoke', key: 'gmail' },
                { name: 'Voice (ElevenLabs)', key: 'voice' },
                { name: 'Twitter Spoke', key: 'twitter' },
                { name: 'Sheets Audit', key: 'sheets' }
              ].map((system, i) => {
                const status = spokeStatus.spokes?.[system.key]?.status || 'offline'
                const message = spokeStatus.spokes?.[system.key]?.message || ''
                return (
                  <div key={i} className="flex items-center justify-between py-1" title={message}>
                    <span className="text-sm text-zinc-400">{system.name}</span>
                    <StatusDot status={status} />
                  </div>
                )
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-zinc-800/50 text-xs text-zinc-600">
              Last refresh: {lastRefresh.toLocaleTimeString()} (30s auto)
            </div>
          </Card>

          {/* Strategic Priorities / Roadmap - Expandable */}
          <Card title="Strategic Roadmap" icon={Target} accentColor="#a855f7">
            <div className="space-y-1">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">Sales Accelerator</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {strategy?.priorities?.salesAccelerator || 'Loading...'}
                </p>
              </div>

              {(strategy?.buildNow || []).map((item, i) => (
                <RoadmapItem
                  key={i}
                  item={typeof item === 'string' ? { title: item } : item}
                  isExpanded={expandedRoadmap === i}
                  onToggle={() => setExpandedRoadmap(expandedRoadmap === i ? null : i)}
                />
              ))}
            </div>
          </Card>

          {/* High-Value People */}
          <Card title="Key Stakeholders" icon={Users} accentColor="#f97316">
            <div className="flex flex-wrap gap-2">
              {Object.entries(strategy?.highValuePeople || {}).length > 0 ? (
                Object.entries(strategy.highValuePeople).map(([name, data], i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-3 py-2 bg-zinc-800/50 rounded-xl text-sm border border-zinc-700/30"
                    title={`${data.context} - Mentions: ${data.mentionCount || 1}`}
                  >
                    <span className="text-zinc-200">{name}</span>
                    <span className="text-zinc-500 ml-1 text-xs">({data.context})</span>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-4 text-zinc-500 text-sm w-full">
                  No stakeholder data available
                </div>
              )}
            </div>
          </Card>

          {/* Leverage Opportunities */}
          <Card title="Cross-Business Leverage" icon={Zap} accentColor="#06b6d4">
            <div className="space-y-1">
              {(strategy?.leverage || []).length > 0 ? (
                strategy.leverage.map((opp, i) => (
                  <LeverageItem key={i} opportunity={opp} />
                ))
              ) : (
                <div className="text-center py-4 text-zinc-500 text-sm">
                  No leverage opportunities available
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-10 text-center text-xs text-zinc-700">
        SuperChase Executive OS v2.4 • Railway: superchase-production.up.railway.app
      </footer>
    </div>
  )
}

export default App
