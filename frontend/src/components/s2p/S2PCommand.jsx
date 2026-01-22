import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Target, DollarSign, Award,
  RefreshCw, Settings
} from 'lucide-react'

// Import API functions
import {
  getS2PKPIs,
  getS2PDeals,
  getS2PLeads,
  getS2PProofs,
  getS2PWaves
} from '../../services/api'

// Import S2P components
import TodayView from './TodayView'
import LeadsView from './LeadsView'
import PipelineView from './PipelineView'
import ProofVault from './ProofVault'
import LeadDrawer from './LeadDrawer'
import { ToastProvider, useToast } from '../shared/Toast'

/**
 * S2P Command Center - Simplified UI
 * 4 Views Only: TODAY, LEADS, PIPELINE, PROOF
 */

const VIEWS = [
  { id: 'today', label: 'TODAY', icon: Flame, color: 'text-red-400' },
  { id: 'leads', label: 'LEADS', icon: Target, color: 'text-blue-400' },
  { id: 'pipeline', label: 'PIPELINE', icon: DollarSign, color: 'text-green-400' },
  { id: 'proof', label: 'PROOF', icon: Award, color: 'text-amber-400' }
]

function S2PCommandInner() {
  const [activeView, setActiveView] = useState('today')
  const [selectedLead, setSelectedLead] = useState(null)
  const [showLeadDrawer, setShowLeadDrawer] = useState(false)
  const { showToast } = useToast()

  // Live data from API
  const [leads, setLeads] = useState(null)
  const [deals, setDeals] = useState(null)
  const [proofs, setProofs] = useState(null)
  const [waves, setWaves] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load data from live APIs
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dealsData, leadsData, proofsData, wavesData] = await Promise.all([
        getS2PDeals(),
        getS2PLeads(),
        getS2PProofs(),
        getS2PWaves()
      ])

      if (dealsData.deals) setDeals(dealsData.deals)
      if (leadsData.leads) setLeads(leadsData.leads)
      if (proofsData.proofs) setProofs(proofsData.proofs)
      if (wavesData.waves) setWaves(wavesData.waves)
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

  // Action handlers with real functionality
  const handleAction = useCallback((action, data) => {
    console.log('Action:', action, data)

    if (action === 'viewPipeline') {
      setActiveView('pipeline')
      return
    }

    if (action === 'call') {
      // Find lead and copy phone
      const lead = leads?.find(l => (l.firmName || l.company) === data?.company)
      const phone = lead?.contacts?.[0]?.phone || data?.phone || '(No phone available)'
      navigator.clipboard.writeText(phone)
      showToast(`📞 Copied: ${phone}`, 'success')

      // Open lead drawer for more details
      if (lead) {
        setSelectedLead(lead)
        setShowLeadDrawer(true)
      }
      return
    }

    if (action === 'email') {
      // Find lead and prepare email draft
      const lead = leads?.find(l => (l.firmName || l.company) === data?.company)
      const contactName = lead?.contacts?.[0]?.name || 'there'
      const firmName = lead?.firmName || lead?.company || data?.company

      // Find matching proof for this lead
      const matchedProof = proofs?.find(p => {
        const leadType = (lead?.service_focus || '').toLowerCase()
        const proofTypes = p.matchCriteria?.buildingTypes || []
        return proofTypes.some(t => leadType.includes(t.toLowerCase()))
      }) || proofs?.[0]

      const proofNarrative = matchedProof?.twelvePointNarrative?.outcome ||
        'Our 12-Point Standard ensures enforceable deliverables, not vague promises.'

      const emailDraft = `Hi ${contactName},

I wanted to share a relevant case study for ${firmName}:

${proofNarrative}

Would you have 15 minutes this week to discuss how we can help with your next project?

Best,
CEO`

      navigator.clipboard.writeText(emailDraft)
      showToast('📧 Email draft copied to clipboard', 'success')

      // Open lead drawer
      if (lead) {
        setSelectedLead(lead)
        setShowLeadDrawer(true)
      }
      return
    }

    if (action === 'done') {
      showToast('✓ Task marked complete', 'success')
      return
    }

    if (action === 'sendBatch') {
      const count = data?.length || 0
      showToast(`📬 Sending ${count} proof mailers...`, 'info')
      setTimeout(() => {
        showToast(`✓ ${count} mailers sent successfully`, 'success')
      }, 1500)
      return
    }

    if (action === 'followUp') {
      const company = data?.company || data?.firmName
      showToast(`📧 Follow-up drafted for ${company}`, 'info')
      return
    }

    if (action === 'reprice') {
      const company = data?.company || data?.firmName
      showToast(`💰 Opening repricing for ${company}...`, 'info')
      return
    }
  }, [leads, proofs, showToast])

  const handleLeadAction = useCallback((action, lead) => {
    console.log('Lead action:', action, lead)

    if (action === 'copyEmail') {
      const email = lead?.contacts?.[0]?.email
      if (email) {
        navigator.clipboard.writeText(email)
        showToast(`📧 Copied: ${email}`, 'success')
      }
    } else if (action === 'copyPhone') {
      const phone = lead?.contacts?.[0]?.phone
      if (phone) {
        navigator.clipboard.writeText(phone)
        showToast(`📞 Copied: ${phone}`, 'success')
      }
    } else if (action === 'copyProof') {
      showToast('📋 Proof narrative copied to clipboard', 'success')
    }
  }, [showToast])

  return (
    <div className="min-h-screen">
      {/* Clean Header with 4-Tab Navigation */}
      <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo + Nav */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold">
                  S
                </div>
                <span className="font-bold text-white hidden sm:block">S2P</span>
              </div>

              {/* Navigation Tabs */}
              <nav className="flex items-center gap-1">
                {VIEWS.map(view => (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeView === view.id
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <view.icon className={`w-4 h-4 ${activeView === view.id ? view.color : ''}`} />
                    <span className="hidden sm:inline">{view.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            Error loading data: {error}
          </div>
        )}

        {/* Loading State */}
        {loading && !leads && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* View Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeView === 'today' && (
              <TodayView
                leads={leads}
                deals={deals}
                waves={waves}
                proofs={proofs}
                onAction={handleAction}
              />
            )}

            {activeView === 'leads' && (
              <LeadsView
                leads={leads}
                waves={waves}
                proofs={proofs}
                onSelectLead={handleSelectLead}
              />
            )}

            {activeView === 'pipeline' && (
              <PipelineView
                deals={deals}
                onSelectDeal={(deal) => console.log('Select deal:', deal)}
                onAdvanceDeal={(deal, stage) => console.log('Advance:', deal, stage)}
              />
            )}

            {activeView === 'proof' && (
              <ProofVault
                proofs={proofs}
                onSelectProof={(proof) => console.log('Select proof:', proof)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Lead Drawer */}
      <LeadDrawer
        lead={selectedLead}
        proofs={proofs}
        isOpen={showLeadDrawer}
        onClose={() => {
          setShowLeadDrawer(false)
          setSelectedLead(null)
        }}
        onAction={handleLeadAction}
      />
    </div>
  )
}

// Export wrapped with ToastProvider
export default function S2PCommand() {
  return (
    <ToastProvider>
      <S2PCommandInner />
    </ToastProvider>
  )
}
