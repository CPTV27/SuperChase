import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Building2, ArrowLeft, FileText, Sparkles, CheckCircle } from 'lucide-react'
import DiscoveryWizard from '../components/discovery/DiscoveryWizard'

export function DiscoveryPortal() {
  const { businessId: paramBusinessId } = useParams()
  const navigate = useNavigate()
  const [businessId, setBusinessId] = useState(paramBusinessId || '')
  const [started, setStarted] = useState(!!paramBusinessId)

  const handleStart = (e) => {
    e.preventDefault()
    if (businessId.trim()) {
      const normalizedId = businessId.toLowerCase().replace(/[^a-z0-9]/g, '')
      setBusinessId(normalizedId)
      setStarted(true)
      // Update URL
      navigate(`/discover/${normalizedId}`, { replace: true })
    }
  }

  const handleComplete = (completedBusinessId) => {
    // Navigate to the GST dashboard or back to main
    navigate(`/gst/${completedBusinessId}`)
  }

  // Show business selection if no businessId
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
              <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Business Discovery Portal</h1>
              <p className="text-zinc-400 mt-2">
                Upload documents and let AI extract business intelligence
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg">
                <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-zinc-300 text-sm font-medium">Document Upload</p>
                  <p className="text-zinc-500 text-xs">PDFs, spreadsheets, and text files</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-zinc-300 text-sm font-medium">AI Extraction</p>
                  <p className="text-zinc-500 text-xs">Automatic data extraction using Claude</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-zinc-300 text-sm font-medium">Review & Approve</p>
                  <p className="text-zinc-500 text-xs">Verify data before committing</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleStart}>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  placeholder="Enter business ID (e.g., s2p, studio, bigmuddy)"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-700/50
                           rounded-xl text-white placeholder-zinc-500
                           focus:outline-none focus:border-purple-500/50 text-lg"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!businessId.trim()}
                className={`
                  w-full mt-4 py-4 rounded-xl font-semibold text-lg
                  transition-all min-h-[56px]
                  ${businessId.trim()
                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }
                `}
              >
                Start Discovery
              </button>
            </form>

            <p className="text-center text-xs text-zinc-600 mt-6">
              Upload documents like business plans, financial reports, or competitive analyses
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  // Show discovery wizard
  return (
    <div className="relative">
      {/* Back button */}
      <button
        onClick={() => {
          setStarted(false)
          navigate('/discover')
        }}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      <DiscoveryWizard
        businessId={businessId}
        onComplete={handleComplete}
      />
    </div>
  )
}

export default DiscoveryPortal
