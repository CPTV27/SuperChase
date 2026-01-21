import { motion } from 'framer-motion'
import { Check, Upload, Sparkles, HelpCircle, Eye, CheckCircle } from 'lucide-react'

const phaseIcons = {
  UPLOAD: Upload,
  EXTRACT: Sparkles,
  QUESTIONS: HelpCircle,
  REVIEW: Eye,
  COMMIT: CheckCircle,
}

const phaseLabels = {
  UPLOAD: 'Upload',
  EXTRACT: 'Extract',
  QUESTIONS: 'Questions',
  REVIEW: 'Review',
  COMMIT: 'Complete',
}

export function ProgressBar({ phases, currentPhase, progress }) {
  const currentIndex = phases.indexOf(currentPhase)

  return (
    <div className="mb-8">
      {/* Progress line */}
      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-zinc-800" />
        <motion.div
          className="absolute top-5 left-0 h-0.5 bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />

        {/* Phase indicators */}
        <div className="relative flex justify-between">
          {phases.map((phase, index) => {
            const Icon = phaseIcons[phase] || Check
            const isComplete = index < currentIndex
            const isCurrent = index === currentIndex
            const isPending = index > currentIndex

            return (
              <div
                key={phase}
                className="flex flex-col items-center"
              >
                <motion.div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    transition-colors duration-300
                    ${isComplete ? 'bg-blue-500 text-white' : ''}
                    ${isCurrent ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400' : ''}
                    ${isPending ? 'bg-zinc-800 text-zinc-500' : ''}
                  `}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </motion.div>
                <span className={`
                  mt-2 text-xs font-medium
                  ${isCurrent ? 'text-blue-400' : ''}
                  ${isComplete ? 'text-zinc-400' : ''}
                  ${isPending ? 'text-zinc-600' : ''}
                `}>
                  {phaseLabels[phase]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ProgressBar
