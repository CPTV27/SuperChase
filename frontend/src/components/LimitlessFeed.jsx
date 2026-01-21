import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Mic,
  Radio,
  RefreshCw,
  Zap,
  Search,
  Users,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Play,
  FileText,
  Target,
  Sparkles,
  Volume2,
  Wifi,
  WifiOff
} from 'lucide-react'
import { getLimitlessFeed, triggerLimitlessScout } from '../services/api'

// Category colors
const CATEGORY_COLORS = {
  'Infrastructure': '#3b82f6',
  'Marketing': '#f97316',
  'Client Experience': '#10b981',
  'R&D': '#a855f7',
  'default': '#6366f1'
}

// Status badge styles
const STATUS_STYLES = {
  'PENDING_REVIEW': { bg: 'rgba(251, 191, 36, 0.2)', text: '#fbbf24', label: 'Pending Review' },
  'PENDING_CATEGORIZATION': { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', label: 'Needs Categorization' },
  'Complete': { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', label: 'Complete' },
  'MARKETING_OPPORTUNITY': { bg: 'rgba(249, 115, 22, 0.2)', text: '#f97316', label: 'Marketing Opportunity' },
  'SCOUT_FINDING': { bg: 'rgba(168, 85, 247, 0.2)', text: '#a78bfa', label: 'Scout Finding' },
  'default': { bg: 'rgba(107, 114, 128, 0.2)', text: '#9ca3af', label: 'Unknown' }
}

// Scout connection status component
function ScoutStatus({ status }) {
  const isConnected = status?.connected
  const isConfigured = status?.configured

  return (
    <div className="flex items-center gap-3 p-4 glass rounded-xl">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        isConnected ? 'bg-emerald-500/20' : isConfigured ? 'bg-yellow-500/20' : 'bg-red-500/20'
      }`}>
        {isConnected ? (
          <Wifi className="w-5 h-5 text-emerald-400" />
        ) : (
          <WifiOff className="w-5 h-5 text-red-400" />
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-zinc-200">
          {isConnected ? 'Limitless Connected' : isConfigured ? 'API Configured' : 'Not Configured'}
        </div>
        <div className="text-xs text-zinc-500">
          {isConnected
            ? `${status.lifelogsAvailable || 0} lifelogs available`
            : status?.error || 'Set LIMITLESS_API_KEY in .env'}
        </div>
      </div>
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-emerald-500 pulse-glow' : isConfigured ? 'bg-yellow-500' : 'bg-red-500'
      }`} />
    </div>
  )
}

// High-value person card
function PersonCard({ name, data }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
          {name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-zinc-200 truncate">{name}</div>
          <div className="text-xs text-zinc-500">{data.context}</div>
        </div>
        {data.priority === 'high' && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400">
            High
          </span>
        )}
      </div>
      {data.role && (
        <div className="mt-2 text-xs text-zinc-400">{data.role}</div>
      )}
    </motion.div>
  )
}

