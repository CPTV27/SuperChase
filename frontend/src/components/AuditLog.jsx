import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  RefreshCw,
  Filter,
  Mail,
  CheckCircle2,
  Archive,
  AlertCircle,
  FileText,
  ChevronDown,
  Clock
} from 'lucide-react'
import { getLogs } from '../services/api'

/**
 * Audit Log Component
 *
 * Displays system audit trail for human oversight.
 * Shows email classifications, task creations, and agent actions.
 */

const CATEGORY_CONFIG = {
  URGENT_CLIENT: { icon: AlertCircle, color: '#ef4444', label: 'Urgent Client' },
  ACTION_REQUIRED: { icon: Mail, color: '#f59e0b', label: 'Action Required' },
  NEWSLETTER: { icon: Archive, color: '#6b7280', label: 'Newsletter' },
  FYI: { icon: FileText, color: '#3b82f6', label: 'FYI' },
  TASK_CREATED: { icon: CheckCircle2, color: '#10b981', label: 'Task Created' },
  AGENT_ACTION: { icon: History, color: '#a855f7', label: 'Agent Action' }
}

function LogEntry({ entry, isExpanded, onToggle }) {
  const config = CATEGORY_CONFIG[entry.category] || { icon: History, color: '#6b7280', label: entry.category }
  const Icon = config.icon

  return (
    <motion.div
      layout
      className="border-b border-zinc-800/50 last:border-0"
    >
      <button
        onClick={onToggle}
        className="w-full py-3 px-4 flex items-start gap-3 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 text-xs font-medium rounded"
              style={{ backgroundColor: `${config.color}20`, color: config.color }}
            >
              {config.label}
            </span>
            {entry.confidence && (
              <span className="text-xs text-zinc-500">
                {Math.round(entry.confidence * 100)}% confidence
              </span>
            )}
          </div>

          <div className="text-sm text-zinc-200 mt-1 truncate">
            {entry.emailSubject || entry.action || entry.message || 'No description'}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
            <Clock className="w-3 h-3" />
            {new Date(entry.timestamp).toLocaleString()}
            {entry.emailSender && (
              <>
                <span>•</span>
                <span className="truncate">{entry.emailSender}</span>
              </>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="mt-2"
        >
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-16">
              <div className="p-3 bg-zinc-900/50 rounded-lg text-sm font-mono text-zinc-400 overflow-x-auto">
                <pre>{JSON.stringify(entry, null, 2)}</pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function AuditLog({ limit = 50 }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    setLoading(true)
    const data = await getLogs(limit)
    setLogs(data.logs || [])
    setLoading(false)
  }

  const categories = [...new Set(logs.map(l => l.category))].filter(Boolean)

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(l => l.category === filter)

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Log</h1>
            <p className="text-sm text-zinc-500">{logs.length} entries</p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          All ({logs.length})
        </button>
        {categories.map(cat => {
          const config = CATEGORY_CONFIG[cat] || { color: '#6b7280', label: cat }
          const count = logs.filter(l => l.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === cat ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {config.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Log List */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : filteredLogs.length > 0 ? (
          filteredLogs.map((entry, i) => (
            <LogEntry
              key={entry.timestamp + i}
              entry={entry}
              isExpanded={expandedId === i}
              onToggle={() => setExpandedId(expandedId === i ? null : i)}
            />
          ))
        ) : (
          <div className="text-center py-12 text-zinc-500">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No audit entries found</p>
          </div>
        )}
      </div>
    </div>
  )
}
