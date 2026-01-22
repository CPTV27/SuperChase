import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Target, FileText, Award,
  Calendar, Zap, Upload, Plus, Search, Settings,
  ChevronDown, Building2, TrendingUp, RefreshCw
} from 'lucide-react'

// Import API functions
import {
  getS2PKPIs,
  getS2PDeals,
  getS2PLeads,
  getS2PProofs,
  getS2PWaves,
  getS2PSignals,
  advanceS2PDeal,
  ingestS2PLeads,
  generateS2PBrief
} from '../../services/api'

// Import S2P components
import KPIHeader from './KPIHeader'
import PipelineView from './PipelineView'
import ScopeAuditModal from './ScopeAuditModal'
import TierARadar from './TierARadar'
import LeadDrawer from './LeadDrawer'
import ProofVault from './ProofVault'
import WaveCalendar from './WaveCalendar'
import SignalQueue from './SignalQueue'
import LeadIngestion from './LeadIngestion'

/**
 * S2P Command Center
 * Strategic dashboard orchestrator - Three-Zone Command Interface
 */

const VIEWS = {
  pipeline: { label: 'Pipeline', icon: LayoutDashboard },
  radar: { label: 'Tier-A Radar', icon: Target },
  proof: { label: 'Proof Vault', icon: Award },
  waves: { label: 'ABM Waves', icon: Calendar },
  signals: { label: 'Signals', icon: Zap },
  ingest: { label: 'Lead Ingestion', icon: Upload }
}

