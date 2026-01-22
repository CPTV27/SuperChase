import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CircleDot, Users, Target, FileText, CheckCircle,
  AlertTriangle, ChevronRight, DollarSign, Building2,
  Shield, XCircle
} from 'lucide-react'

/**
 * Pipeline View with Stage Dictionary + GM Gate
 * Enforces governance rules from FY2026 Strategy
 */

const STAGE_CONFIG = {
  lead: {
    label: 'Lead',
    icon: CircleDot,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/20',
    weight: 0.1
  },
  meeting: {
    label: 'Meeting',
    icon: Users,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    weight: 0.25
  },
  opportunity: {
    label: 'Opportunity',
    icon: Target,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    weight: 0.5
  },
  proposal: {
    label: 'Proposal',
    icon: FileText,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    weight: 0.75,
    gmGate: true
  },
  close: {
    label: 'Close',
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    weight: 1.0
  }
}

const STAGES = ['lead', 'meeting', 'opportunity', 'proposal', 'close']

function DealCard({ deal, onSelect, onAdvance }) {
  const gmColor = deal.gm_status === 'PASS' ? 'text-green-400' :
                  deal.gm_status === 'VETO' ? 'text-red-400' :
                  'text-zinc-400'

  const tierColor = deal.tier === 'A' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    deal.tier === 'B' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`glass rounded-lg p-3 cursor-pointer hover:bg-zinc-800/50 transition-colors ${
        deal.gm_status === 'VETO' ? 'border border-red-500/30' : ''
      }`}
      onClick={() => onSelect?.(deal)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="font-medium text-white text-sm truncate">
            {deal.company}
          </div>
          <div className="text-xs text-zinc-500 truncate">
            {deal.project_name}
          </div>
        </div>
        <span className={`px-1.5 py-0.5 text-xs rounded border flex-shrink-0 ${tierColor}`}>
          Tier {deal.tier}
        </span>
      </div>

      {/* Value + GM */}
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-1 text-zinc-300">
          <DollarSign className="w-3 h-3" />
          ${(deal.value / 1000).toFixed(0)}K
        </div>
        <div className={`flex items-center gap-1 ${gmColor}`}>
          {deal.gm_status === 'VETO' ? (
            <>
              <XCircle className="w-3 h-3" />
              {(deal.gm_percent * 100).toFixed(0)}% GM
            </>
          ) : deal.gm_status === 'PASS' ? (
            <>
              <Shield className="w-3 h-3" />
              {(deal.gm_percent * 100).toFixed(0)}% GM
            </>
          ) : (
            <span>GM pending</span>
          )}
        </div>
      </div>

      {/* VETO Badge */}
      {deal.gm_status === 'VETO' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded px-2 py-1 mb-2">
          <div className="flex items-center gap-1 text-red-400 text-xs">
            <AlertTriangle className="w-3 h-3" />
            <span className="font-medium">BLOCKED</span>
          </div>
          <div className="text-xs text-red-400/80 mt-0.5">
            {deal.veto_reason || 'GM below 40% floor'}
          </div>
        </div>
      )}

      {/* Next Action */}
      <div className="text-xs text-zinc-500 truncate">
        {deal.next_action}
      </div>

      {/* Scope Audit indicator */}
      {deal.stage === 'opportunity' && !deal.scope_audit_complete && (
        <div className="flex items-center gap-1 mt-2 text-xs text-amber-400">
          <FileText className="w-3 h-3" />
          Scope audit required
        </div>
      )}
    </motion.div>
  )
}

