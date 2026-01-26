import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  CheckCircle2,
  FileCheck,
  Mic,
  Target,
  ChevronRight,
  ThumbsUp,
  Clock,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Crosshair
} from 'lucide-react'
import { getTodayFocus } from '../services/api'

/**
 * Today's Focus Widget
 *
 * Unified action items view for the dashboard:
 * - Pending reviews (from Agency Review)
 * - Voice sparks (from Limitless)
 * - Tasks due today/overdue (from Asana)
 * - Whale alerts (from Scout)
 */
export default function TodaysFocus() {
  const [focus, setFocus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchFocus()
    // Refresh every 60 seconds
    const interval = setInterval(fetchFocus, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchFocus() {
    try {
      const data = await getTodayFocus()
      if (data.error) {
        setError(data.error)
      } else {
        setFocus(data)
        setError(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Category configurations
  const categories = [
    {
      key: 'reviews',
      label: 'Reviews',
      icon: FileCheck,
      color: '#eab308',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      textColor: 'text-yellow-400',
      emptyText: 'All content approved'
    },
    {
      key: 'sparks',
      label: 'Voice Sparks',
      icon: Mic,
      color: '#a855f7',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      textColor: 'text-purple-400',
      emptyText: 'No pending sparks'
    },
    {
      key: 'tasks',
      label: 'Due Today',
      icon: Clock,
      color: '#ef4444',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      textColor: 'text-red-400',
      emptyText: 'No tasks due'
    },
    {
      key: 'whales',
      label: 'Whale Alerts',
      icon: Target,
      color: '#3b82f6',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400',
      emptyText: 'No whale alerts'
    }
  ]

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center gap-3">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-zinc-100">Today's Focus</h3>
        </div>
        <div className="p-5 flex items-center justify-center h-48">
          <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center gap-3">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-zinc-100">Today's Focus</h3>
        </div>
        <div className="p-5 text-center text-zinc-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
          <p className="text-sm">{error}</p>
        </div>
      </motion.div>
    )
  }

  const totalActions = focus?.totalActions || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-zinc-100">Today's Focus</h3>
        </div>
        {totalActions > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-medium"
          >
            {totalActions} action{totalActions !== 1 ? 's' : ''}
          </motion.span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Summary Badges */}
        <div className="grid grid-cols-4 gap-2">
          {categories.map((cat) => {
            const count = focus?.[cat.key]?.count || 0
            const Icon = cat.icon
            return (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex flex-col items-center p-3 rounded-xl ${cat.bgColor} border ${cat.borderColor}`}
              >
                <Icon className={`w-4 h-4 ${cat.textColor} mb-1`} />
                <span className={`text-lg font-bold ${cat.textColor}`}>{count}</span>
                <span className="text-xs text-zinc-500 text-center">{cat.label}</span>
              </motion.div>
            )
          })}
        </div>

        {/* Action Items */}
        {totalActions === 0 ? (
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
            <p className="text-zinc-400 font-medium">All caught up!</p>
            <p className="text-zinc-600 text-sm mt-1">No pending actions</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {categories.map((cat) => {
              const items = focus?.[cat.key]?.items || []
              if (items.length === 0) return null

              const Icon = cat.icon

              return (
                <div key={cat.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-3.5 h-3.5 ${cat.textColor}`} />
                    <span className="text-xs text-zinc-500 uppercase tracking-wide">
                      {cat.label}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <ActionItem
                        key={item.id || idx}
                        item={item}
                        category={cat}
                        index={idx}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Capacity Gauge - Shows Feb/March gap for whale hunting */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-slate-800/30 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Q1 Capacity</span>
            <span className="text-sm font-bold text-blue-400">80% Booked</span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
              style={{ width: '80%' }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-emerald-400">Jan: 95%</span>
            <span className="text-yellow-400">Feb: 80%</span>
            <span className="text-orange-400">Mar: 65%</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400 flex items-center gap-2">
            <Target className="w-3 h-3 text-blue-400" />
            <span>20% capacity gap = <span className="text-blue-400 font-medium">Whale Hunting Mode</span></span>
          </div>
        </div>

        {/* Refresh indicator */}
        <div className="text-xs text-zinc-600 text-center pt-2 border-t border-zinc-800/30">
          Auto-refreshes every minute
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Individual action item with one-click handler
 */
function ActionItem({ item, category, index }) {
  const [actioned, setActioned] = useState(false)

  function handleAction(e) {
    e.preventDefault()
    // Navigate to action URL
    if (item.actionUrl) {
      window.location.href = item.actionUrl
    }
    setActioned(true)
  }

  const actionLabels = {
    approve: 'Review',
    process: 'Process',
    complete: 'View',
    pursue: 'Pursue'
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-3 p-3 rounded-xl ${category.bgColor} border ${category.borderColor} group hover:border-zinc-600 transition-colors`}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-200 font-medium truncate">
          {item.title}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
          {item.client && (
            <span className="px-1.5 py-0.5 rounded bg-zinc-800">{item.client}</span>
          )}
          {item.type && <span>{item.type}</span>}
          {item.project && <span>{item.project}</span>}
          {item.overdue && (
            <span className="text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Overdue
            </span>
          )}
          {item.sqft && (
            <span>{(item.sqft / 1000).toFixed(0)}k sqft</span>
          )}
          {item.value && (
            <span className="text-emerald-400">${(item.value / 1000).toFixed(0)}k</span>
          )}
          {item.score && (
            <span className="text-blue-400">Score: {item.score}</span>
          )}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleAction}
        disabled={actioned}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all touch-target ${
          actioned
            ? 'bg-emerald-500/20 text-emerald-400'
            : `${category.bgColor} ${category.textColor} hover:bg-zinc-700/50`
        }`}
      >
        {actioned ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Done
          </>
        ) : (
          <>
            {actionLabels[item.action] || 'View'}
            <ChevronRight className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
          </>
        )}
      </button>
    </motion.div>
  )
}
