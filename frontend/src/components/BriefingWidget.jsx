import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  Sun,
  Moon,
  Sunrise,
  RefreshCw,
  Volume2,
  AlertCircle,
  CheckCircle2,
  ListTodo
} from 'lucide-react'
import { getBriefing, triggerBriefing } from '../services/api'

/**
 * Briefing Widget Component
 *
 * Prominent display of George's daily briefing.
 * Shows at the top of the dashboard.
 */

function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 12) return { label: 'Good morning', icon: Sunrise, gradient: 'from-amber-500 to-orange-600' }
  if (hour < 17) return { label: 'Good afternoon', icon: Sun, gradient: 'from-blue-500 to-cyan-600' }
  return { label: 'Good evening', icon: Moon, gradient: 'from-purple-500 to-indigo-600' }
}

export default function BriefingWidget() {
  const [briefing, setBriefing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const timeOfDay = getTimeOfDay()
  const TimeIcon = timeOfDay.icon

  useEffect(() => {
    fetchBriefing()
  }, [])

  async function fetchBriefing() {
    setLoading(true)
    const data = await getBriefing()
    setBriefing(data)
    setLoading(false)
  }

  async function handleRegenerate() {
    setRegenerating(true)
    const result = await triggerBriefing()
    if (result.success) {
      setBriefing({
        briefing: result.briefing,
        stats: result.stats,
        generatedAt: result.generatedAt
      })
    }
    setRegenerating(false)
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="h-4 bg-zinc-800 rounded w-full mb-2" />
        <div className="h-4 bg-zinc-800 rounded w-2/3" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${timeOfDay.gradient} p-6`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <TimeIcon className="w-4 h-4" />
                {timeOfDay.label}, Chase
              </div>
              <h2 className="text-xl font-bold text-white mt-1">George's Briefing</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Regenerate briefing"
            >
              <RefreshCw className={`w-4 h-4 text-white ${regenerating ? 'animate-spin' : ''}`} />
            </button>
            <button
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Listen to briefing"
            >
              <Volume2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Briefing Content */}
      <div className="p-6">
        <p className="text-zinc-200 text-lg leading-relaxed">
          {briefing?.briefing || 'No briefing available. Click refresh to generate one.'}
        </p>

        {/* Stats */}
        {briefing?.stats && (
          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                briefing.stats.urgentCount > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'
              }`}>
                {briefing.stats.urgentCount > 0 ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div>
                <div className="text-lg font-bold text-white">{briefing.stats.urgentCount}</div>
                <div className="text-xs text-zinc-500">Urgent</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <ListTodo className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{briefing.stats.taskCount}</div>
                <div className="text-xs text-zinc-500">Tasks</div>
              </div>
            </div>

            {briefing.stats.overdueCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{briefing.stats.overdueCount}</div>
                  <div className="text-xs text-zinc-500">Overdue</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        {briefing?.generatedAt && (
          <div className="mt-4 text-xs text-zinc-600">
            Generated {new Date(briefing.generatedAt).toLocaleString()}
          </div>
        )}
      </div>
    </motion.div>
  )
}
