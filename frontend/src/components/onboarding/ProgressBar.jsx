import { motion } from 'framer-motion'
import { Search, CheckCircle, HelpCircle, Sparkles } from 'lucide-react'

const phases = [
  { key: 'RESEARCH', label: 'Research', icon: Search },
  { key: 'CONFIRM', label: 'Confirm', icon: CheckCircle },
  { key: 'GAP_FILL', label: 'Questions', icon: HelpCircle },
  { key: 'COMPLETE', label: 'Complete', icon: Sparkles },
]

export function ProgressBar({ currentPhase }) {
  const currentIndex = phases.findIndex(p => p.key === currentPhase)

  return (
    <div className="flex items-center justify-between">
      {phases.map((phase, index) => {
        const Icon = phase.icon
        const isActive = index === currentIndex
        const isComplete = index < currentIndex

        return (
          <div key={phase.key} className="flex items-center">
            {/* Step circle */}
            <motion.div
              className={`
                w-11 h-11 rounded-full flex items-center justify-center
                transition-colors duration-300
                ${isComplete
                  ? 'bg-emerald-500'
                  : isActive
                    ? 'bg-blue-500'
                    : 'bg-zinc-800'
                }
              `}
              animate={{ scale: isActive ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Icon className="w-5 h-5 text-white" />
            </motion.div>

            {/* Label */}
            <span className={`
              ml-2 text-sm font-medium hidden sm:block
              transition-colors duration-300
              ${isActive ? 'text-white' : isComplete ? 'text-emerald-400' : 'text-zinc-500'}
            `}>
              {phase.label}
            </span>

            {/* Connector line */}
            {index < phases.length - 1 && (
              <div className="relative w-8 md:w-16 h-0.5 mx-2 bg-zinc-800 overflow-hidden rounded-full">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-emerald-500"
                  initial={{ width: '0%' }}
                  animate={{ width: isComplete ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ProgressBar
