import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, FileText, Shield, Building2, Clock,
  AlertTriangle, CheckCircle, ExternalLink,
  MapPin, Users, ChevronRight, Filter
} from 'lucide-react'

/**
 * Signal Queue - Trigger Pod Unified View
 * P9 Permit | P16 Compliance | P17 Procurement
 */

const POD_CONFIG = {
  P9: {
    name: 'Permit Intelligence',
    icon: FileText,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30'
  },
  P16: {
    name: 'Compliance Monitor',
    icon: Shield,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30'
  },
  P17: {
    name: 'Procurement Watch',
    icon: Building2,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30'
  }
}

const HEAT_COLORS = {
  hot: { bg: 'bg-red-500/20', text: 'text-red-400', glow: 'shadow-red-500/20' },
  warm: { bg: 'bg-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
  cold: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', glow: '' }
}

const SLA_CONFIG = {
  OK: { label: 'OK', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  BREACH: { label: 'SLA Breach', color: 'text-red-400', bgColor: 'bg-red-500/20' }
}

function SignalCard({ signal, onAction }) {
  const pod = POD_CONFIG[signal.pod] || POD_CONFIG.P9
  const PodIcon = pod.icon
  const heat = HEAT_COLORS[signal.heat] || HEAT_COLORS.cold
  const sla = SLA_CONFIG[signal.sla_status] || SLA_CONFIG.OK

  const ageHours = signal.age_hours || 0
  const isUrgent = ageHours <= 24
  const isBreach = signal.sla_status === 'BREACH'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`glass rounded-xl p-4 ${
        isBreach ? 'border border-red-500/50 shadow-lg shadow-red-500/10' :
        isUrgent ? `border ${pod.borderColor}` : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${pod.bgColor}`}>
            <PodIcon className={`w-4 h-4 ${pod.color}`} />
          </div>
          <div>
            <div className="text-xs text-zinc-500">{pod.name}</div>
            <div className="text-sm font-medium text-white capitalize">
              {signal.type.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* SLA + Heat badges */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${heat.bg} ${heat.text}`}>
            {signal.heat}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${sla.bgColor} ${sla.color}`}>
            {isBreach && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {ageHours}h
          </span>
        </div>
      </div>

      {/* Company + Project */}
      <div className="mb-3">
        <div className="font-medium text-white">
          {signal.company}
          {signal.matched_lead_id && (
            <span className="ml-2 text-xs text-green-400">Matched</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
          <MapPin className="w-3 h-3" />
          {signal.project_address}
        </div>
      </div>

      {/* Project details */}
      <div className="flex items-center gap-4 text-xs text-zinc-400 mb-3">
        <span>{signal.project_type}</span>
        {signal.estimated_sqft && (
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {(signal.estimated_sqft / 1000).toFixed(0)}K sqft
          </span>
        )}
        {signal.tier_estimate && (
          <span className={`px-1.5 py-0.5 rounded ${
            signal.tier_estimate === 'A' ? 'bg-amber-500/20 text-amber-400' :
            signal.tier_estimate === 'B' ? 'bg-blue-500/20 text-blue-400' :
            'bg-zinc-500/20 text-zinc-400'
          }`}>
            Tier {signal.tier_estimate}
          </span>
        )}
      </div>

      {/* Planholders (for procurement) */}
      {signal.planholders && signal.planholders.length > 0 && (
        <div className="mb-3 p-2 bg-zinc-800/50 rounded-lg">
          <div className="text-xs text-zinc-500 mb-1">Planholders ({signal.planholders.length})</div>
          <div className="flex flex-wrap gap-1">
            {signal.planholders.slice(0, 4).map((holder, i) => (
              <span key={i} className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
                {holder}
              </span>
            ))}
            {signal.planholders.length > 4 && (
              <span className="px-2 py-0.5 text-xs text-zinc-500">
                +{signal.planholders.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {signal.notes && (
        <div className="text-xs text-zinc-500 mb-3 italic">
          {signal.notes}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {signal.action_status === 'pending' ? (
          <>
            <button
              onClick={() => onAction?.('outreach', signal)}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-colors"
            >
              <Zap className="w-4 h-4" />
              Reach Out
            </button>
            <button
              onClick={() => onAction?.('dismiss', signal)}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
              title="Dismiss"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>Touched by {signal.assigned_to}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function SignalQueue({ signals: propSignals, onSignalAction }) {
  const [podFilter, setPodFilter] = useState('all')
  const [showTouchedOnly, setShowTouchedOnly] = useState(false)

  // Default demo signals if not provided
  const signals = propSignals || [
    {
      id: 'sig_001',
      pod: 'P9',
      type: 'building_permit',
      source: 'NYC_DOB',
      detected_at: '2026-01-21T08:00:00Z',
      age_hours: 4,
      sla_status: 'OK',
      heat: 'hot',
      company: 'Gensler',
      matched_lead_id: 'lead_001',
      project_address: '200 Park Avenue, New York, NY',
      project_type: 'Interior Alteration',
      estimated_sqft: 85000,
      tier_estimate: 'A',
      action_status: 'pending',
      notes: null
    },
    {
      id: 'sig_002',
      pod: 'P16',
      type: 'll87_filing',
      source: 'LL87',
      detected_at: '2026-01-20T14:00:00Z',
      age_hours: 22,
      sla_status: 'OK',
      heat: 'hot',
      company: 'Smith Group',
      matched_lead_id: 'lead_006',
      project_address: '450 Lexington Ave, New York, NY',
      project_type: 'Energy Audit Required',
      estimated_sqft: 120000,
      tier_estimate: 'A',
      action_status: 'touched',
      assigned_to: 'Owen',
      notes: 'Sent LL87 compliance offering'
    },
    {
      id: 'sig_003',
      pod: 'P9',
      type: 'alteration_permit',
      source: 'BOS_ISD',
      detected_at: '2026-01-19T10:00:00Z',
      age_hours: 50,
      sla_status: 'BREACH',
      heat: 'cold',
      company: 'CBT Architects',
      matched_lead_id: null,
      project_address: '100 Northern Ave, Boston, MA',
      project_type: 'Major Renovation',
      estimated_sqft: 65000,
      tier_estimate: 'A',
      action_status: 'pending',
      notes: 'SLA breach - needs immediate outreach'
    },
    {
      id: 'sig_004',
      pod: 'P17',
      type: 'planholder_list',
      source: 'DASNY',
      detected_at: '2026-01-21T06:00:00Z',
      age_hours: 6,
      sla_status: 'OK',
      heat: 'hot',
      company: 'Multiple',
      matched_lead_id: null,
      project_address: 'SUNY Buffalo - New Academic Building',
      project_type: 'New Construction - Education',
      estimated_sqft: 180000,
      tier_estimate: 'A',
      action_status: 'pending',
      planholders: ['Perkins Eastman', 'HOK', 'Cannon Design', 'Bohlin Cywinski Jackson', 'NBBJ']
    },
    {
      id: 'sig_005',
      pod: 'P16',
      type: 'll11_filing',
      source: 'LL11',
      detected_at: '2026-01-20T09:00:00Z',
      age_hours: 27,
      sla_status: 'OK',
      heat: 'warm',
      company: 'FXCollaborative',
      matched_lead_id: 'lead_008',
      project_address: '22 Cortlandt St, New York, NY',
      project_type: 'Facade Inspection',
      estimated_sqft: 175000,
      tier_estimate: 'A',
      action_status: 'pending',
      notes: 'LL11 filing - facade documentation opportunity'
    }
  ]

  // Filter signals
  const filteredSignals = useMemo(() => {
    let result = [...signals]

    // Pod filter
    if (podFilter !== 'all') {
      result = result.filter(s => s.pod === podFilter)
    }

    // Action status filter
    if (showTouchedOnly) {
      result = result.filter(s => s.action_status === 'touched')
    } else {
      result = result.filter(s => s.action_status === 'pending')
    }

    // Sort by urgency (breaches first, then by age)
    result.sort((a, b) => {
      if (a.sla_status === 'BREACH' && b.sla_status !== 'BREACH') return -1
      if (b.sla_status === 'BREACH' && a.sla_status !== 'BREACH') return 1
      return b.age_hours - a.age_hours
    })

    return result
  }, [signals, podFilter, showTouchedOnly])

  // Stats
  const stats = useMemo(() => ({
    total: signals.length,
    pending: signals.filter(s => s.action_status === 'pending').length,
    breaches: signals.filter(s => s.sla_status === 'BREACH').length,
    byPod: {
      P9: signals.filter(s => s.pod === 'P9').length,
      P16: signals.filter(s => s.pod === 'P16').length,
      P17: signals.filter(s => s.pod === 'P17').length
    }
  }), [signals])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Signal Queue</h3>
            <p className="text-xs text-zinc-500">
              {stats.pending} pending • {stats.breaches > 0 && (
                <span className="text-red-400">{stats.breaches} SLA breaches</span>
              )}
            </p>
          </div>
        </div>

        {/* SLA indicator */}
        <div className="text-xs text-zinc-400">
          48h SLA for first touch
        </div>
      </div>

      {/* Pod filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-zinc-500" />
        {['all', 'P9', 'P16', 'P17'].map(pod => {
          const config = POD_CONFIG[pod]
          return (
            <button
              key={pod}
              onClick={() => setPodFilter(pod)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                podFilter === pod
                  ? config ? `${config.bgColor} ${config.color}` : 'bg-blue-500/20 text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {config && <config.icon className="w-3 h-3" />}
              {pod === 'all' ? 'All' : pod}
              <span className="text-zinc-500 ml-1">
                ({pod === 'all' ? stats.total : stats.byPod[pod] || 0})
              </span>
            </button>
          )
        })}

        <div className="ml-auto">
          <button
            onClick={() => setShowTouchedOnly(!showTouchedOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              showTouchedOnly
                ? 'bg-green-500/20 text-green-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {showTouchedOnly ? 'Show Pending' : 'Show Touched'}
          </button>
        </div>
      </div>

      {/* Signals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredSignals.map(signal => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onAction={onSignalAction}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredSignals.length === 0 && (
        <div className="text-center py-12 glass rounded-xl">
          <Zap className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <div className="text-zinc-500">
            {showTouchedOnly ? 'No touched signals' : 'No pending signals'}
          </div>
        </div>
      )}

      {/* Pod Legend */}
      <div className="glass rounded-lg p-3 flex items-center gap-6 text-xs">
        {Object.entries(POD_CONFIG).map(([pod, config]) => {
          const Icon = config.icon
          return (
            <div key={pod} className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.color}`} />
              <span className="text-zinc-400">{pod}:</span>
              <span className="text-zinc-300">{config.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
