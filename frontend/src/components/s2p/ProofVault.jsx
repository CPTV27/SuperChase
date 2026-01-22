import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, Building2, Copy, Check, TrendingUp,
  Filter, CheckCircle, XCircle, ChevronDown
} from 'lucide-react'

/**
 * PROOF View - Simplified for CEO Demo
 * 12-Point Standard narratives front and center
 * Focus: What proves quality, usage stats, copy button
 */

const BUILDING_TYPES = ['All', 'Healthcare', 'Education', 'Commercial', 'Historic', 'Industrial']

function ProofCard({ proof, onCopy }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const narrative = proof.twelvePointNarrative || {}
  const conversionRate = proof.vault_to_meeting || 0

  const handleCopy = async (e) => {
    e.stopPropagation()
    const text = proof.snippet ||
      `${proof.title}\n${narrative.outcome || ''}\n${narrative.quote ? `"${narrative.quote}" - ${narrative.quoteAttribution}` : ''}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.(proof)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden"
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-lg mb-1">{proof.title}</h3>
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              {narrative.squareFootage && (
                <span>{(narrative.squareFootage / 1000).toFixed(0)}K SF</span>
              )}
              {narrative.buildingType && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{narrative.buildingType}</span>
                </>
              )}
              {proof.lod_level && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>LoD {proof.lod_level}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                copied
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
              }`}
            >
              {copied ? (
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Copied
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Copy className="w-4 h-4" />
                  Copy
                </span>
              )}
            </button>
            <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* 12-Point Narrative - Always Visible Summary */}
      <div className="px-4 pb-4 border-t border-zinc-700/50 pt-3">
        {/* WHY THIS PROVES QUALITY */}
        <div className="mb-4">
          <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Why This Proves Quality</h4>
          <div className="space-y-1.5">
            {narrative.deliverables && (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-300">
                  LoA-40 stated ({narrative.deliverables.includes('LOD') ? '±3mm accuracy' : 'documented accuracy'})
                </span>
              </div>
            )}
            {narrative.keyMetrics && narrative.keyMetrics.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-300">
                  Validation: {narrative.keyMetrics[0]}
                </span>
              </div>
            )}
            {narrative.timeline && (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-300">
                  Delivered in {narrative.timeline}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* WHAT OTHERS DON'T DO */}
        <div className="mb-4">
          <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">What Others Don't Do</h4>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2 text-sm">
              <XCircle className="w-4 h-4 text-red-400/60 mt-0.5 flex-shrink-0" />
              <span className="text-zinc-500">Don't specify LoD in proposals</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <XCircle className="w-4 h-4 text-red-400/60 mt-0.5 flex-shrink-0" />
              <span className="text-zinc-500">Don't document accuracy standards</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <XCircle className="w-4 h-4 text-red-400/60 mt-0.5 flex-shrink-0" />
              <span className="text-zinc-500">No validation proof provided</span>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="flex items-center justify-between text-sm pt-3 border-t border-zinc-700/50">
          <div className="text-zinc-400">
            Used in: <span className="text-white font-medium">{proof.uses || 0}</span> proof mailers
          </div>
          <div className={`flex items-center gap-1 ${
            conversionRate >= 0.20 ? 'text-green-400' : 'text-zinc-400'
          }`}>
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">{(conversionRate * 100).toFixed(0)}%</span>
            <span className="text-zinc-500">→ meetings</span>
          </div>
        </div>
      </div>

      {/* Expanded: Full Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-700/50 bg-zinc-900/50 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Challenge & Solution */}
              {narrative.challenge && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Challenge</h4>
                  <p className="text-sm text-zinc-300">{narrative.challenge}</p>
                </div>
              )}
              {narrative.solution && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Solution</h4>
                  <p className="text-sm text-zinc-300">{narrative.solution}</p>
                </div>
              )}
              {narrative.outcome && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Outcome</h4>
                  <p className="text-sm text-zinc-300">{narrative.outcome}</p>
                </div>
              )}

              {/* Quote */}
              {narrative.quote && (
                <div className="bg-zinc-800/50 rounded-lg p-3 border-l-2 border-blue-500/50">
                  <p className="text-sm italic text-zinc-300">"{narrative.quote}"</p>
                  {narrative.quoteAttribution && (
                    <p className="text-xs text-zinc-500 mt-1">— {narrative.quoteAttribution}</p>
                  )}
                </div>
              )}

              {/* Key Metrics */}
              {narrative.keyMetrics && narrative.keyMetrics.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Key Metrics</h4>
                  <div className="flex flex-wrap gap-2">
                    {narrative.keyMetrics.map((metric, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400"
                      >
                        {metric}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ProofVault({ proofs: propProofs, onSelectProof }) {
  const [typeFilter, setTypeFilter] = useState('All')

  // Use provided proofs or empty array
  const proofs = propProofs || []

  // Filter proofs by building type
  const filteredProofs = useMemo(() => {
    if (typeFilter === 'All') return proofs

    return proofs.filter(p => {
      const narrative = p.twelvePointNarrative || {}
      const buildingType = (narrative.buildingType || p.type || '').toLowerCase()
      return buildingType.includes(typeFilter.toLowerCase())
    })
  }, [proofs, typeFilter])

  // Stats
  const stats = useMemo(() => ({
    total: proofs.length,
    totalUses: proofs.reduce((sum, p) => sum + (p.uses || 0), 0),
    avgConversion: proofs.length > 0
      ? proofs.reduce((sum, p) => sum + (p.vault_to_meeting || 0), 0) / proofs.length
      : 0
  }), [proofs])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">PROOF VAULT</h2>
              <p className="text-sm text-zinc-400">
                {stats.total} case studies demonstrating 12-Point Standard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{stats.totalUses}</div>
              <div className="text-zinc-500">Total Uses</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${
                stats.avgConversion >= 0.20 ? 'text-green-400' : 'text-amber-400'
              }`}>
                {(stats.avgConversion * 100).toFixed(0)}%
              </div>
              <div className="text-zinc-500">→ Meeting</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-zinc-500" />
        {BUILDING_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              typeFilter === type
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Proof Cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredProofs.map(proof => (
            <ProofCard
              key={proof.id}
              proof={proof}
              onCopy={(p) => console.log('Copied proof:', p.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredProofs.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <Building2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Proofs Found</h3>
          <p className="text-zinc-400">
            {typeFilter !== 'All'
              ? `No proofs match the "${typeFilter}" filter.`
              : 'Add proof assets to get started.'}
          </p>
        </div>
      )}
    </div>
  )
}
