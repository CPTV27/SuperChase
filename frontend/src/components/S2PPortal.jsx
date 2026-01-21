import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import S2PLeadRadar from './S2PLeadRadar'

/**
 * S2P Business Development Portal
 *
 * Dedicated view for Scan2Plan lead generation and prospecting.
 * Features the new Lead Radar visualization.
 */

// S2P Brand Colors
const THEME = {
  primary: '#1e3a5f',
  accent: '#00a878',
  background: '#0a1628',
  text: '#e2e8f0'
}

function ProspectusPreview({ prospect, onClose }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useState(() => {
    setTimeout(() => {
      setContent(`# Technical Prospectus: ${prospect?.name || 'Prospect'}

## Existing Conditions. Accurate Geometry. Zero Guesswork.

Your ${prospect?.type || 'renovation'} project in ${prospect?.location || 'the Northeast'} needs reliable existing conditions documentation...

**LOD Recommendation:** LOD 300 for design development coordination

### Deliverables
- Registered point cloud (E57, RCP)
- Revit model at specified LOD
- Floor plans, sections, elevations

### Timeline
- On-site capture: 1-2 days
- BIM modeling: 5-7 business days
- **Total: Under 2 weeks**

---

**Chase Pierson** | Scan2Plan | chase@scan2plan.com`)
      setLoading(false)
    }, 1500)
  }, [prospect])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="glass rounded-2xl p-6 max-w-xl w-full max-h-[80vh] overflow-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📄</span> Technical Prospectus
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-4xl mb-4"
            >
              ⚙️
            </motion.div>
            <p className="text-zinc-400">Generating prospectus...</p>
          </div>
        ) : (
          <div className="bg-zinc-900/50 rounded-xl p-4 font-mono text-sm text-zinc-300 whitespace-pre-wrap">
            {content}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button className="flex-1 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-emerald-400 font-medium transition-colors">
            📧 Send via Email
          </button>
          <button className="flex-1 py-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 font-medium transition-colors">
            📥 Download PDF
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function S2PPortal() {
  const [selectedProspect, setSelectedProspect] = useState(null)

  const handleAction = useCallback((action, lead) => {
    if (action === 'prospectus') {
      setSelectedProspect(lead)
    } else if (action === 'email') {
      // Would trigger email flow
      console.log('Email action for:', lead)
    }
  }, [])

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-2xl">
          🏗️
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Scan2Plan</h1>
          <p className="text-sm text-zinc-500">Business Development Portal • Northeast Corridor</p>
        </div>
      </div>

      {/* Lead Radar */}
      <S2PLeadRadar onAction={handleAction} />

      {/* Quick Actions */}
      <div className="mt-8 glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="flex items-start gap-3 p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-left transition-colors">
            <span className="text-2xl">📡</span>
            <div>
              <div className="font-medium text-emerald-400">Run Northeast Scan</div>
              <div className="text-xs text-zinc-500 mt-1">DC → Maine corridor</div>
            </div>
          </button>

          <button className="flex items-start gap-3 p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-left transition-colors">
            <span className="text-2xl">📊</span>
            <div>
              <div className="font-medium text-blue-400">Batch Prospectus</div>
              <div className="text-xs text-zinc-500 mt-1">Generate for all hot leads</div>
            </div>
          </button>

          <button className="flex items-start gap-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-left transition-colors">
            <span className="text-2xl">📈</span>
            <div>
              <div className="font-medium text-purple-400">Pipeline Report</div>
              <div className="text-xs text-zinc-500 mt-1">Weekly BD summary</div>
            </div>
          </button>
        </div>
      </div>

      {/* Prospectus Modal */}
      <AnimatePresence>
        {selectedProspect && (
          <ProspectusPreview
            prospect={selectedProspect}
            onClose={() => setSelectedProspect(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
