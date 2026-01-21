import { motion } from 'framer-motion'
import { Check, Sparkles, Edit2, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'

export function ReviewPhase({ extractedFields, answers, questions, committing, onCommit, onBack }) {
  // Combine extracted and answered data for review
  const allData = {}

  // Add extracted fields
  for (const field of extractedFields) {
    allData[field.key] = {
      value: field.value,
      source: 'AI Extraction',
      confidence: field.confidence,
    }
  }

  // Override with manual answers
  for (const [key, value] of Object.entries(answers)) {
    if (value !== '' && value !== null && value !== undefined) {
      allData[key] = {
        value,
        source: 'Manual Entry',
        confidence: 1,
      }
    }
  }

  // Group by category
  const categories = Object.entries(questions || {}).map(([catId, cat]) => ({
    id: catId,
    label: cat.label,
    fields: cat.questions.map(q => ({
      id: q.id,
      label: q.label,
      type: q.type,
      ...allData[q.id],
    })).filter(f => f.value !== undefined && f.value !== null && f.value !== ''),
  })).filter(cat => cat.fields.length > 0)

  const totalFields = Object.keys(allData).length

  const formatValue = (value, type) => {
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    if (type === 'currency') {
      return `$${Number(value).toLocaleString()}`
    }
    if (type === 'percentage') {
      return `${value}%`
    }
    return String(value)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white">Review & Approve</h2>
        <p className="text-zinc-400 mt-1">
          Review all data before committing to your business configuration
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{totalFields}</p>
          <p className="text-zinc-400 text-sm">Total Fields</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{categories.length}</p>
          <p className="text-zinc-400 text-sm">Categories</p>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-yellow-300 font-medium text-sm">Review carefully</p>
          <p className="text-yellow-400/80 text-sm mt-1">
            This will update your business configuration files. Make sure all data is accurate.
          </p>
        </div>
      </div>

      {/* Data review by category */}
      <div className="space-y-4">
        {categories.map(category => (
          <div
            key={category.id}
            className="border border-zinc-800 rounded-xl overflow-hidden"
          >
            <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800">
              <h3 className="text-white font-medium">{category.label}</h3>
            </div>
            <div className="p-4 space-y-3">
              {category.fields.map(field => (
                <div
                  key={field.id}
                  className="flex items-start justify-between gap-4 p-3 bg-zinc-800/30 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-400 text-xs mb-1">{field.label}</p>
                    <p className="text-white font-medium truncate">
                      {formatValue(field.value, field.type)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {field.source === 'AI Extraction' ? (
                      <span className="flex items-center gap-1 text-xs text-blue-400">
                        <Sparkles className="w-3 h-3" />
                        AI
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <Edit2 className="w-3 h-3" />
                        Manual
                      </span>
                    )}
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Files to be modified */}
      <div className="bg-zinc-800/50 rounded-xl p-4">
        <h3 className="text-zinc-300 font-medium mb-3">Files to be updated:</h3>
        <div className="space-y-2">
          {['config.json', 'gst.json', 'brand.json'].map(file => (
            <div
              key={file}
              className="flex items-center gap-2 text-sm"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-zinc-400">{file}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={committing}
          className="flex-1 py-3 rounded-xl font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-all min-h-[48px] flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Edit
        </button>
        <button
          onClick={onCommit}
          disabled={committing}
          className={`
            flex-1 py-3 rounded-xl font-semibold transition-all min-h-[48px]
            flex items-center justify-center gap-2
            ${committing
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'}
          `}
        >
          {committing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Committing...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Commit Changes
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

export default ReviewPhase
