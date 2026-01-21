import { motion, AnimatePresence } from 'framer-motion'
import { useDiscovery } from '../../hooks/useDiscovery'
import ProgressBar from './ProgressBar'
import UploadPhase from './UploadPhase'
import ExtractionPhase from './ExtractionPhase'
import QuestionsPhase from './QuestionsPhase'
import ReviewPhase from './ReviewPhase'
import CommitPhase from './CommitPhase'

const phaseDescriptions = {
  UPLOAD: 'Upload documents containing business information',
  EXTRACT: 'AI is extracting structured data from your documents',
  QUESTIONS: 'Review extracted data and fill in any gaps',
  REVIEW: 'Review all data before committing',
  COMMIT: 'Discovery complete!',
}

export function DiscoveryWizard({ businessId, onComplete }) {
  const { state, actions, phases } = useDiscovery(businessId)

  const handleComplete = () => {
    if (onComplete) {
      onComplete(businessId, state.filesModified)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            Business Discovery: {state.businessName || businessId}
          </h1>
          <p className="text-zinc-400 mt-1">
            {phaseDescriptions[state.phase]}
          </p>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          phases={phases.filter(p => p !== 'INIT')}
          currentPhase={state.phase}
          progress={state.progress}
        />

        {/* Phase Content */}
        <div className="glass rounded-2xl p-6 mt-6">
          <AnimatePresence mode="wait">
            {state.phase === 'UPLOAD' && (
              <UploadPhase
                key="upload"
                uploads={state.uploads}
                uploading={state.uploading}
                onUpload={actions.uploadFiles}
                onContinue={() => actions.goToPhase('EXTRACT')}
                error={state.error}
              />
            )}
            {state.phase === 'EXTRACT' && (
              <ExtractionPhase
                key="extract"
                uploads={state.uploads}
                extracting={state.extracting}
                extractedFields={state.extractedFields}
                summary={state.summary}
                onExtract={actions.startExtraction}
                error={state.error}
              />
            )}
            {state.phase === 'QUESTIONS' && (
              <QuestionsPhase
                key="questions"
                questions={state.questions}
                extractedFields={state.extractedFields}
                answers={state.answers}
                onUpdateAnswer={actions.updateAnswer}
                onSubmit={actions.saveAnswers}
              />
            )}
            {state.phase === 'REVIEW' && (
              <ReviewPhase
                key="review"
                extractedFields={state.extractedFields}
                answers={state.answers}
                questions={state.questions}
                committing={state.committing}
                onCommit={actions.commitDiscovery}
                onBack={() => actions.goToPhase('QUESTIONS')}
              />
            )}
            {state.phase === 'COMMIT' && (
              <CommitPhase
                key="commit"
                filesModified={state.filesModified}
                businessId={businessId}
                onDone={handleComplete}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Error display */}
        {state.error && state.phase !== 'UPLOAD' && (
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

export default DiscoveryWizard
