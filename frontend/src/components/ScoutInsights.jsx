import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Brain,
  TrendingUp,
  Users,
  Building2,
  Clock,
  ChevronRight,
  RefreshCw,
  Filter,
  Lightbulb,
  Target
} from 'lucide-react'

/**
 * Scout Insights Page
 *
 * AI-extracted patterns and insights from Limitless lifelogs,
 * marketing analysis, and cross-business intelligence.
 */

// Sample insights data
const SAMPLE_INSIGHTS = [
  {
    id: 1,
    type: 'pattern',
    title: 'S2P Pipeline Acceleration',
    description: 'Mentions of "existing conditions" and "as-builts" increased 40% in recent conversations. Strong demand signal for Q1.',
    confidence: 0.92,
    source: 'Limitless Scout',
    businesses: ['s2p'],
    actionable: true,
    action: 'Generate prospectus batch for Northeast leads',
    timestamp: '2 hours ago'
  },
  {
    id: 2,
    type: 'opportunity',
    title: 'Big Muddy Blues Content',
    description: 'Historical blues content generates 3.2x engagement vs generic hospitality posts. Silver Street narrative resonates.',
    confidence: 0.89,
    source: 'Marketing Analytics',
    businesses: ['bigmuddy'],
    actionable: true,
    action: 'Create blues heritage content series',
    timestamp: '4 hours ago'
  },
  {
    id: 3,
    type: 'connection',
    title: 'Studio C × S2P Synergy',
    description: 'Utopia Studios mentioned need for facility documentation. Cross-sell opportunity for scan-to-BIM services.',
    confidence: 0.78,
    source: 'Conversation Analysis',
    businesses: ['studioc', 's2p'],
    actionable: true,
    action: 'Draft warm intro for scan services',
    timestamp: '1 day ago'
  },
  {
    id: 4,
    type: 'trend',
    title: 'AEC Market Timing',
    description: 'Q1 traditionally sees 30% increase in renovation projects. Position S2P for "existing conditions season".',
    confidence: 0.85,
    source: 'Market Intelligence',
    businesses: ['s2p'],
    actionable: false,
    timestamp: '2 days ago'
  },
  {
    id: 5,
    type: 'pattern',
    title: 'CPTV Engagement Hours',
    description: 'Content posted between 7-9 PM ET gets 2.1x more engagement. Optimal posting window identified.',
    confidence: 0.91,
    source: 'Social Analytics',
    businesses: ['cptv'],
    actionable: true,
    action: 'Schedule posts for evening window',
    timestamp: '3 days ago'
  }
]

const INSIGHT_TYPES = {
  pattern: { icon: TrendingUp, color: '#a855f7', label: 'Pattern' },
  opportunity: { icon: Lightbulb, color: '#f59e0b', label: 'Opportunity' },
  connection: { icon: Users, color: '#3b82f6', label: 'Connection' },
  trend: { icon: TrendingUp, color: '#10b981', label: 'Trend' }
}

const BUSINESS_COLORS = {
  s2p: '#3b82f6',
  bigmuddy: '#8b4513',
  studioc: '#8b0000',
  tuthill: '#c9a227',
  utopia: '#4a7c59',
  cptv: '#ff0066'
}

function InsightCard({ insight, onAction }) {
  const [expanded, setExpanded] = useState(false)
  const typeConfig = INSIGHT_TYPES[insight.type]
  const Icon = typeConfig.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl overflow-hidden"
    >
      <div
        className="p-4 cursor-pointer hover:bg-zinc-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${typeConfig.color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: typeConfig.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="px-2 py-0.5 text-xs font-medium rounded-md"
                style={{ backgroundColor: `${typeConfig.color}20`, color: typeConfig.color }}
              >
                {typeConfig.label}
              </span>
              <span className="text-xs text-zinc-500">{Math.round(insight.confidence * 100)}% confidence</span>
            </div>

            <h3 className="font-medium text-zinc-100">{insight.title}</h3>

            <div className="flex items-center gap-3 mt-2">
              <div className="flex gap-1">
                {insight.businesses.map(biz => (
                  <div
                    key={biz}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: BUSINESS_COLORS[biz] }}
                    title={biz}
                  />
                ))}
              </div>
              <span className="text-xs text-zinc-500">{insight.source}</span>
              <span className="text-xs text-zinc-600">•</span>
              <Clock className="w-3 h-3 text-zinc-600" />
              <span className="text-xs text-zinc-500">{insight.timestamp}</span>
            </div>
          </div>

          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-5 h-5 text-zinc-500" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="p-4 bg-zinc-900/50 rounded-xl border-l-2" style={{ borderLeftColor: typeConfig.color }}>
                <p className="text-sm text-zinc-300 leading-relaxed">{insight.description}</p>

                {insight.actionable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAction?.(insight)
                    }}
                    className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-colors"
                  >
                    <Target className="w-4 h-4" />
                    {insight.action}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ScoutInsights() {
  const [insights, setInsights] = useState(SAMPLE_INSIGHTS)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  const runScout = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 2000))
    setLoading(false)
  }

  const filteredInsights = filter === 'all'
    ? insights
    : insights.filter(i => i.type === filter)

  const stats = {
    total: insights.length,
    actionable: insights.filter(i => i.actionable).length,
    avgConfidence: Math.round((insights.reduce((a, i) => a + i.confidence, 0) / insights.length) * 100)
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Scout Insights</h1>
            <p className="text-sm text-zinc-500">AI-extracted patterns and opportunities</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runScout}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-xl text-cyan-400 font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Run Scout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-zinc-500">Total Insights</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.actionable}</div>
          <div className="text-xs text-zinc-500">Actionable</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.avgConfidence}%</div>
          <div className="text-xs text-zinc-500">Avg Confidence</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        {['all', 'pattern', 'opportunity', 'connection', 'trend'].map(type => {
          const config = type === 'all' ? { color: '#a1a1aa', label: 'All' } : INSIGHT_TYPES[type]
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === type
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/50'
              }`}
            >
              {config.label}
            </button>
          )
        })}
      </div>

      {/* Insights list */}
      <div className="space-y-4">
        {filteredInsights.map(insight => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onAction={(i) => console.log('Action:', i)}
          />
        ))}

        {filteredInsights.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-500">No insights in this category</p>
          </div>
        )}
      </div>
    </div>
  )
}
