import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Building2 } from 'lucide-react'
import { useOnboarding } from '../../hooks/useOnboarding'
import ProgressBar from './ProgressBar'
import ResearchPhase from './ResearchPhase'
import ConfirmationPhase from './ConfirmationPhase'
import GapFillingPhase from './GapFillingPhase'
import CompletionPhase from './CompletionPhase'

const phaseDescriptions = {
  RESEARCH: 'Gathering information from web and internal sources...',
  CONFIRM: 'Review and correct the data we found',
  GAP_FILL: 'Answer a few questions to fill in the gaps',
  COMPLETE: 'Your business is ready to use!',
}

export function OnboardingWizard({ initialBusinessName = null, onComplete }) {
  const [businessName, setBusinessName] = useState(initialBusinessName || '')
  const [started, setStarted] = useState(!!initialBusinessName)

  const { state, actions } = useOnboarding(started ? businessName : null)

  const handleStart = (e) => {
    e.preventDefault()
    if (businessName.trim()) {
      setStarted(true)
    }
  }

  const handleComplete = () => {
    if (onComplete) {
      onComplete(state.businessId)
    }
  }

  // Initial input screen
  if (!started) {
    return (
      <div className="min-h-screen bg-zinc-950 p-4 md:p-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg"
        >
          <div className="glass rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Onboard New Business</h1>
              <p className="text-zinc-400 mt-2">
                Enter a business name and we'll research it automatically
              </p>
            </div>

            <form onSubmit={handleStart}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Big Muddy Inn, Studio C..."
                  className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-700/50
                           rounded-xl text-white placeholder-zinc-500
                           focus:outline-none focus:border-blue-500/50 text-lg"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!businessName.trim()}
                className={`
                  w-full mt-4 py-4 rounded-xl font-semibold text-lg
                  transition-all min-h-[56px]
                  ${businessName.trim()
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }
                `}
              >
                Start Research
              </button>
            </form>

            <p className="text-center text-xs text-zinc-600 mt-6">
              The agent will search the web and internal data to minimize questions
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  // Main wizard
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            Onboarding: {state.businessName}
          </h1>
          <p className="text-zinc-400 mt-1">
            {phaseDescriptions[state.phase]}
          </p>
        </div>

        {/* Progress Bar */}
        <ProgressBar currentPhase={state.phase} />

        {/* Phase Content */}
        <div className="glass rounded-2xl p-6 mt-6">
          <AnimatePresence mode="wait">
            {state.phase === 'RESEARCH' && (
              <ResearchPhase
                key="research"
                steps={state.researchSteps}
                error={state.error}
              />
            )}
            {state.phase === 'CONFIRM' && (
              <ConfirmationPhase
                key="confirm"
                data={state.researchedData}
                onConfirm={actions.confirmData}
                onEdit={actions.updateField}
              />
            )}
            {state.phase === 'GAP_FILL' && (
              <GapFillingPhase
                key="gaps"
                questions={state.gaps}
                onSubmit={actions.submitGaps}
              />
            )}
            {state.phase === 'COMPLETE' && (
              <CompletionPhase
                key="complete"
                filesCreated={state.filesCreated}
                businessId={state.businessId}
                businessName={state.businessName}
                onDone={handleComplete}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Error display */}
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
          >
            <p className="text-red-400 text-sm">{state.error}</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default OnboardingWizard
