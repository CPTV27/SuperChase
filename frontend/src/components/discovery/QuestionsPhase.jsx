import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertCircle, ChevronDown, ChevronUp, Sparkles, ArrowRight } from 'lucide-react'

const confidenceColors = {
  high: 'text-green-400',
  medium: 'text-yellow-400',
  low: 'text-orange-400',
}

export function QuestionsPhase({ questions, extractedFields, answers, onUpdateAnswer, onSubmit }) {
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Get all categories
  const categories = Object.entries(questions || {})

  // Calculate completion stats
  const allQuestions = categories.flatMap(([_, cat]) => cat.questions)
  const answeredCount = allQuestions.filter(q =>
    q.status === 'extracted' || answers[q.id]
  ).length

  const toggleCategory = (categoryId) => {
    setExpandedCategory(prev => prev === categoryId ? null : categoryId)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    await onSubmit()
    setSubmitting(false)
  }

  const renderInput = (question) => {
    const currentValue = answers[question.id] ?? question.extractedValue ?? ''

    switch (question.type) {
      case 'select':
        return (
          <select
            value={currentValue}
            onChange={(e) => onUpdateAnswer(question.id, e.target.value)}
            className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white
                       focus:outline-none focus:border-blue-500"
          >
            <option value="">Select...</option>
            {(question.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )

      case 'textarea':
        return (
          <textarea
            value={currentValue}
            onChange={(e) => onUpdateAnswer(question.id, e.target.value)}
            rows={3}
            className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white
                       focus:outline-none focus:border-blue-500 resize-none"
            placeholder={`Enter ${question.label.toLowerCase()}...`}
          />
        )

      case 'list':
        return (
          <textarea
            value={Array.isArray(currentValue) ? currentValue.join('\n') : currentValue}
            onChange={(e) => onUpdateAnswer(question.id, e.target.value.split('\n').filter(Boolean))}
            rows={3}
            className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white
                       focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Enter items, one per line..."
          />
        )

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
            <input
              type="number"
              value={currentValue}
              onChange={(e) => onUpdateAnswer(question.id, parseFloat(e.target.value) || '')}
              className="w-full p-3 pl-8 bg-zinc-800 border border-zinc-700 rounded-lg text-white
                         focus:outline-none focus:border-blue-500"
              placeholder="0"
            />
          </div>
        )

      case 'percentage':
        return (
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              value={currentValue}
              onChange={(e) => onUpdateAnswer(question.id, parseFloat(e.target.value) || '')}
              className="w-full p-3 pr-8 bg-zinc-800 border border-zinc-700 rounded-lg text-white
                         focus:outline-none focus:border-blue-500"
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
          </div>
        )

      case 'number':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => onUpdateAnswer(question.id, parseInt(e.target.value) || '')}
            className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white
                       focus:outline-none focus:border-blue-500"
            placeholder="0"
          />
        )

      default:
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => onUpdateAnswer(question.id, e.target.value)}
            className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white
                       focus:outline-none focus:border-blue-500"
            placeholder={`Enter ${question.label.toLowerCase()}...`}
          />
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white">Review & Complete</h2>
        <p className="text-zinc-400 mt-1">
          Review extracted data and fill in any gaps
        </p>
      </div>

      {/* Completion progress */}
      <div className="bg-zinc-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400 text-sm">Completion</span>
          <span className="text-white font-medium">
            {answeredCount} / {allQuestions.length}
          </span>
        </div>
        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${(answeredCount / allQuestions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {categories.map(([categoryId, category]) => {
          const isExpanded = expandedCategory === categoryId
          const categoryAnswered = category.questions.filter(q =>
            q.status === 'extracted' || answers[q.id]
          ).length

          return (
            <div
              key={categoryId}
              className="border border-zinc-800 rounded-xl overflow-hidden"
            >
              {/* Category header */}
              <button
                onClick={() => toggleCategory(categoryId)}
                className="w-full flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{category.label}</span>
                  <span className="text-zinc-500 text-sm">
                    {categoryAnswered}/{category.questions.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-400" />
                )}
              </button>

              {/* Questions */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-4 border-t border-zinc-800">
                      {category.questions.map(question => (
                        <div key={question.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-zinc-300 text-sm font-medium">
                              {question.label}
                              {question.required && (
                                <span className="text-red-400 ml-1">*</span>
                              )}
                            </label>
                            {question.status === 'extracted' && (
                              <div className="flex items-center gap-1 text-xs">
                                <Sparkles className="w-3 h-3 text-blue-400" />
                                <span className={confidenceColors[
                                  question.confidence >= 0.9 ? 'high' :
                                  question.confidence >= 0.7 ? 'medium' : 'low'
                                ]}>
                                  AI extracted
                                </span>
                              </div>
                            )}
                          </div>

                          {renderInput(question)}

                          {question.source && (
                            <p className="text-zinc-500 text-xs italic">
                              Source: "{question.source}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className={`
          w-full py-4 rounded-xl font-semibold transition-all min-h-[56px]
          flex items-center justify-center gap-2
          ${submitting
            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white'}
        `}
      >
        {submitting ? (
          'Saving...'
        ) : (
          <>
            Continue to Review
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </motion.div>
  )
}

export default QuestionsPhase
