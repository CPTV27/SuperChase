import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
  RefreshCw,
  Mail,
  Archive
} from 'lucide-react'
import { getLogs } from '../services/api'

/**
 * Agency Pulse Card
 *
 * Shows George's AI reasoning and recent decisions.
 * Wired to real audit log data from the backend.
 */

// Reasoning type icons mapped from audit categories
const REASONING_ICONS = {
  insight: Sparkles,
  decision: CheckCircle2,
  warning: AlertCircle,
  opportunity: TrendingUp,
  action: Zap,
  email: Mail,
  task: CheckCircle2,
  newsletter: Archive
}

// Map audit log categories to reasoning types
function mapCategoryToType(category) {
  const mapping = {
    'URGENT_CLIENT': 'warning',
    'ACTION_REQUIRED': 'action',
    'NEWSLETTER': 'newsletter',
    'FYI': 'insight',
    'TASK_CREATED': 'decision',
    'AGENT_ACTION': 'action'
  }
  return mapping[category] || 'insight'
}

// Format timestamp relative to now
function formatTimestamp(isoDate) {
  if (!isoDate) return 'recently'
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

// Transform audit log entry to reasoning format
function transformLogToReasoning(log, index) {
  const type = mapCategoryToType(log.category)
  return {
    id: index,
    type,
    title: log.emailSubject || log.action || log.message || 'System activity',
    reasoning: log.reasoning || log.message || `Processed ${log.category?.toLowerCase() || 'item'}: ${log.emailSubject || log.action || 'Activity logged'}`,
    confidence: log.confidence || 0.85,
    timestamp: formatTimestamp(log.timestamp),
    source: log.source || (log.category === 'AGENT_ACTION' ? 'George' : 'System')
  }
}

function ReasoningEntry({ entry, isExpanded, onToggle }) {
  const Icon = REASONING_ICONS[entry.type] || Sparkles

  const typeColors = {
    insight: '#a855f7',
    decision: '#10b981',
    warning: '#f59e0b',
    opportunity: '#3b82f6',
    action: '#06b6d4'
  }

  const color = typeColors[entry.type] || '#a855f7'

  return (
    <motion.div
      layout
      className="border-b border-zinc-800/50 last:border-0"
    >
      <button
        onClick={onToggle}
        className="w-full py-3 flex items-start gap-3 text-left hover:bg-zinc-800/20 px-2 -mx-2 rounded-lg transition-colors"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200 truncate">{entry.title}</span>
            <span
              className="px-1.5 py-0.5 text-xs rounded-md"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {Math.round(entry.confidence * 100)}%
            </span>
          </div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
            <span>{entry.source}</span>
            <span>•</span>
            <Clock className="w-3 h-3" />
            <span>{entry.timestamp}</span>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="mt-1"
        >
          <ChevronRight className="w-4 h-4 text-zinc-500" />
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
            <div className="pb-3 pl-11 pr-2">
              <div
                className="p-3 rounded-xl text-sm text-zinc-300 leading-relaxed"
                style={{ backgroundColor: `${color}10`, borderLeft: `3px solid ${color}` }}
              >
                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                  <Brain className="w-3 h-3" />
                  <span>George's reasoning</span>
                </div>
                {entry.reasoning}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function AgencyPulse({ onRefresh }) {
  const [reasoning, setReasoning] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Fetch real audit log data from API
  const fetchReasoning = async () => {
    setLoading(true)
    try {
      const data = await getLogs(10)
      const logs = data.logs || []
      // Transform audit logs to reasoning format
      const transformed = logs.map(transformLogToReasoning)
      setReasoning(transformed)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch reasoning:', error)
    }
    setLoading(false)
  }

  // Fetch on mount
  useEffect(() => {
    fetchReasoning()
  }, [])

  // Summary stats
  const stats = {
    insights: reasoning.filter(r => r.type === 'insight').length,
    decisions: reasoning.filter(r => r.type === 'decision').length,
    opportunities: reasoning.filter(r => r.type === 'opportunity').length
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100">Agency Pulse</h3>
            <p className="text-xs text-zinc-500">George's reasoning log</p>
          </div>
        </div>

        <button
          onClick={fetchReasoning}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="px-5 py-3 border-b border-zinc-800/50 flex gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-zinc-400">{stats.insights} insights</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-zinc-400">{stats.decisions} decisions</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-zinc-400">{stats.opportunities} opportunities</span>
        </div>
      </div>

      {/* Reasoning List */}
      <div className="p-5 space-y-1 max-h-80 overflow-y-auto">
        {reasoning.map(entry => (
          <ReasoningEntry
            key={entry.id}
            entry={entry}
            isExpanded={expandedId === entry.id}
            onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
          />
        ))}

        {reasoning.length === 0 && (
          <div className="text-center py-8 text-zinc-500">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No recent reasoning activity</p>
            <p className="text-xs mt-1">George is standing by</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-600">
        <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          George online
        </span>
      </div>
    </motion.div>
  )
}
