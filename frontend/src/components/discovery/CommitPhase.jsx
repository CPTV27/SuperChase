import { motion } from 'framer-motion'
import { CheckCircle, FileCheck, ArrowRight, Sparkles } from 'lucide-react'

export function CommitPhase({ filesModified, businessId, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 text-center"
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center"
      >
        <CheckCircle className="w-10 h-10 text-emerald-400" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-white">Discovery Complete!</h2>
        <p className="text-zinc-400 mt-2">
          Business data has been committed to your configuration files
        </p>
      </div>

      {/* Files modified */}
      <div className="bg-zinc-800/50 rounded-xl p-6">
        <h3 className="text-zinc-300 font-medium mb-4">Files Updated</h3>
        <div className="space-y-3">
          {(filesModified || ['config.json', 'gst.json', 'brand.json']).map((file, index) => (
            <motion.div
              key={file}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
            >
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-zinc-300 flex-1 text-left">clients/{businessId}/{file}</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Next steps */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h3 className="text-blue-300 font-medium">What's Next</h3>
        </div>
        <p className="text-zinc-400 text-sm">
          Your business is now configured with the extracted data. You can:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-left">
          <li className="flex items-start gap-2">
            <span className="text-blue-400">1.</span>
            <span className="text-zinc-300">Run competitive intelligence to generate battlecards</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400">2.</span>
            <span className="text-zinc-300">Generate content sprints with the Content Council</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400">3.</span>
            <span className="text-zinc-300">View your GST dashboard for goal tracking</span>
          </li>
        </ul>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <a
          href={`/gst/${businessId}`}
          className="flex-1 py-3 rounded-xl font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-all min-h-[48px] flex items-center justify-center gap-2"
        >
          View GST Dashboard
        </a>
        <button
          onClick={onDone}
          className="flex-1 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all min-h-[48px] flex items-center justify-center gap-2"
        >
          Done
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  )
}

export default CommitPhase
