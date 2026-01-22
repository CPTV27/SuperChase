import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, FileText, CheckCircle, AlertTriangle,
  DollarSign, Shield, XCircle, ChevronRight,
  Phone, Mail, Send
} from 'lucide-react'

/**
 * Pipeline View - Simplified 3-Stage Kanban
 * Stages: QUALIFIED MEETING → PROPOSAL ISSUED → CLOSED-WON
 * GM% prominent on every card
 */

const STAGES = [
  {
    id: 'Meeting',
    label: 'QUALIFIED MEETING',
    icon: Users,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  {
    id: 'Proposal Issued',
    label: 'PROPOSAL ISSUED',
    icon: FileText,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    gmGate: true
  },
  {
    id: 'Closed Won',
    label: 'CLOSED-WON',
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  }
]

// Also include Opportunity stage in the Meeting column
const STAGE_MAPPING = {
  'Lead': 'Meeting',
  'Meeting': 'Meeting',
  'Opportunity': 'Meeting',
  'Proposal Issued': 'Proposal Issued',
  'Closed Won': 'Closed Won'
}

function DealCard({ deal, onAction }) {
  const isVetoed = deal.gm_status === 'VETO'
  const gmPercent = deal.gm_percent ? (deal.gm_percent * 100).toFixed(0) : null

  // Calculate days in stage
  const daysInStage = deal.updated_at
    ? Math.floor((new Date() - new Date(deal.updated_at)) / (1000 * 60 * 60 * 24))
    : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-zinc-800/70 rounded-xl p-4 border transition-all hover:border-zinc-600 ${
        isVetoed ? 'border-red-500/50' : 'border-zinc-700/50'
      }`}
    >
      {/* Company + Value */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">
            {deal.firmName || deal.company}
          </div>
          {deal.project_name && (
            <div className="text-xs text-zinc-500 truncate">{deal.project_name}</div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-white">
            ${(deal.value / 1000).toFixed(0)}K
          </div>
          <div className={`text-sm font-semibold ${
            isVetoed ? 'text-red-400' :
            gmPercent >= 45 ? 'text-green-400' :
            gmPercent >= 40 ? 'text-amber-400' :
            'text-zinc-400'
          }`}>
            {gmPercent}% GM
          </div>
        </div>
      </div>

      {/* VETO Badge */}
      {isVetoed && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
          <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
            <XCircle className="w-4 h-4" />
            BELOW GM FLOOR
          </div>
          {deal.repriceOptions && (
            <div className="text-xs text-red-300/80 mt-1">
              Reprice to ${(deal.repriceOptions.option1?.value / 1000).toFixed(0)}K for 40% GM
            </div>
          )}
        </div>
      )}

      {/* Status info */}
      {!isVetoed && daysInStage !== null && daysInStage > 0 && (
        <div className="text-xs text-zinc-500 mb-3">
          {deal.stage === 'Closed Won' ? `Won ${daysInStage} days ago` : `Pending ${daysInStage} days`}
        </div>
      )}

      {/* Vendor status if applicable */}
      {deal.scopeAudit && !deal.scope_audit_complete && (
        <div className="text-xs text-amber-400 mb-3 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Scope audit incomplete
        </div>
      )}

      {/* Quick Action Button */}
      {deal.stage !== 'Closed Won' && (
        <button
          onClick={() => onAction?.(isVetoed ? 'reprice' : 'followUp', deal)}
          className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            isVetoed
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
              : 'bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300'
          }`}
        >
          {isVetoed ? (
            <>Reprice</>
          ) : deal.stage === 'Proposal Issued' ? (
            <>
              <Phone className="w-4 h-4" />
              Follow Up
            </>
          ) : (
            <>
              <ChevronRight className="w-4 h-4" />
              View
            </>
          )}
        </button>
      )}

      {/* Won date */}
      {deal.stage === 'Closed Won' && deal.closed_date && (
        <div className="text-xs text-green-400 text-center">
          {new Date(deal.closed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}
    </motion.div>
  )
}

function StageColumn({ stage, deals, onAction }) {
  const Icon = stage.icon
  const stageDeals = deals.filter(d => STAGE_MAPPING[d.stage] === stage.id)
  const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const vetoedCount = stageDeals.filter(d => d.gm_status === 'VETO').length

  return (
    <div className="flex-1 min-w-[280px]">
      {/* Stage Header */}
      <div className={`${stage.bgColor} rounded-t-xl p-4 border-b ${stage.borderColor}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${stage.color}`} />
            <span className="font-bold text-white">{stage.label}</span>
          </div>
          {stage.gmGate && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              40% GM
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-white">
            ${(stageValue / 1000).toFixed(0)}K
          </span>
          <span className="text-sm text-zinc-400">
            {stageDeals.length} deal{stageDeals.length !== 1 ? 's' : ''}
          </span>
        </div>
        {vetoedCount > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
            <XCircle className="w-3 h-3" />
            {vetoedCount} blocked
          </div>
        )}
      </div>

      {/* Deals */}
      <div className="bg-zinc-900/50 rounded-b-xl p-3 min-h-[300px] space-y-3">
        <AnimatePresence>
          {stageDeals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              onAction={onAction}
            />
          ))}
        </AnimatePresence>

        {stageDeals.length === 0 && (
          <div className="text-center py-12 text-zinc-600 text-sm">
            No deals in this stage
          </div>
        )}
      </div>
    </div>
  )
}

export default function PipelineView({ deals: propDeals, onSelectDeal, onAdvanceDeal }) {
  // Use provided deals or empty array
  const deals = propDeals || []

  // Filter out "Lost" deals - they don't show in main view
  const activeDeals = deals.filter(d => d.stage !== 'Lost' && d.stage !== 'Closed Lost')

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    const proposalDeals = activeDeals.filter(d =>
      STAGE_MAPPING[d.stage] === 'Proposal Issued'
    )
    const proposalValue = proposalDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    const wonDeals = activeDeals.filter(d => STAGE_MAPPING[d.stage] === 'Closed Won')
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    const vetoCount = activeDeals.filter(d => d.gm_status === 'VETO').length
    const avgGm = activeDeals.length > 0
      ? activeDeals.reduce((sum, d) => sum + (d.gm_percent || 0), 0) / activeDeals.length
      : 0

    return { total, proposalValue, wonValue, vetoCount, avgGm }
  }, [activeDeals])

  const handleAction = (action, deal) => {
    console.log('Pipeline action:', action, deal)
    if (action === 'reprice') {
      // Open reprice modal
    } else if (action === 'followUp') {
      // Open follow-up flow
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Total Pipeline</div>
            <div className="text-3xl font-bold text-white">
              ${(stats.total / 1000).toFixed(0)}K
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-xl font-bold text-amber-400">
                ${(stats.proposalValue / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-zinc-500">In Proposal</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">
                ${(stats.wonValue / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-zinc-500">Won</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${
                stats.avgGm >= 0.45 ? 'text-green-400' :
                stats.avgGm >= 0.40 ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {(stats.avgGm * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-zinc-500">Avg GM</div>
            </div>
          </div>

          {stats.vetoCount > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="w-5 h-5" />
                <span className="font-bold">{stats.vetoCount}</span>
                <span className="text-sm">blocked by GM gate</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3-Stage Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <StageColumn
            key={stage.id}
            stage={stage}
            deals={activeDeals}
            onAction={handleAction}
          />
        ))}
      </div>

      {/* Empty State */}
      {activeDeals.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <DollarSign className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Active Deals</h3>
          <p className="text-zinc-400">Deals will appear here as leads progress through the pipeline.</p>
        </div>
      )}
    </div>
  )
}
