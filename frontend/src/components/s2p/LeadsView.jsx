import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, CheckCircle, Clock, AlertCircle,
  Send, Eye, ChevronRight, Building2
} from 'lucide-react'

/**
 * LEADS View - Wave 1 Only (Top 25 Targets)
 * Grouped by status: Ready, Needs Work, In Progress
 */

const TIER_STYLES = {
  A: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'A' },
  B: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'B' },
  C: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'C' }
}

const STATUS_CONFIG = {
  ready: { label: 'Ready for Outreach', color: 'text-green-400', bg: 'bg-green-500/10' },
  needs_work: { label: 'Needs Contact Info', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  in_progress: { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/10' }
}

function LeadCard({ lead, proofMatch, onSelect, onSendMailer }) {
  const tier = TIER_STYLES[lead.tier] || TIER_STYLES.C

  // Determine if contact info is missing
  const hasMissingInfo = !lead.contacts || lead.contacts.length === 0 ||
    !lead.contacts[0]?.email

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Company + Tier */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white text-lg">
              {lead.firmName || lead.company}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${tier.bg} ${tier.text} border ${tier.border}`}>
              {tier.label}
            </span>
          </div>

          {/* Key Info */}
          <div className="flex items-center gap-3 text-sm text-zinc-400 mb-3">
            <span>{lead.service_focus || 'Architecture'}</span>
            {lead.sqft_estimate && (
              <>
                <span className="text-zinc-600">•</span>
                <span>{(lead.sqft_estimate / 1000000).toFixed(1)}M SF</span>
              </>
            )}
            {lead.employees && (
              <>
                <span className="text-zinc-600">•</span>
                <span>{lead.employees} emp</span>
              </>
            )}
          </div>

          {/* Proof Match */}
          {proofMatch && (
            <div className="flex items-center gap-2 text-sm mb-3">
              <span className="text-zinc-500">Proof:</span>
              <span className="text-white">{proofMatch.title}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                proofMatch.matchType === 'exact'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {(proofMatch.confidence * 100).toFixed(0)}% match
              </span>
            </div>
          )}

          {/* Missing Info Warning */}
          {hasMissingInfo && (
            <div className="flex items-center gap-2 text-sm text-amber-400 mb-3">
              <AlertCircle className="w-4 h-4" />
              <span>Missing: Principal email</span>
            </div>
          )}

          {/* Next Action */}
          <div className="text-sm text-zinc-500">
            Next: {hasMissingInfo ? 'Research contact info' : 'Send proof mailer'}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onSelect?.(lead)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-700/50 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          {!hasMissingInfo && (
            <button
              onClick={() => onSendMailer?.(lead)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Send className="w-4 h-4" />
              Mailer
            </button>
          )}
          {hasMissingInfo && (
            <button
              onClick={() => onSelect?.(lead)}
              className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              Research
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function StatusSection({ title, icon: Icon, count, color, children }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-white">{title}</h3>
          <span className="text-sm text-zinc-500">({count})</span>
        </div>
        <ChevronRight className={`w-5 h-5 text-zinc-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LeadsView({ leads, waves, proofs, onSelectLead }) {
  const [filter, setFilter] = useState('all')

  // Get Wave 1 targets only (top 25)
  const wave1Leads = useMemo(() => {
    if (!leads) return []

    // Filter to Tier-A only for Wave 1 focus
    const tierALeads = leads.filter(l => l.tier === 'A')

    // Also include leads explicitly in wave 1
    const wave1Targets = waves?.[0]?.targets?.map(t => t.lead_id) || []
    const wave1Set = new Set(wave1Targets)

    // Combine: Tier-A + Wave 1 targets
    const combined = tierALeads.filter(l =>
      l.tier === 'A' || wave1Set.has(l.id)
    )

    return combined.slice(0, 25)
  }, [leads, waves])

  // Create simple proof matching
  const getProofMatch = (lead) => {
    if (!proofs || proofs.length === 0) return null

    // Simple matching based on building type
    const leadType = (lead.service_focus || '').toLowerCase()

    for (const proof of proofs) {
      const matchCriteria = proof.matchCriteria || {}
      const buildingTypes = matchCriteria.buildingTypes || []

      for (const type of buildingTypes) {
        if (leadType.includes(type.toLowerCase())) {
          return {
            ...proof,
            matchType: 'exact',
            confidence: 0.85
          }
        }
      }
    }

    // Return first proof as generic match
    return proofs[0] ? {
      ...proofs[0],
      matchType: 'adjacent',
      confidence: 0.6
    } : null
  }

  // Categorize leads by status
  const categorizedLeads = useMemo(() => {
    const ready = []
    const needsWork = []
    const inProgress = []

    wave1Leads.forEach(lead => {
      const hasContact = lead.contacts && lead.contacts.length > 0 && lead.contacts[0]?.email

      if (lead.status === 'meeting_scheduled' || lead.status === 'engaged') {
        inProgress.push(lead)
      } else if (!hasContact) {
        needsWork.push(lead)
      } else {
        ready.push(lead)
      }
    })

    return { ready, needsWork, inProgress }
  }, [wave1Leads])

  // Apply filter
  const filteredLeads = useMemo(() => {
    if (filter === 'all') return categorizedLeads
    if (filter === 'ready') return { ready: categorizedLeads.ready, needsWork: [], inProgress: [] }
    if (filter === 'needs_work') return { ready: [], needsWork: categorizedLeads.needsWork, inProgress: [] }
    if (filter === 'in_progress') return { ready: [], needsWork: [], inProgress: categorizedLeads.inProgress }
    return categorizedLeads
  }, [categorizedLeads, filter])

  const totalCount = wave1Leads.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">WAVE 1: Top 25 Targets</h2>
              <p className="text-sm text-zinc-400">Tier-A focus • Northeast market</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{categorizedLeads.ready.length}</div>
              <div className="text-zinc-500">Ready</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-amber-400">{categorizedLeads.needsWork.length}</div>
              <div className="text-zinc-500">Need Info</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">{categorizedLeads.inProgress.length}</div>
              <div className="text-zinc-500">In Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'ready', label: 'Ready' },
          { id: 'needs_work', label: 'Needs Work' },
          { id: 'in_progress', label: 'In Progress' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.id
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lead Sections */}
      {filteredLeads.ready.length > 0 && (
        <StatusSection
          title="READY FOR OUTREACH"
          icon={CheckCircle}
          count={filteredLeads.ready.length}
          color="bg-green-500/20 text-green-400"
        >
          {filteredLeads.ready.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              proofMatch={getProofMatch(lead)}
              onSelect={onSelectLead}
              onSendMailer={(lead) => console.log('Send mailer to:', lead)}
            />
          ))}
        </StatusSection>
      )}

      {filteredLeads.needsWork.length > 0 && (
        <StatusSection
          title="NEEDS CONTACT INFO"
          icon={AlertCircle}
          count={filteredLeads.needsWork.length}
          color="bg-amber-500/20 text-amber-400"
        >
          {filteredLeads.needsWork.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              proofMatch={getProofMatch(lead)}
              onSelect={onSelectLead}
            />
          ))}
        </StatusSection>
      )}

      {filteredLeads.inProgress.length > 0 && (
        <StatusSection
          title="IN PROGRESS"
          icon={Clock}
          count={filteredLeads.inProgress.length}
          color="bg-blue-500/20 text-blue-400"
        >
          {filteredLeads.inProgress.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              proofMatch={getProofMatch(lead)}
              onSelect={onSelectLead}
            />
          ))}
        </StatusSection>
      )}

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <Building2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Leads Yet</h3>
          <p className="text-zinc-400">Import leads to get started with Wave 1 outreach.</p>
        </div>
      )}
    </div>
  )
}
