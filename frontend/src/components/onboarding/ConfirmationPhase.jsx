import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Check, X } from 'lucide-react'
import ConfidenceIndicator from './ConfidenceIndicator'

function EditableField({ item, onEdit, highlighted = false }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(item.value || '')

  const handleSave = () => {
    onEdit(item.field, value)
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setValue(item.value || '')
      setEditing(false)
    }
  }

  return (
    <motion.div
      layout
      className={`
        p-4 rounded-xl border transition-colors
        ${highlighted
          ? 'bg-yellow-500/5 border-yellow-500/30'
          : 'bg-zinc-800/50 border-zinc-700/50'
        }
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-zinc-300">
              {item.label}
            </label>
            <ConfidenceIndicator level={item.confidence} />
          </div>

          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-600
                         rounded-lg text-white min-h-[44px]
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleSave}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg
                         min-w-[44px] min-h-[44px] flex items-center justify-center
                         transition-colors"
              >
                <Check className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => {
                  setValue(item.value || '')
                  setEditing(false)
                }}
                className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg
                         min-w-[44px] min-h-[44px] flex items-center justify-center
                         transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <p className="text-white">
              {item.value || <span className="text-zinc-500 italic">Not found</span>}
            </p>
          )}

          {item.source && !editing && (
            <p className="text-xs text-zinc-500 mt-1">
              Source: {item.source}
            </p>
          )}
        </div>

        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors
                     min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Pencil className="w-4 h-4 text-zinc-400" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export function ConfirmationPhase({ data, onConfirm, onEdit }) {
  // Group by confidence
  const highConfidence = data.filter(d => d.confidence === 'high')
  const needsReview = data.filter(d => d.confidence !== 'high')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-white">
          Review Research Results
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          Click the pencil icon to edit any field
        </p>
      </div>

      {/* High confidence section */}
      {highConfidence.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-emerald-400 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full" />
            Verified Information ({highConfidence.length})
          </h3>
          {highConfidence.map(item => (
            <EditableField
              key={item.field}
              item={item}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}

      {/* Needs review section */}
      {needsReview.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-yellow-400 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full" />
            Please Verify ({needsReview.length})
          </h3>
          {needsReview.map(item => (
            <EditableField
              key={item.field}
              item={item}
              onEdit={onEdit}
              highlighted
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {data.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          No data found during research. You'll be asked to provide details.
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        className="w-full py-4 bg-blue-600 hover:bg-blue-500
                 text-white font-semibold rounded-xl
                 min-h-[56px] transition-colors"
      >
        Confirm & Continue
      </button>
    </motion.div>
  )
}

export default ConfirmationPhase
