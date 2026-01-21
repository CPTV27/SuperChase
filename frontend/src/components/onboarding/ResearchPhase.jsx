import { motion } from 'framer-motion'
import { Loader2, Check, X, Globe, FileText, Database, FolderSearch } from 'lucide-react'

const stepIcons = {
  web: Globe,
  internal: FileText,
  limitless: Database,
  portfolio: FolderSearch,
}

export function ResearchPhase({ steps, error }) {
  const completedCount = steps.filter(s => s.status === 'complete').length
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <h2 className="text-xl font-semibold text-white">
        Researching Your Business
      </h2>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = stepIcons[step.id] || Globe

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                flex items-center gap-4 p-4 rounded-xl
                transition-colors duration-300
                ${step.status === 'complete'
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : step.status === 'error'
                    ? 'bg-red-500/10 border border-red-500/20'
                    : 'bg-zinc-800/50 border border-zinc-700/50'
                }
              `}
            >
              {/* Status icon */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${step.status === 'complete'
                  ? 'bg-emerald-500/20'
                  : step.status === 'error'
                    ? 'bg-red-500/20'
                    : step.status === 'loading'
                      ? 'bg-blue-500/20'
                      : 'bg-zinc-700'
                }
              `}>
                {step.status === 'loading' && (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                )}
                {step.status === 'complete' && (
                  <Check className="w-5 h-5 text-emerald-400" />
                )}
                {step.status === 'error' && (
                  <X className="w-5 h-5 text-red-400" />
                )}
                {step.status === 'pending' && (
                  <Icon className="w-5 h-5 text-zinc-500" />
                )}
              </div>

              {/* Label */}
              <div className="flex-1">
                <p className={`font-medium ${
                  step.status === 'complete'
                    ? 'text-emerald-400'
                    : step.status === 'error'
                      ? 'text-red-400'
                      : step.status === 'loading'
                        ? 'text-white'
                        : 'text-zinc-400'
                }`}>
                  {step.label}
                </p>
                {step.source && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {step.source}
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Research Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Helper text */}
      <p className="text-center text-sm text-zinc-500">
        This typically takes 5-10 seconds
      </p>
    </motion.div>
  )
}

export default ResearchPhase