function StageColumn({ stage, deals, onSelectDeal, onAdvanceDeal }) {
  const config = STAGE_CONFIG[stage]
  const Icon = config.icon
  const stageDeals = deals.filter(d => d.stage === stage)
  const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0)
  const vetoedCount = stageDeals.filter(d => d.gm_status === 'VETO').length

  return (
    <div className="flex-1 min-w-[200px]">
      {/* Stage Header */}
      <div className={`${config.bgColor} rounded-t-lg p-3 border-b border-zinc-700`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.color}`} />
          <span className="font-medium text-white text-sm">{config.label}</span>
          <span className="ml-auto text-xs text-zinc-400">
            {stageDeals.length}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-zinc-400">
            ${(stageValue / 1000).toFixed(0)}K
          </span>
          {config.gmGate && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              GM Gate
            </span>
          )}
        </div>
        {vetoedCount > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
            <XCircle className="w-3 h-3" />
            {vetoedCount} blocked
          </div>
        )}
      </div>

      {/* Deals */}
      <div className="bg-zinc-900/30 rounded-b-lg p-2 min-h-[200px] space-y-2">
        <AnimatePresence>
          {stageDeals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              onSelect={onSelectDeal}
              onAdvance={onAdvanceDeal}
            />
          ))}
        </AnimatePresence>

        {stageDeals.length === 0 && (
          <div className="text-center py-8 text-zinc-600 text-sm">
            No deals
          </div>
        )}
      </div>
    </div>
  )
}

export default function PipelineView({ deals: propDeals, onSelectDeal, onAdvanceDeal }) {
  // Default demo data if not provided
  const deals = propDeals || [
    {
      id: 'deal_001',
      company: 'Perkins Eastman',
      project_name: 'Education Building Retrofit',
      stage: 'meeting',
      tier: 'A',
      value: 75000,
      gm_percent: 0.44,
      gm_status: 'PASS',
      scope_audit_complete: false,
      next_action: 'Discovery call - Jan 24'
    },
    {
      id: 'deal_002',
      company: 'Voith & Mactavish',
      project_name: 'Historic Row House',
      stage: 'opportunity',
      tier: 'C',
      value: 18000,
      gm_percent: 0.42,
      gm_status: 'PASS',
      scope_audit_complete: true,
      next_action: 'Send proposal'
    },
    {
      id: 'deal_003',
      company: 'STUDIOS Architecture',
      project_name: 'DC Office Renovation',
      stage: 'lead',
      tier: 'B',
      value: 35000,
      gm_percent: null,
      gm_status: 'PENDING',
      scope_audit_complete: false,
      next_action: 'Schedule intro call'
    },
    {
      id: 'deal_004',
      company: 'NYC DOE',
      project_name: 'School Facility Assessment',
      stage: 'proposal',
      tier: 'A',
      value: 95000,
      gm_percent: 0.38,
      gm_status: 'VETO',
      veto_reason: 'GM below 40% floor',
      scope_audit_complete: true,
      next_action: 'BLOCKED - Reprice or decline'
    },
    {
      id: 'deal_005',
      company: 'Smith Group',
      project_name: 'Healthcare Wing Scan',
      stage: 'meeting',
      tier: 'A',
      value: 88000,
      gm_percent: 0.46,
      gm_status: 'PASS',
      scope_audit_complete: false,
      next_action: 'Follow up from intro call'
    }
  ]

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = deals.reduce((sum, d) => sum + d.value, 0)
    const weighted = deals.reduce((sum, d) => {
      const weight = STAGE_CONFIG[d.stage]?.weight || 0
      return sum + (d.value * weight)
    }, 0)
    const vetoed = deals.filter(d => d.gm_status === 'VETO')
      .reduce((sum, d) => sum + d.value, 0)
    const passCount = deals.filter(d => d.gm_status === 'PASS').length
    const vetoCount = deals.filter(d => d.gm_status === 'VETO').length

    return { total, weighted, vetoed, passCount, vetoCount }
  }, [deals])

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-zinc-500">Total Pipeline</div>
            <div className="text-xl font-bold text-white">
              ${(stats.total / 1000).toFixed(0)}K
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">Weighted Value</div>
            <div className="text-xl font-bold text-blue-400">
              ${(stats.weighted / 1000).toFixed(0)}K
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">GM Gate Status</div>
            <div className="flex items-center gap-2">
              <span className="text-green-400 flex items-center gap-1">
                <Shield className="w-4 h-4" />
                {stats.passCount} pass
              </span>
              {stats.vetoCount > 0 && (
                <span className="text-red-400 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  {stats.vetoCount} veto
                </span>
              )}
            </div>
          </div>

          {stats.vetoed > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <div className="text-xs text-red-400">Blocked Value</div>
              <div className="text-lg font-bold text-red-400">
                ${(stats.vetoed / 1000).toFixed(0)}K
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stage Columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <StageColumn
            key={stage}
            stage={stage}
            deals={deals}
            onSelectDeal={onSelectDeal}
            onAdvanceDeal={onAdvanceDeal}
          />
        ))}
      </div>

      {/* Governance Rules */}
      <div className="glass rounded-lg p-3 flex items-center gap-4 text-xs text-zinc-400">
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-amber-400" />
          <span>40% GM Floor</span>
        </div>
        <div className="flex items-center gap-1">
          <FileText className="w-3 h-3 text-blue-400" />
          <span>Scope Audit at Proposal</span>
        </div>
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3 text-green-400" />
          <span>95% Stage Compliance</span>
        </div>
      </div>
    </div>
  )
}
