import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Search,
  FileEdit,
  Send,
  Mic,
  Target,
  ChevronUp,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react'

// Agent configurations
const AGENTS = [
  {
    id: 'scout',
    name: 'Scout',
    icon: Search,
    color: '#a855f7',
    command: '/limitless-scout',
    description: 'Process Pendant lifelogs',
    endpoint: '/api/limitless/scout'
  },
  {
    id: 'brief',
    name: 'Brief',
    icon: Target,
    color: '#3b82f6',
    command: '/marketing-brief',
    description: 'Generate content brief',
    endpoint: '/api/marketing/brief',
    requiresClient: true
  },
  {
    id: 'draft',
    name: 'Draft',
    icon: FileEdit,
    color: '#10b981',
    command: '/marketing-draft',
    description: 'Draft blog + thread',
    endpoint: '/api/marketing/draft'
  },
  {
    id: 'publish',
    name: 'Publish',
    icon: Send,
    color: '#f97316',
    command: '/marketing-publish',
    description: 'Publish to X.com + blog',
    endpoint: '/api/marketing/publish'
  }
]

// Client options for brief generation
const CLIENTS = [
  { id: 's2p', name: 'Scan2Plan', color: '#3b82f6' },
  { id: 'bigmuddy', name: 'Big Muddy', color: '#8b4513' },
  { id: 'studioc', name: 'Studio C', color: '#8b0000' },
  { id: 'tuthill', name: 'Tuthill', color: '#c9a227' },
  { id: 'utopia', name: 'Utopia', color: '#4a7c59' },
  { id: 'cptv', name: 'CPTV', color: '#ff0066' }
]

// API configuration
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://superchase-production.up.railway.app'
  : '')
const API_KEY = 'sc_676782661b25ced4ffaa25c0a5b4bfa7b07985f6b49fe0ee'

// Agent button component
function AgentButton({ agent, isRunning, onTrigger, disabled }) {
  const Icon = agent.icon

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={() => !disabled && onTrigger(agent)}
      disabled={disabled || isRunning}
      className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all touch-target"
      style={{
        background: isRunning ? `${agent.color}40` : `${agent.color}20`,
        border: `1px solid ${agent.color}50`,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      {isRunning ? (
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: agent.color }} />
      ) : (
        <Icon className="w-4 h-4" style={{ color: agent.color }} />
      )}
      <span className="text-sm font-medium" style={{ color: agent.color }}>
        {agent.name}
      </span>
    </motion.button>
  )
}

// Result toast component
function ResultToast({ result, onClose }) {
  const isSuccess = result.success
  const Icon = isSuccess ? CheckCircle2 : AlertCircle

  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-24 right-4 z-50 max-w-sm"
    >
      <div className={`flex items-start gap-3 p-4 rounded-xl shadow-lg ${
        isSuccess ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'
      }`}>
        <Icon className={`w-5 h-5 flex-shrink-0 ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${isSuccess ? 'text-emerald-300' : 'text-red-300'}`}>
            {result.agent} {isSuccess ? 'Complete' : 'Failed'}
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            {result.message || (isSuccess ? 'Task completed successfully' : result.error || 'Unknown error')}
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

// Client selector modal
function ClientSelector({ isOpen, onSelect, onClose }) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Select Client</h3>
        <div className="grid grid-cols-2 gap-3">
          {CLIENTS.map(client => (
            <motion.button
              key={client.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(client.id)}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: client.color }}
              />
              <span className="text-sm text-zinc-200">{client.name}</span>
            </motion.button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  )
}

// Main AgentTriggerBar component
export default function AgentTriggerBar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [runningAgent, setRunningAgent] = useState(null)
  const [results, setResults] = useState([])
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [pendingAgent, setPendingAgent] = useState(null)

  async function triggerAgent(agent, clientId = null) {
    setRunningAgent(agent.id)

    try {
      const body = clientId ? { clientId } : {}

      const response = await fetch(`${API_BASE}${agent.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      const result = {
        id: Date.now(),
        agent: agent.name,
        success: data.success !== false && !data.error,
        message: data.message || (data.findings ? `${data.findings} findings` : null),
        error: data.error
      }

      setResults(prev => [...prev, result])
    } catch (error) {
      setResults(prev => [...prev, {
        id: Date.now(),
        agent: agent.name,
        success: false,
        error: error.message
      }])
    }

    setRunningAgent(null)
  }

  function handleTrigger(agent) {
    if (agent.requiresClient) {
      setPendingAgent(agent)
      setShowClientSelector(true)
    } else {
      triggerAgent(agent)
    }
  }

  function handleClientSelect(clientId) {
    setShowClientSelector(false)
    if (pendingAgent) {
      triggerAgent(pendingAgent, clientId)
      setPendingAgent(null)
    }
  }

  function removeResult(id) {
    setResults(prev => prev.filter(r => r.id !== id))
  }

  return (
    <>
      {/* Result toasts */}
      <AnimatePresence>
        {results.map(result => (
          <ResultToast
            key={result.id}
            result={result}
            onClose={() => removeResult(result.id)}
          />
        ))}
      </AnimatePresence>

      {/* Client selector modal */}
      <AnimatePresence>
        {showClientSelector && (
          <ClientSelector
            isOpen={showClientSelector}
            onSelect={handleClientSelect}
            onClose={() => {
              setShowClientSelector(false)
              setPendingAgent(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Main trigger bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40"
      >
        <div className="glass rounded-2xl shadow-2xl border border-zinc-800/50 overflow-hidden">
          {/* Expanded content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-zinc-300">Agent Commands</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {AGENTS.map(agent => (
                      <AgentButton
                        key={agent.id}
                        agent={agent}
                        isRunning={runningAgent === agent.id}
                        onTrigger={handleTrigger}
                        disabled={runningAgent !== null && runningAgent !== agent.id}
                      />
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-zinc-600 text-center">
                    These trigger the same actions as CLI commands
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle bar */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 hover:bg-zinc-800/30 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-zinc-300">
              {isExpanded ? 'Hide Agents' : 'Trigger Agents'}
            </span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            </motion.div>
          </button>
        </div>
      </motion.div>
    </>
  )
}