// Manifest entry card
function ManifestEntry({ entry, isExpanded, onToggle }) {
  const status = STATUS_STYLES[entry.status] || STATUS_STYLES[entry.type] || STATUS_STYLES.default
  const categoryColor = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.default

  const isMarketingTrigger = entry.marketing_trigger || entry.marketingTrigger

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden ${
        isMarketingTrigger
          ? 'border-orange-500/30 bg-orange-500/5'
          : 'border-zinc-800/50 bg-zinc-900/30'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-zinc-800/30 transition-colors"
      >
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${categoryColor}20` }}
        >
          {isMarketingTrigger ? (
            <Sparkles className="w-4 h-4" style={{ color: categoryColor }} />
          ) : entry.type === 'IDEA' ? (
            <Lightbulb className="w-4 h-4" style={{ color: categoryColor }} />
          ) : (
            <Radio className="w-4 h-4" style={{ color: categoryColor }} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: status.bg, color: status.text }}
            >
              {status.label}
            </span>
            {entry.agent && (
              <span className="text-xs text-zinc-500">{entry.agent}</span>
            )}
          </div>
          <p className="text-sm text-zinc-200 line-clamp-2">
            {entry.finding || entry.title || entry.summary || 'Untitled entry'}
          </p>
          <div className="text-xs text-zinc-600 mt-1">
            {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unknown time'}
          </div>
        </div>

        {/* Expand indicator */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-zinc-500 flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-zinc-800/50 pt-3">
              {/* Insights */}
              {entry.insights && entry.insights.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Insights</div>
                  <ul className="space-y-1">
                    {entry.insights.map((insight, i) => (
                      <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                        <Zap className="w-3 h-3 text-yellow-400 mt-1 flex-shrink-0" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {entry.actionItems && entry.actionItems.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Action Items</div>
                  <ul className="space-y-1">
                    {entry.actionItems.map((action, i) => (
                      <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-1 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Client mentions */}
              {entry.clientMentions && entry.clientMentions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.clientMentions.map((client, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                      {client}
                    </span>
                  ))}
                </div>
              )}

              {/* Trace ID */}
              {entry.traceId && (
                <div className="mt-3 text-xs text-zinc-600">
                  Trace: {entry.traceId}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Friction item
function FrictionItem({ friction }) {
  return (
    <div className="p-3 bg-zinc-900/50 rounded-xl border-l-2 border-yellow-500">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-sm text-zinc-200 font-medium">{friction.area}</div>
          <div className="text-xs text-zinc-500 mt-1">{friction.symptom}</div>
          {friction.impact && (
            <div className="text-xs text-zinc-600 mt-1 italic">{friction.impact}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// Recurring topic badge
function TopicBadge({ topic, occurrences }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 rounded-xl"
    >
      <TrendingUp className="w-4 h-4 text-purple-400" />
      <span className="text-sm text-zinc-300">{topic}</span>
      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
        {occurrences}x
      </span>
    </motion.div>
  )
}

// Immediate action item
function ActionItem({ action }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded-xl">
      <Target className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
      <span className="text-sm text-zinc-300">{action}</span>
    </div>
  )
}

// Main Limitless Feed component
export default function LimitlessFeed() {
  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedEntry, setExpandedEntry] = useState(null)
  const [activeTab, setActiveTab] = useState('sparks')
  const [scoutRunning, setScoutRunning] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchFeed()
  }, [])

  async function fetchFeed() {
    setLoading(true)
    setError(null)
    try {
      const data = await getLimitlessFeed()
      if (data.error) {
        setError(data.error)
      } else {
        setFeed(data)
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleRunScout() {
    setScoutRunning(true)
    try {
      const result = await triggerLimitlessScout()
      if (result.success) {
        // Refresh feed after scout completes
        await fetchFeed()
      }
    } catch (err) {
      console.error('Scout failed:', err)
    }
    setScoutRunning(false)
  }

  // Filter manifest entries by search
  const filteredEntries = feed?.manifest?.filter(entry => {
    if (!searchQuery) return true
    const text = `${entry.finding || ''} ${entry.title || ''} ${entry.agent || ''}`.toLowerCase()
    return text.includes(searchQuery.toLowerCase())
  }) || []

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors touch-target"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                  Limitless Feed
                </h1>
                <Mic className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-sm text-zinc-500 mt-1">Voice sparks from your Pendant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunScout}
              disabled={scoutRunning || !feed?.scoutStatus?.configured}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-colors touch-target"
            >
              {scoutRunning ? (
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Play className="w-4 h-4 text-white" />
              )}
              <span className="text-sm text-white font-medium">
                {scoutRunning ? 'Running...' : 'Run Scout'}
              </span>
            </button>

            <button
              onClick={fetchFeed}
              disabled={loading}
              className="p-2 rounded-xl glass hover:bg-zinc-700/50 transition-colors touch-target"
            >
              <RefreshCw className={`w-5 h-5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-400">{error}</span>
        </motion.div>
      )}

      {/* Loading state */}
      {loading && !feed && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin" />
        </div>
      )}

      {/* Main content */}
      {feed && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Scout status and quick info */}
          <div className="space-y-6">
            {/* Scout Status */}
            <ScoutStatus status={feed.scoutStatus} />

            {/* Context Summary */}
            {feed.context?.meta && (
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-zinc-100">Context Summary</h3>
                </div>
                <div className="text-sm text-zinc-400 space-y-2">
                  <div>Period: {feed.context.meta.period}</div>
                  <div>Updated: {new Date(feed.context.meta.ingestedAt).toLocaleDateString()}</div>
                </div>
              </div>
            )}

            {/* High-Value People */}
            {feed.context?.highValuePeople && Object.keys(feed.context.highValuePeople).length > 0 && (
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-zinc-100">Key People</h3>
                </div>
                <div className="space-y-2">
                  {Object.entries(feed.context.highValuePeople).slice(0, 5).map(([name, data]) => (
                    <PersonCard key={name} name={name} data={data} />
                  ))}
                </div>
              </div>
            )}

            {/* Recurring Topics */}
            {feed.context?.recurringTopics && feed.context.recurringTopics.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold text-zinc-100">Trending Topics</h3>
                </div>
                <div className="space-y-2">
                  {feed.context.recurringTopics.slice(0, 5).map((item, i) => (
                    <TopicBadge key={i} topic={item.topic} occurrences={item.occurrences} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center column - Voice Sparks / Manifest */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2">
              {[
                { key: 'sparks', label: 'Voice Sparks', icon: Radio },
                { key: 'friction', label: 'Friction Log', icon: AlertTriangle },
                { key: 'actions', label: 'Actions', icon: Target }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search (for sparks tab) */}
            {activeTab === 'sparks' && (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search voice sparks..."
                  className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50"
                />
              </div>
            )}

            {/* Voice Sparks Tab */}
            {activeTab === 'sparks' && (
              <div className="space-y-3">
                {filteredEntries.length > 0 ? (
                  filteredEntries.map((entry, i) => (
                    <ManifestEntry
                      key={entry.id || entry.traceId || i}
                      entry={entry}
                      isExpanded={expandedEntry === (entry.id || entry.traceId || i)}
                      onToggle={() => setExpandedEntry(
                        expandedEntry === (entry.id || entry.traceId || i)
                          ? null
                          : (entry.id || entry.traceId || i)
                      )}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    <Radio className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No voice sparks yet</p>
                    <p className="text-sm mt-2">Run the Scout to process your Pendant lifelogs</p>
                  </div>
                )}
              </div>
            )}

            {/* Friction Log Tab */}
            {activeTab === 'friction' && (
              <div className="space-y-3">
                {feed.context?.frictionLog && feed.context.frictionLog.length > 0 ? (
                  feed.context.frictionLog.map((friction, i) => (
                    <FrictionItem key={i} friction={friction} />
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No friction points logged</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions Tab */}
            {activeTab === 'actions' && (
              <div className="space-y-3">
                {feed.context?.immediateActions && feed.context.immediateActions.length > 0 ? (
                  feed.context.immediateActions.map((action, i) => (
                    <ActionItem key={i} action={action} />
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No immediate actions</p>
                  </div>
                )}
              </div>
            )}

            {/* Marketing triggers summary */}
            {feed.manifest && feed.manifest.some(e => e.marketing_trigger || e.marketingTrigger) && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                  <span className="text-sm font-medium text-orange-400">Marketing Opportunities</span>
                </div>
                <p className="text-xs text-zinc-400">
                  {feed.manifest.filter(e => e.marketing_trigger || e.marketingTrigger).length} voice sparks
                  have triggered marketing briefs. Check the Marketing Queue to draft content.
                </p>
                <Link
                  to="/demo"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-orange-400 hover:text-orange-300"
                >
                  View Marketing Queue <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
