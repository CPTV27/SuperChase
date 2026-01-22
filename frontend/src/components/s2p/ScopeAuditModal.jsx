import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, CheckCircle, Circle, AlertTriangle,
  Building2, Ruler, FileText, Plane, Clock, Shield,
  ImageIcon
} from 'lucide-react'

/**
 * Scope Audit Modal
 * Pre-proposal checklist enforcing P2 governance
 */

const CHECKLIST_ITEMS = [
  {
    id: 'sqft_confirmed',
    label: 'Square footage confirmed',
    icon: Ruler,
    required: true,
    description: 'Verified project sqft from client or site visit'
  },
  {
    id: 'lod_defined',
    label: 'LOD level defined',
    icon: Building2,
    required: true,
    description: 'LOD 200/300/350 agreed with client',
    options: ['LOD 200', 'LOD 300', 'LOD 350', 'LOD 350+']
  },
  {
    id: 'disciplines_listed',
    label: 'All disciplines listed',
    icon: FileText,
    required: true,
    description: 'Architecture, MEP, Structural, Site as needed'
  },
  {
    id: 'travel_included',
    label: 'Travel costs included',
    icon: Plane,
    required: true,
    description: 'Mileage, lodging, per diem factored in'
  },
  {
    id: 'timeline_agreed',
    label: 'Timeline agreed (3-5 weeks)',
    icon: Clock,
    required: true,
    description: 'Client understands 3-5 week delivery'
  },
  {
    id: 'risk_factored',
    label: 'Risk factors assessed',
    icon: AlertTriangle,
    required: false,
    description: 'Historic, access issues, complexity noted'
  },
  {
    id: 'proof_attached',
    label: 'Proof asset attached',
    icon: ImageIcon,
    required: true,
    description: 'Relevant case study or LOD sample linked'
  }
]

function ChecklistItem({ item, checked, onToggle, disabled }) {
  const Icon = item.icon

  return (
    <motion.button
      type="button"
      onClick={() => !disabled && onToggle(item.id)}
      className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
        checked
          ? 'bg-green-500/10 border border-green-500/30'
          : 'bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-800'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      <div className={`p-2 rounded-lg ${
        checked ? 'bg-green-500/20' : 'bg-zinc-700'
      }`}>
        {checked ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <Icon className="w-4 h-4 text-zinc-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-sm ${
            checked ? 'text-green-400' : 'text-white'
          }`}>
            {item.label}
          </span>
          {item.required && (
            <span className="text-xs text-red-400">*</span>
          )}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">
          {item.description}
        </div>
      </div>
    </motion.button>
  )
}

export default function ScopeAuditModal({ deal, isOpen, onClose, onComplete }) {
  const [checkedItems, setCheckedItems] = useState(
    deal?.scope_audit_items || {}
  )
  const [gmInput, setGmInput] = useState(
    deal?.gm_percent ? (deal.gm_percent * 100).toFixed(0) : ''
  )
  const [notes, setNotes] = useState('')

  const toggleItem = (id) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const requiredItems = CHECKLIST_ITEMS.filter(item => item.required)
  const allRequiredChecked = requiredItems.every(item => checkedItems[item.id])
  const gmPercent = parseFloat(gmInput) / 100
  const gmValid = gmPercent >= 0.40
  const canComplete = allRequiredChecked && gmValid

  const handleComplete = () => {
    onComplete?.({
      scope_audit_complete: true,
      scope_audit_items: checkedItems,
      gm_percent: gmPercent,
      gm_status: gmValid ? 'PASS' : 'VETO',
      audit_notes: notes,
      audited_at: new Date().toISOString()
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="glass rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Scope Audit</h2>
              {deal && (
                <p className="text-sm text-zinc-400 mt-1">
                  {deal.company} - {deal.project_name}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* GM Input */}
          <div className="mb-6">
            <label className="text-sm font-medium text-zinc-300 mb-2 block">
              Gross Margin %
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={gmInput}
                  onChange={e => setGmInput(e.target.value)}
                  placeholder="45"
                  min="0"
                  max="100"
                  className={`w-full bg-zinc-800 border rounded-lg px-4 py-3 text-white text-lg font-bold ${
                    !gmInput ? 'border-zinc-700' :
                    gmValid ? 'border-green-500/50' : 'border-red-500/50'
                  }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  %
                </span>
              </div>

              <div className={`p-3 rounded-lg ${
                !gmInput ? 'bg-zinc-800' :
                gmValid ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {!gmInput ? (
                  <Shield className="w-6 h-6 text-zinc-500" />
                ) : gmValid ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                )}
              </div>
            </div>

            {gmInput && !gmValid && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">GM VETO</span>
                </div>
                <p className="text-xs text-red-400/80 mt-1">
                  Margin is below 40% floor. Reprice or decline this opportunity.
                </p>
              </div>
            )}

            <p className="text-xs text-zinc-500 mt-2">
              40% minimum | 45% target | P1 Pricing SSOT required
            </p>
          </div>

          {/* Checklist */}
          <div className="space-y-2 mb-6">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">
              Pre-Proposal Checklist
            </h3>
            {CHECKLIST_ITEMS.map(item => (
              <ChecklistItem
                key={item.id}
                item={item}
                checked={checkedItems[item.id]}
                onToggle={toggleItem}
              />
            ))}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="text-sm font-medium text-zinc-300 mb-2 block">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any risk factors, special conditions..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={!canComplete}
              className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                canComplete
                  ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Complete Audit
            </button>
          </div>

          {!allRequiredChecked && (
            <p className="text-xs text-amber-400 text-center mt-3">
              Complete all required items (*) to proceed
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
