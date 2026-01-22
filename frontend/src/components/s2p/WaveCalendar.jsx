import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Users, Target, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Clock, TrendingUp,
  Zap, MessageSquare, MoreVertical
} from 'lucide-react'

/**
 * ABM Wave Calendar (P6)
 * Sprint-based outreach management
 */

const STATUS_CONFIG = {
  meeting_scheduled: {
    label: 'Meeting',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    icon: Calendar
  },
  engaged: {
    label: 'Engaged',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    icon: MessageSquare
  },
  touched: {
    label: 'Touched',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: Zap
  },
  pending: {
    label: 'Pending',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/20',
    icon: Clock
  },
  killed: {
    label: 'Killed',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    icon: XCircle
  }
}

function WaveHeader({ wave, onPrevious, onNext, hasNext, hasPrevious }) {
  const progress = wave.stats
    ? (wave.stats.meetings_scheduled / (wave.kpi_target?.meetings || 30)) * 100
    : 0

  return (
    <div className="glass rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className={`p-2 rounded-lg transition-colors ${
              hasPrevious ? 'hover:bg-zinc-800 text-zinc-300' : 'text-zinc-600 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div>
            <h3 className="font-semibold text-white">{wave.name}</h3>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
              <Calendar className="w-3 h-3" />
              <span>{wave.start_date} → {wave.end_date}</span>
              <span className={`px-1.5 py-0.5 rounded ${
                wave.status === 'ACTIVE'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-zinc-500/20 text-zinc-400'
              }`}>
                {wave.status}
              </span>
            </div>
          </div>

          <button
            onClick={onNext}
            disabled={!hasNext}
            className={`p-2 rounded-lg transition-colors ${
              hasNext ? 'hover:bg-zinc-800 text-zinc-300' : 'text-zinc-600 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="text-right">
          <div className="text-xs text-zinc-500">{wave.phase}</div>
          <div className="text-sm font-medium text-white">
            {wave.cohort_size} targets
          </div>
        </div>
      </div>

      {/* Wave Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Wave Progress</span>
          <span className="text-white font-medium">
            {wave.stats?.meetings_scheduled || 0} / {wave.kpi_target?.meetings || 30} meetings
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            className={`h-full rounded-full ${
              progress >= 100 ? 'bg-green-500' :
              progress >= 50 ? 'bg-blue-500' :
              'bg-amber-500'
            }`}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3 mt-4">
        {[
          { label: 'Touched', value: wave.stats?.touched || 0, color: 'text-blue-400' },
          { label: 'Engaged', value: wave.stats?.engaged || 0, color: 'text-amber-400' },
          { label: 'Meetings', value: wave.stats?.meetings_scheduled || 0, color: 'text-green-400' },
          { label: 'Killed', value: wave.stats?.killed || 0, color: 'text-red-400' }
        ].map(stat => (
          <div key={stat.label} className="text-center">
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PersonaBeatTimeline({ beats, currentWeek }) {
  return (
    <div className="glass rounded-lg p-4 mb-4">
      <h4 className="text-sm font-medium text-zinc-300 mb-3">Persona Beats</h4>
      <div className="flex items-center gap-2">
        {beats?.map((beat, i) => {
          const isActive = beat.week <= currentWeek
          const isCurrent = beat.week === currentWeek

          return (
            <div
              key={i}
              className={`flex-1 relative ${i < beats.length - 1 ? 'pr-2' : ''}`}
            >
              {/* Connector line */}
              {i < beats.length - 1 && (
                <div className={`absolute top-3 left-1/2 w-full h-0.5 ${
                  isActive ? 'bg-blue-500' : 'bg-zinc-700'
                }`} />
              )}

              {/* Beat node */}
              <div className="relative flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                  isCurrent ? 'bg-blue-500 ring-2 ring-blue-500/30' :
                  isActive ? 'bg-blue-500/50' :
                  'bg-zinc-700'
                }`}>
                  <span className="text-xs text-white font-medium">{beat.beat}</span>
                </div>
                <div className={`text-xs mt-2 text-center ${
                  isCurrent ? 'text-blue-400' : 'text-zinc-500'
                }`}>
                  {beat.topic}
                </div>
                <div className="text-xs text-zinc-600">Week {beat.week}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TargetRow({ target, onKill, onKeep }) {
  const status = STATUS_CONFIG[target.status] || STATUS_CONFIG.pending
  const Icon = status.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-lg ${
        target.status === 'killed' ? 'bg-red-500/5 opacity-60' : 'bg-zinc-800/50'
      }`}
    >
      {/* Status indicator */}
      <div className={`p-2 rounded-lg ${status.bgColor}`}>
        <Icon className={`w-4 h-4 ${status.color}`} />
      </div>

      {/* Company info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white text-sm truncate">
          {target.company}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{target.touches || 0} touches</span>
          {target.last_touch && (
            <span>Last: {new Date(target.last_touch).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className={`px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
        {status.label}
      </span>

      {/* Meeting date if scheduled */}
      {target.meeting_date && (
        <div className="text-xs text-green-400">
          {new Date(target.meeting_date).toLocaleDateString()}
        </div>
      )}

      {/* Actions */}
      {target.status !== 'killed' && target.status !== 'meeting_scheduled' && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onKeep?.(target)}
            className="p-1.5 hover:bg-green-500/20 rounded text-green-400 transition-colors"
            title="Keep"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => onKill?.(target)}
            className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors"
            title="Kill"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

export default function WaveCalendar({ waves: propWaves, onTargetAction }) {
  const [activeWaveIndex, setActiveWaveIndex] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')

  // Default demo waves if not provided
  const waves = propWaves || [
    {
      id: 'wave_q1_01',
      name: 'Q1 2026 - Northeast Whales',
      status: 'ACTIVE',
      phase: 'Week 3',
      start_date: '2026-01-06',
      end_date: '2026-02-16',
      cohort_size: 25,
      tier_focus: 'A',
      kpi_target: { meetings: 30 },
      persona_beats: [
        { beat: 1, topic: 'Variance Control ROI', week: 1 },
        { beat: 2, topic: 'Case Study: The Castle', week: 3 },
        { beat: 3, topic: 'LOD Selection Guide', week: 5 }
      ],
      targets: [
        { lead_id: 'lead_003', company: 'Perkins Eastman', status: 'meeting_scheduled', touches: 3, meeting_date: '2026-01-24T10:00:00Z' },
        { lead_id: 'lead_004', company: 'STUDIOS Architecture', status: 'engaged', touches: 2, last_touch: '2026-01-18T09:00:00Z' },
        { lead_id: 'lead_006', company: 'Smith Group', status: 'engaged', touches: 2, last_touch: '2026-01-19T11:00:00Z' },
        { lead_id: 'lead_001', company: 'Gensler NYC', status: 'touched', touches: 1, last_touch: '2026-01-15T10:00:00Z' },
        { lead_id: 'lead_008', company: 'FXCollaborative', status: 'pending', touches: 0 },
        { lead_id: 'lead_x1', company: 'Killed Target 1', status: 'killed', touches: 1 }
      ],
      stats: {
        total_targets: 25,
        touched: 18,
        engaged: 8,
        meetings_scheduled: 3,
        killed: 4
      }
    },
    {
      id: 'wave_q1_02',
      name: 'Q1 2026 - Healthcare Specialty',
      status: 'PLANNED',
      phase: 'Pre-Launch',
      start_date: '2026-02-17',
      end_date: '2026-03-30',
      cohort_size: 25,
      tier_focus: 'A',
      kpi_target: { meetings: 30 },
      persona_beats: [
        { beat: 1, topic: 'Healthcare MEP Coordination', week: 1 },
        { beat: 2, topic: 'Compliance Documentation', week: 3 },
        { beat: 3, topic: 'The Castle (Renovation)', week: 5 }
      ],
      targets: [],
      stats: {
        total_targets: 0,
        touched: 0,
        engaged: 0,
        meetings_scheduled: 0,
        killed: 0
      }
    }
  ]

  const activeWave = waves[activeWaveIndex]
  const currentWeek = parseInt(activeWave?.phase?.replace(/\D/g, '')) || 1

  // Filter targets
  const filteredTargets = useMemo(() => {
    if (!activeWave?.targets) return []
    if (statusFilter === 'all') return activeWave.targets
    return activeWave.targets.filter(t => t.status === statusFilter)
  }, [activeWave, statusFilter])

  const handleKill = (target) => {
    onTargetAction?.('kill', target, activeWave.id)
  }

  const handleKeep = (target) => {
    onTargetAction?.('keep', target, activeWave.id)
  }

  return (
    <div className="space-y-4">
      {/* Wave Header */}
      <WaveHeader
        wave={activeWave}
        onPrevious={() => setActiveWaveIndex(i => Math.max(0, i - 1))}
        onNext={() => setActiveWaveIndex(i => Math.min(waves.length - 1, i + 1))}
        hasPrevious={activeWaveIndex > 0}
        hasNext={activeWaveIndex < waves.length - 1}
      />

      {/* Persona Beat Timeline */}
      {activeWave?.persona_beats && (
        <PersonaBeatTimeline
          beats={activeWave.persona_beats}
          currentWeek={currentWeek}
        />
      )}

      {/* Targets Section */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            Wave Targets
          </h4>

          {/* Status filter */}
          <div className="flex items-center gap-1">
            {['all', 'pending', 'touched', 'engaged', 'meeting_scheduled', 'killed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {status === 'all' ? 'All' :
                 status === 'meeting_scheduled' ? 'Meetings' :
                 status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Target List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          <AnimatePresence>
            {filteredTargets.map(target => (
              <TargetRow
                key={target.lead_id}
                target={target}
                onKill={handleKill}
                onKeep={handleKeep}
              />
            ))}
          </AnimatePresence>

          {filteredTargets.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No targets match filter
            </div>
          )}
        </div>
      </div>

      {/* Wave KPIs */}
      <div className="glass rounded-lg p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-zinc-500">Reply→Meeting:</span>
            <span className="ml-1 text-green-400 font-medium">
              {((activeWave?.stats?.reply_to_meeting || 0) * 100).toFixed(0)}%
            </span>
            <span className="text-zinc-600 ml-1">/ 18% target</span>
          </div>
          <div>
            <span className="text-zinc-500">Time-to-Meeting:</span>
            <span className="ml-1 text-blue-400 font-medium">
              {activeWave?.stats?.avg_time_to_meeting || '-'} days
            </span>
            <span className="text-zinc-600 ml-1">/ 12 day target</span>
          </div>
        </div>

        <div className="text-zinc-500">
          Kill/Keep: Fridays
        </div>
      </div>
    </div>
  )
}
