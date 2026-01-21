import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, FileText, Check, Loader2, AlertCircle, Zap } from 'lucide-react'

const extractionSteps = [
  { id: 'parse', label: 'Parsing documents...' },
  { id: 'analyze', label: 'Analyzing content structure...' },
  { id: 'extract', label: 'Extracting business data...' },
  { id: 'validate', label: 'Validating extracted fields...' },
]

export function ExtractionPhase({ uploads, extracting, extractedFields, summary, onExtract, error }) {
  const [steps, setSteps] = useState(
    extractionSteps.map(s => ({ ...s, status: 'pending' }))
  )
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (extracting) {
      // Simulate step progression
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < steps.length - 1) {
            setSteps(prevSteps =>
              prevSteps.map((s, i) => ({
                ...s,
                status: i <= prev ? 'complete' : i === prev + 1 ? 'loading' : s.status,
              }))
            )
            return prev + 1
          }
          return prev
        })
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [extracting])

  useEffect(() => {
    if (extractedFields.length > 0) {
      // Mark all steps complete when we have results
      setSteps(prev => prev.map(s => ({ ...s, status: 'complete' })))
    }
  }, [extractedFields])

  const hasResults = extractedFields.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white">AI Extraction</h2>
        <p className="text-zinc-400 mt-1">
          Extracting structured data from {uploads.length} document{uploads.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Document list */}
      <div className="grid gap-2">
        {uploads.map((file, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
          >
            <FileText className="w-5 h-5 text-zinc-400" />
            <span className="flex-1 text-zinc-300 text-sm truncate">{file.filename}</span>
            {hasResults && <Check className="w-5 h-5 text-green-400" />}
          </div>
        ))}
      </div>

      {/* Extraction button */}
      {!extracting && !hasResults && (
        <button
          onClick={onExtract}
          className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white transition-all min-h-[56px] flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Start AI Extraction
        </button>
      )}

      {/* Extraction progress */}
      {extracting && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 py-4">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            <span className="text-zinc-300">Processing documents...</span>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg transition-colors
                  ${step.status === 'complete' ? 'bg-green-500/10' : ''}
                  ${step.status === 'loading' ? 'bg-blue-500/10' : ''}
                  ${step.status === 'pending' ? 'bg-zinc-800/30' : ''}
                `}
              >
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center
                  ${step.status === 'complete' ? 'bg-green-500 text-white' : ''}
                  ${step.status === 'loading' ? 'bg-blue-500 text-white' : ''}
                  ${step.status === 'pending' ? 'bg-zinc-700 text-zinc-500' : ''}
                `}>
                  {step.status === 'complete' && <Check className="w-4 h-4" />}
                  {step.status === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {step.status === 'pending' && <span className="text-xs">{index + 1}</span>}
                </div>
                <span className={`
                  text-sm
                  ${step.status === 'complete' ? 'text-green-400' : ''}
                  ${step.status === 'loading' ? 'text-blue-400' : ''}
                  ${step.status === 'pending' ? 'text-zinc-500' : ''}
                `}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results preview */}
      {hasResults && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 text-green-400">
            <Zap className="w-5 h-5" />
            <span className="font-medium">Extraction complete!</span>
          </div>

          {summary && (
            <div className="p-4 bg-zinc-800/50 rounded-xl">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Summary</h3>
              <p className="text-zinc-300 text-sm">{summary}</p>
            </div>
          )}

          <div className="p-4 bg-zinc-800/50 rounded-xl">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Extracted Fields</h3>
            <div className="grid gap-2">
              {extractedFields.slice(0, 5).map((field, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-lg"
                >
                  <span className="text-zinc-400 text-sm">{field.key}</span>
                  <span className="text-zinc-200 text-sm font-medium">
                    {typeof field.value === 'string' && field.value.length > 30
                      ? field.value.substring(0, 30) + '...'
                      : String(field.value)}
                  </span>
                </div>
              ))}
              {extractedFields.length > 5 && (
                <p className="text-zinc-500 text-sm text-center">
                  +{extractedFields.length - 5} more fields
                </p>
              )}
            </div>
          </div>

          <p className="text-center text-zinc-400 text-sm">
            Review and complete the data in the next step
          </p>
        </motion.div>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={onExtract}
              className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default ExtractionPhase
