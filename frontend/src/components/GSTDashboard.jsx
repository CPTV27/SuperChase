import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Target,
  TrendingUp,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Shield,
  Award,
  BarChart3,
  Calendar,
  Sparkles
} from 'lucide-react'
import { getClientGST } from '../services/api'

// Brand themes for visual consistency
const BRAND_THEMES = {
  bigmuddy: {
    primary: '#1a365d',
    secondary: '#c6a66d',
    accent: '#8b4513',
    gradient: 'linear-gradient(135deg, #1a365d 0%, #2d4a6f 50%, #8b4513 100%)',
    name: 'Big Muddy Inn'
  },
  tuthill: {
    primary: '#1a1a1a',
    secondary: '#f5f5f5',
    accent: '#c9a227',
    gradient: 'linear-gradient(135deg, #1a1a1a 0%, #333333 50%, #c9a227 100%)',
    name: 'Tuthill Design'
  },
  studioc: {
    primary: '#2d2d2d',
    secondary: '#e8e4dc',
    accent: '#8b0000',
    gradient: 'linear-gradient(135deg, #2d2d2d 0%, #4a4a4a 50%, #8b0000 100%)',
    name: 'Studio C'
  },
  utopia: {
    primary: '#2c1810',
    secondary: '#d4a574',
    accent: '#4a7c59',
    gradient: 'linear-gradient(135deg, #2c1810 0%, #5a3828 50%, #4a7c59 100%)',
    name: 'Utopia Studios'
  },
  cptv: {
    primary: '#0a0a0a',
    secondary: '#00ff88',
    accent: '#ff0066',
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #ff0066 100%)',
    name: 'Chase Pierson TV'
  },
  s2p: {
    primary: '#1e40af',
    secondary: '#60a5fa',
    accent: '#3b82f6',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
    name: 'Scan2Plan'
  }
}

// Governor phase configuration
const PHASE_CONFIG = {
  1: { name: 'Learning', color: '#fbbf24', icon: Sparkles, description: 'Building trust through approvals' },
  2: { name: 'Copilot', color: '#60a5fa', icon: Zap, description: 'Proposing content for quick review' },
  3: { name: 'Autonomous', color: '#34d399', icon: Shield, description: 'Self-publishing with oversight' }
}

