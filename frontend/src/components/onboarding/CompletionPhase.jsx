import { motion } from 'framer-motion'
import { CheckCircle, FileJson, ExternalLink, Sparkles, ArrowRight, RotateCcw } from 'lucide-react'

export function CompletionPhase({ filesCreated, businessId, businessName, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
        className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full
                 flex items-center justify-center"
      >
        <Sparkles className="w-10 h-10 text-emerald-400" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-white">
          Onboarding Complete!
        </h2>
        <p className="text-zinc-400 mt-2">
          <span className="text-emerald-400 font-semibold">{businessName}</span> is now ready for AI-powered automation
        </p>
      </div>

      {/* Files created */}
      {filesCreated && filesCreated.length > 0 && (
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-5 text-left">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">
            Files Created
          </h3>
          <div className="space-y-2">
            {filesCreated.map((file, index) => (
              <motion.div
                key={file}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <FileJson className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-zinc-300 font-mono text-sm truncate">{file}</span>
                <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Context injection status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4"
      >
        <p className="text-blue-400 text-sm">
          <strong>Context Injection Ready</strong>
        </p>
        <p className="text-zinc-400 text-xs mt-1">
          The LLM Council will now automatically use @{businessId} data when mentioned in queries
        </p>
      </motion.div>

      {/* Test command */}
      <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-2">Test the integration:</p>
        <code className="text-sm text-emerald-400 font-mono">
          "What marketing strategy should @{businessId} pursue?"
        </code>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => window.location.href = `/clients/${businessId}`}
          className="flex-1 py-4 bg-blue-600 hover:bg-blue-500
                   text-white font-semibold rounded-xl
                   min-h-[56px] transition-colors
                   flex items-center justify-center gap-2"
        >
          View Client Dashboard
          <ExternalLink className="w-4 h-4" />
        </button>
        <button
          onClick={() => window.location.reload()}
          className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700
                   text-white font-semibold rounded-xl
                   min-h-[56px] transition-colors
                   flex items-center justify-center gap-2"
        >
          Onboard Another
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Next steps hint */}
      <div className="pt-4 border-t border-zinc-800">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Next Steps</h4>
        <div className="space-y-2 text-left">
          {[
            'Add detailed pricing to config.json',
            'Define strategies in gst.json',
            `Generate content with /marketing-brief @${businessId}`,
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-zinc-500">
              <ArrowRight className="w-3 h-3 text-zinc-600" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default CompletionPhase