function LeftSidebar({ todayFocus, capacityGauge, activeWave, onGeorgeChat }) {
  return (
    <div className="space-y-4">
      {/* Today's Focus */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" />
          Today's Focus
        </h3>
        <div className="space-y-2">
          {(todayFocus || [
            { label: 'Follow up with Perkins Eastman', type: 'meeting', priority: 'high' },
            { label: 'Review DASNY planholder list', type: 'signal', priority: 'medium' },
            { label: 'Send proof kit to Smith Group', type: 'outreach', priority: 'medium' }
          ]).map((item, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg text-sm ${
                item.priority === 'high'
                  ? 'bg-red-500/10 text-red-300 border-l-2 border-red-500'
                  : 'bg-zinc-800/50 text-zinc-300'
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Capacity Gauge */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          Capacity
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-400">This Week</span>
              <span className="text-zinc-300">3 / 5 slots</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-400">Next Week</span>
              <span className="text-zinc-300">1 / 5 slots</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '20%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Active Wave Status */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          Active Wave
        </h3>
        <div className="text-sm">
          <div className="text-white font-medium">Q1 Northeast Whales</div>
          <div className="text-xs text-zinc-400 mt-1">Week 3 of 6</div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-zinc-400">Progress</span>
            <span className="text-xs text-green-400">3 / 30 meetings</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: '10%' }} />
          </div>
        </div>
      </div>

      {/* George Chat Trigger */}
      <button
        onClick={onGeorgeChat}
        className="w-full glass rounded-xl p-4 text-left hover:bg-zinc-800/50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
            <span className="text-lg">G</span>
          </div>
          <div>
            <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
              Ask George
            </div>
            <div className="text-xs text-zinc-500">Voice or text query</div>
          </div>
        </div>
      </button>
    </div>
  )
}

function ActionBar({ onAction, selectedLead, generatingBrief }) {
  const actions = [
    { id: 'ingestLead', label: 'Ingest Lead', icon: Upload },
    { id: 'newProposal', label: 'New Proposal', icon: FileText },
    { id: 'runScout', label: 'Run Scout', icon: Search },
    {
      id: 'generateBrief',
      label: generatingBrief ? 'Generating...' : selectedLead ? `Brief: ${selectedLead.firmName || selectedLead.company}` : 'Generate Brief',
      icon: Building2,
      disabled: generatingBrief,
      highlight: !!selectedLead
    }
  ]

  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-2 overflow-x-auto">
        {actions.map(action => (
          <button
            key={action.id}
            onClick={() => !action.disabled && onAction(action.id)}
            disabled={action.disabled}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors whitespace-nowrap ${
              action.disabled
                ? 'bg-zinc-700/50 border-zinc-600 text-zinc-500 cursor-not-allowed'
                : action.highlight
                ? 'bg-blue-600/30 hover:bg-blue-600/50 border-blue-500 text-blue-300 hover:text-white'
                : 'bg-zinc-800/50 hover:bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
            }`}
          >
            <action.icon className={`w-4 h-4 ${action.disabled ? 'animate-spin' : ''}`} />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function S2PCommand() {
  const [activeView, setActiveView] = useState('pipeline')
  const [selectedLead, setSelectedLead] = useState(null)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [showLeadDrawer, setShowLeadDrawer] = useState(false)
  const [showScopeAudit, setShowScopeAudit] = useState(false)

  // Live data from API
  const [leads, setLeads] = useState(null)
  const [deals, setDeals] = useState(null)
  const [proofs, setProofs] = useState(null)
  const [waves, setWaves] = useState(null)
  const [signals, setSignals] = useState(null)
  const [kpis, setKpis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Brief generation state
  const [showBriefModal, setShowBriefModal] = useState(false)
  const [currentBrief, setCurrentBrief] = useState(null)
  const [generatingBrief, setGeneratingBrief] = useState(false)

  // Load data from live APIs
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [kpiData, dealsData, leadsData, proofsData, wavesData, signalsData] = await Promise.all([
        getS2PKPIs(),
        getS2PDeals(),
        getS2PLeads(),
        getS2PProofs(),
        getS2PWaves(),
        getS2PSignals()
      ])

      if (kpiData.kpis) setKpis(kpiData.kpis)
      if (dealsData.deals) setDeals(dealsData.deals)
      if (leadsData.leads) setLeads(leadsData.leads)
      if (proofsData.proofs) setProofs(proofsData.proofs)
      if (wavesData.waves) setWaves(wavesData.waves)
      if (signalsData.signals) setSignals(signalsData.signals)
    } catch (err) {
      setError(err.message)
      console.error('Failed to load S2P data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSelectLead = useCallback((lead) => {
    setSelectedLead(lead)
    setShowLeadDrawer(true)
  }, [])

  const handleSelectDeal = useCallback((deal) => {
    setSelectedDeal(deal)
    // Could open a deal drawer
  }, [])

  const handleAdvanceDeal = useCallback(async (deal, toStage) => {
    // If advancing to proposal, check GM gate
    if (toStage === 'proposal' && !deal.scope_audit_complete) {
      setSelectedDeal(deal)
      setShowScopeAudit(true)
      return
    }
    // Advance the deal via API
    try {
      const result = await advanceS2PDeal(deal.id, toStage)
      if (result.success) {
        fetchData() // Refresh data
      } else {
        console.error('Failed to advance deal:', result.error)
      }
    } catch (err) {
      console.error('Error advancing deal:', err)
    }
  }, [fetchData])

  const handleScopeAuditComplete = useCallback((auditData) => {
    console.log('Scope audit complete:', auditData)
    // Update deal with audit data
    setShowScopeAudit(false)
  }, [])

  const handleLeadAction = useCallback((action, lead) => {
    console.log('Lead action:', action, lead)
    if (action === 'scheduleMeeting') {
      // Open meeting scheduler
    } else if (action === 'sendProof') {
      // Open proof selection
    }
  }, [])

  const handleAction = useCallback(async (actionId) => {
    if (actionId === 'ingestLead') {
      setActiveView('ingest')
    } else if (actionId === 'newProposal') {
      // Open proposal creator
      console.log('New proposal')
    } else if (actionId === 'runScout') {
      // Trigger scout
      console.log('Run scout')
    } else if (actionId === 'generateBrief') {
      // Generate brief - needs a selected lead
      if (!selectedLead) {
        alert('Please select a lead from the Tier-A Radar first')
        setActiveView('radar')
        return
      }
      setGeneratingBrief(true)
      try {
        const result = await generateS2PBrief(selectedLead.id)
        if (result.success && result.brief) {
          setCurrentBrief(result.brief)
          setShowBriefModal(true)
        } else {
          alert('Failed to generate brief: ' + (result.error || 'Unknown error'))
        }
      } catch (err) {
        alert('Error generating brief: ' + err.message)
      } finally {
        setGeneratingBrief(false)
      }
    }
  }, [selectedLead])

  const handleIngestLeads = useCallback(async (newLeads) => {
    try {
      const result = await ingestS2PLeads(newLeads)
      if (result.success) {
        await fetchData() // Refresh data
        setActiveView('radar')
      } else {
        console.error('Failed to ingest leads:', result.error)
      }
    } catch (err) {
      console.error('Error ingesting leads:', err)
    }
  }, [fetchData])

  const handleGeorgeChat = useCallback(() => {
    // Open George chat interface
    console.log('Opening George chat')
  }, [])

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header with KPIs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-xl">
              S
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">S2P Command</h1>
              <p className="text-xs text-zinc-500">
                Strategic Dashboard • FY2026
                {loading && ' • Loading...'}
                {error && <span className="text-red-400"> • Error: {error}</span>}
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* View Tabs */}
          <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
            {Object.entries(VIEWS).map(([key, view]) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  activeView === key
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <view.icon className="w-4 h-4" />
                <span className="hidden md:inline">{view.label}</span>
              </button>
            ))}
          </div>
        </div>

        <KPIHeader kpis={kpis} />
      </div>

      {/* Three-Zone Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar (30%) */}
        <div className="lg:col-span-1">
          <LeftSidebar onGeorgeChat={handleGeorgeChat} />
        </div>

        {/* Main Stage (70%) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Main View Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'pipeline' && (
                <PipelineView
                  deals={deals}
                  onSelectDeal={handleSelectDeal}
                  onAdvanceDeal={handleAdvanceDeal}
                />
              )}

              {activeView === 'radar' && (
                <TierARadar
                  leads={leads}
                  onSelectLead={handleSelectLead}
                  selectedLead={selectedLead}
                />
              )}

              {activeView === 'proof' && (
                <ProofVault
                  proofs={proofs}
                  onSelectProof={(proof) => console.log('Select proof:', proof)}
                />
              )}

              {activeView === 'waves' && (
                <WaveCalendar
                  waves={waves}
                  onTargetAction={(action, target, waveId) =>
                    console.log('Wave target action:', action, target, waveId)
                  }
                />
              )}

              {activeView === 'signals' && (
                <SignalQueue
                  signals={signals}
                  onSignalAction={(action, signal) =>
                    console.log('Signal action:', action, signal)
                  }
                />
              )}

              {activeView === 'ingest' && (
                <LeadIngestion
                  existingLeads={leads || []}
                  onIngest={handleIngestLeads}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Action Bar */}
          <ActionBar
            onAction={handleAction}
            selectedLead={selectedLead}
            generatingBrief={generatingBrief}
          />
        </div>
      </div>

      {/* Lead Drawer */}
      <LeadDrawer
        lead={selectedLead}
        isOpen={showLeadDrawer}
        onClose={() => {
          setShowLeadDrawer(false)
          setSelectedLead(null)
        }}
        onAction={handleLeadAction}
      />

      {/* Brief Modal */}
      <AnimatePresence>
        {showBriefModal && currentBrief && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowBriefModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Sales Brief</h2>
                <button
                  onClick={() => setShowBriefModal(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Company Header */}
              <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{currentBrief.company}</h3>
                    <p className="text-sm text-zinc-400">{currentBrief.location}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    currentBrief.tier === 'A' ? 'bg-green-500/20 text-green-400' :
                    currentBrief.tier === 'B' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-zinc-500/20 text-zinc-400'
                  }`}>
                    Tier {currentBrief.tier}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-zinc-500">Score</span>
                    <p className="text-white font-medium">{currentBrief.score}/100</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Employees</span>
                    <p className="text-white font-medium">{currentBrief.employees || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Est. Sqft</span>
                    <p className="text-white font-medium">{currentBrief.sqftEstimate?.toLocaleString() || 'Unknown'}</p>
                  </div>
                </div>
              </div>

              {/* Proof Matches */}
              {currentBrief.proofMatches?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">Matched Proof Assets</h4>
                  <div className="space-y-2">
                    {currentBrief.proofMatches.map((proof, i) => (
                      <div key={i} className="bg-zinc-800/30 rounded-lg p-3 text-sm">
                        <span className="text-white">{proof.title || proof.assetId}</span>
                        {proof.matchType && (
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            proof.matchType === 'exact' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {proof.matchType}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {currentBrief.proofSnippet && (
                    <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-xs text-blue-300 mb-1">Copy/Paste Snippet:</p>
                      <p className="text-sm text-white">{currentBrief.proofSnippet}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Active Signals */}
              {currentBrief.signalCount > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">
                    Active Signals ({currentBrief.signalCount})
                  </h4>
                  <div className="space-y-2">
                    {currentBrief.signals.map((signal, i) => (
                      <div key={i} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
                        <span className="text-amber-300">{signal.type || signal.signalType}: </span>
                        <span className="text-white">{signal.description || signal.source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Next Steps */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-zinc-300 mb-2">Recommended Next Steps</h4>
                <ul className="space-y-2">
                  {currentBrief.nextSteps?.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">→</span>
                      <span className="text-zinc-300">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-zinc-700">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${currentBrief.company} - Tier ${currentBrief.tier}\n` +
                      `Score: ${currentBrief.score}/100\n` +
                      `${currentBrief.proofSnippet || ''}\n` +
                      `Next: ${currentBrief.nextSteps?.[0] || 'Research'}`
                    )
                    alert('Brief copied to clipboard!')
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => setShowBriefModal(false)}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scope Audit Modal */}
      <ScopeAuditModal
        deal={selectedDeal}
        isOpen={showScopeAudit}
        onClose={() => setShowScopeAudit(false)}
        onComplete={handleScopeAuditComplete}
      />
    </div>
  )
}