// Status badge styles
const STATUS_STYLES = {
  in_progress: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', label: 'In Progress' },
  completed: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', label: 'Completed' },
  pending: { bg: 'rgba(251, 191, 36, 0.2)', text: '#fbbf24', label: 'Pending' },
  active: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', label: 'Active' },
  planned: { bg: 'rgba(107, 114, 128, 0.2)', text: '#9ca3af', label: 'Planned' },
  blocked: { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', label: 'Blocked' }
}

// Progress ring component
function ProgressRing({ progress, size = 80, strokeWidth = 8, color }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

// Governor phase card
function GovernorPhaseCard({ governor, theme }) {
  const phase = PHASE_CONFIG[governor?.phase] || PHASE_CONFIG[1]
  const PhaseIcon = phase.icon

  const metrics = governor?.metrics || {}
  const approvalRate = metrics.approvalRate || 0
  const consecutiveApprovals = metrics.consecutiveApprovals || 0
  const totalApprovals = metrics.totalApprovals || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Phase header with gradient */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: theme.gradient }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <PhaseIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xs text-white/70 uppercase tracking-wide">Governor Phase</div>
            <div className="text-xl font-bold text-white">Phase {governor?.phase}: {phase.name}</div>
          </div>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          {governor?.phaseName || phase.name}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{totalApprovals}</div>
            <div className="text-xs text-zinc-500">Total Approvals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: phase.color }}>{approvalRate}%</div>
            <div className="text-xs text-zinc-500">Approval Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{consecutiveApprovals}</div>
            <div className="text-xs text-zinc-500">Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-400">{metrics.avgEditPercentage || 0}%</div>
            <div className="text-xs text-zinc-500">Avg Edits</div>
          </div>
        </div>

        {/* Phase progress */}
        <div className="p-4 bg-zinc-900/50 rounded-xl">
          <div className="text-xs text-zinc-500 mb-2">Phase progression</div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((p) => (
              <div key={p} className="flex-1">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    background: p <= governor?.phase
                      ? PHASE_CONFIG[p].color
                      : 'rgba(255,255,255,0.1)'
                  }}
                />
                <div className="text-xs text-zinc-600 mt-1 text-center">
                  {PHASE_CONFIG[p].name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions */}
        {governor?.permissions && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(governor.permissions).map(([key, value]) => (
              <span
                key={key}
                className="px-2 py-1 rounded-lg text-xs flex items-center gap-1"
                style={{
                  background: value ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                  color: value ? '#34d399' : '#9ca3af'
                }}
              >
                {value ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {key.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Goal card component
function GoalCard({ goal, theme, isExpanded, onToggle }) {
  const status = STATUS_STYLES[goal.status] || STATUS_STYLES.pending
  const progress = goal.target ? Math.round((goal.current / goal.target) * 100) : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Goal header */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center gap-4 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <ProgressRing progress={progress} size={64} color={theme.accent} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: status.bg, color: status.text }}
            >
              {status.label}
            </span>
            {goal.priority === 'high' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                High Priority
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 truncate">{goal.title}</h3>
          <p className="text-sm text-zinc-500 line-clamp-1">{goal.description}</p>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-white">{goal.current || 0}</div>
          <div className="text-xs text-zinc-500">of {goal.target}</div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-zinc-500"
        >
          <ChevronDown className="w-5 h-5" />
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
            <div className="px-5 pb-5 border-t border-zinc-800/50">
              {/* Milestones */}
              {goal.milestones && goal.milestones.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Milestones
                  </div>
                  <div className="space-y-2">
                    {goal.milestones.map((milestone, i) => {
                      const msStatus = STATUS_STYLES[milestone.status] || STATUS_STYLES.pending
                      return (
                        <div
                          key={milestone.id || i}
                          className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl"
                        >
                          {milestone.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Clock className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="text-sm text-zinc-200">{milestone.title}</div>
                            {milestone.completedAt && (
                              <div className="text-xs text-zinc-500">
                                Completed: {new Date(milestone.completedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-medium" style={{ color: msStatus.text }}>
                            {milestone.target}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Deadline */}
              {goal.deadline && (
                <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
                  <Calendar className="w-4 h-4" />
                  <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Strategy card component
function StrategyCard({ strategy, theme }) {
  const status = STATUS_STYLES[strategy.status] || STATUS_STYLES.pending
  const successRate = strategy.metrics?.successRate || 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4" style={{ color: theme.accent }} />
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: status.bg, color: status.text }}
            >
              {status.label}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-zinc-100">{strategy.title}</h4>
          <p className="text-xs text-zinc-500 mt-1">{strategy.description}</p>
        </div>
        <div className="text-right ml-4">
          <div className="text-lg font-bold" style={{ color: successRate >= 75 ? '#34d399' : '#fbbf24' }}>
            {successRate}%
          </div>
          <div className="text-xs text-zinc-500">success</div>
        </div>
      </div>

      {/* Approach & Channels */}
      <div className="flex flex-wrap gap-1 mt-2">
        {strategy.approach && (
          <span className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400">
            {strategy.approach}
          </span>
        )}
        {strategy.channels?.map((channel, i) => (
          <span key={i} className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400">
            {channel}
          </span>
        ))}
      </div>

      {/* Tactics completed */}
      {strategy.metrics && (
        <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            {strategy.metrics.tacticsCompleted || 0} completed
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-red-400" />
            {strategy.metrics.tacticsFailed || 0} failed
          </span>
        </div>
      )}
    </motion.div>
  )
}

// Tactic item component
function TacticItem({ tactic, theme }) {
  const status = STATUS_STYLES[tactic.status] || STATUS_STYLES.pending

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-lg border-l-2"
      style={{ borderColor: status.text }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: status.bg }}
      >
        <Zap className="w-4 h-4" style={{ color: status.text }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-200 truncate">{tactic.title}</div>
        <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
          <span className="px-1.5 py-0.5 rounded bg-zinc-800">{tactic.channel}</span>
          <span>{tactic.type}</span>
          {tactic.scheduledFor && (
            <>
              <span>|</span>
              <span>{new Date(tactic.scheduledFor).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>
      <span
        className="px-2 py-1 rounded-full text-xs font-medium flex-shrink-0"
        style={{ background: status.bg, color: status.text }}
      >
        {tactic.priority || 'medium'}
      </span>
    </motion.div>
  )
}

// Main GST Dashboard component
export default function GSTDashboard() {
  const { clientId } = useParams()
  const [gst, setGst] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedGoal, setExpandedGoal] = useState(null)

  const theme = BRAND_THEMES[clientId] || BRAND_THEMES.bigmuddy

  useEffect(() => {
    fetchGST()
  }, [clientId])

  async function fetchGST() {
    setLoading(true)
    setError(null)
    try {
      const data = await getClientGST(clientId)
      if (data.error) {
        setError(data.error)
      } else {
        setGst(data)
        // Auto-expand first goal
        if (data.goals?.length > 0) {
          setExpandedGoal(data.goals[0].id)
        }
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

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
                <h1
                  className="text-2xl font-bold"
                  style={{
                    background: theme.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {theme.name}
                </h1>
                <span className="px-2 py-1 rounded-lg text-xs bg-zinc-800 text-zinc-400">
                  @{clientId}
                </span>
              </div>
              <p className="text-sm text-zinc-500 mt-1">Goals, Strategies & Tactics</p>
            </div>
          </div>

          <button
            onClick={fetchGST}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-zinc-700/50 transition-colors touch-target"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm text-zinc-300">Refresh</span>
          </button>
        </div>
      </header>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-400">{error}</span>
        </motion.div>
      )}

      {/* Loading state */}
      {loading && !gst && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin" />
        </div>
      )}

      {/* GST Content */}
      {gst && (
        <div className="space-y-8">
          {/* Governor Phase */}
          <section>
            <GovernorPhaseCard governor={gst.governor} theme={theme} />
          </section>

          {/* Goals */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-5 h-5" style={{ color: theme.accent }} />
              <h2 className="text-lg font-semibold text-zinc-100">Goals</h2>
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400">
                {gst.goals?.length || 0}
              </span>
            </div>
            <div className="space-y-4">
              {gst.goals?.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  theme={theme}
                  isExpanded={expandedGoal === goal.id}
                  onToggle={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                />
              ))}
              {(!gst.goals || gst.goals.length === 0) && (
                <div className="text-center py-8 text-zinc-500">
                  No goals defined yet
                </div>
              )}
            </div>
          </section>

          {/* Strategies */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5" style={{ color: theme.accent }} />
              <h2 className="text-lg font-semibold text-zinc-100">Strategies</h2>
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400">
                {gst.strategies?.length || 0}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gst.strategies?.map((strategy) => (
                <StrategyCard key={strategy.id} strategy={strategy} theme={theme} />
              ))}
              {(!gst.strategies || gst.strategies.length === 0) && (
                <div className="text-center py-8 text-zinc-500 col-span-2">
                  No strategies defined yet
                </div>
              )}
            </div>
          </section>

          {/* Tactics */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5" style={{ color: theme.accent }} />
              <h2 className="text-lg font-semibold text-zinc-100">Pending Tactics</h2>
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400">
                {gst.tactics?.filter(t => t.status === 'pending').length || 0}
              </span>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="space-y-2">
                {gst.tactics?.filter(t => t.status === 'pending').map((tactic) => (
                  <TacticItem key={tactic.id} tactic={tactic} theme={theme} />
                ))}
                {(!gst.tactics || gst.tactics.filter(t => t.status === 'pending').length === 0) && (
                  <div className="text-center py-6 text-zinc-500 text-sm">
                    No pending tactics
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Recent History */}
          {gst.history && gst.history.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-5 h-5" style={{ color: theme.accent }} />
                <h2 className="text-lg font-semibold text-zinc-100">Recent Activity</h2>
              </div>
              <div className="glass rounded-2xl p-4">
                <div className="space-y-3">
                  {gst.history.slice(0, 5).map((event, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="text-zinc-400 flex-shrink-0">
                        {new Date(event.timestamp).toLocaleDateString()}
                      </span>
                      <span className="text-zinc-200">{event.title || event.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
