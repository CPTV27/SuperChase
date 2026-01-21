import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  FileEdit,
  Send,
  Target,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Brain,
  Users
} from 'lucide-react'
import ProjectAgentModal from './ProjectAgentModal'

// Agent configurations with circular button styling
const AGENTS = [
  {
    id: 'project-team',
    name: 'Team',
    icon: Users,
    color: '#ec4899',
    bgGradient: 'from-pink-500 to-purple-600',
    command: '/project-agent',
    description: 'Run agent team on project',
    isModal: true // Opens modal instead of API call
  },
  {
    id: 'briefing',
    name: 'Briefing',
    icon: Brain,
    color: '#8b5cf6',
    bgGradient: 'from-violet-500 to-purple-600',
    command: '/briefing',
    description: 'Generate daily briefing',
    endpoint: '/api/briefing/trigger'
  },
  {
    id: 'scout',
    name: 'Scout',
    icon: Search,
    color: '#a855f7',
    bgGradient: 'from-purple-500 to-violet-600',
    command: '/limitless-scout',
    description: 'Process Pendant lifelogs',
    endpoint: '/api/limitless/scout'
  },
  {
    id: 'brief',
    name: 'Brief',
    icon: Target,
    color: '#3b82f6',
    bgGradient: 'from-blue-500 to-cyan-600',
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
    bgGradient: 'from-emerald-500 to-teal-600',
    command: '/marketing-draft',
    description: 'Draft blog + thread',
    endpoint: '/api/marketing/draft'
  },
  {
    id: 'publish',
    name: 'Publish',
    icon: Send,
    color: '#f97316',
    bgGradient: 'from-orange-500 to-red-500',
    command: '/marketing-publish',
    description: 'Publish to X.com + blog',
    endpoint: '/api/marketing/publish'
  }
]

// Client options for brief generation
const CLIENTS = [
  { id: 's2p', name: 'Scan2Plan', color: '#3b82f6', icon: '🏗️' },
  { id: 'bigmuddy', name: 'Big Muddy', color: '#8b4513', icon: '🏨' },
  { id: 'studioc', name: 'Studio C', color: '#8b0000', icon: '🎬' },
  { id: 'tuthill', name: 'Tuthill', color: '#c9a227', icon: '🎨' },
  { id: 'utopia', name: 'Utopia', color: '#4a7c59', icon: '🎵' },
  { id: 'cptv', name: 'CPTV', color: '#ff0066', icon: '📺' }
]

// API configuration
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://superchase-production.up.railway.app'
  : '')
const API_KEY = 'sc_676782661b25ced4ffaa25c0a5b4bfa7b07985f6b49fe0ee'

// Circular Agent Button
function CircularAgentButton({ agent, isRunning, onTrigger, disabled }) {
  const Icon = agent.icon

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onClick={() => !disabled && onTrigger(agent)}
        disabled={disabled || isRunning}
        className={`
          relative w-14 h-14 rounded-full
          flex items-center justify-center
          shadow-lg transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          background: isRunning
            ? `${agent.color}80`
            : `linear-gradient(135deg, ${agent.color}, ${agent.color}dd)`,
          boxShadow: isRunning
            ? `0 0 20px ${agent.color}60`
            : `0 4px 20px ${agent.color}40`
        }}
      >
        {isRunning ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
          <Icon className="w-6 h-6 text-white" />
        )}

        {/* Pulse ring when running */}
        {isRunning && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${agent.color}` }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Label */}
      <span className="text-xs font-medium text-zinc-400">{agent.name}</span>
    </div>
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
      className="fixed bottom-28 right-4 z-50 max-w-sm"
    >
      <div className={`flex items-start gap-3 p-4 rounded-xl shadow-lg backdrop-blur-xl ${
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          Select Client for Brief
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {CLIENTS.map(client => (
            <motion.button
              key={client.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(client.id)}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left border border-transparent hover:border-zinc-700"
            >
              <span className="text-xl">{client.icon}</span>
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
  const [runningAgent, setRunningAgent] = useState(null)
  const [results, setResults] = useState([])
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [pendingAgent, setPendingAgent] = useState(null)
  const [showProjectModal, setShowProjectModal] = useState(false)

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
    if (agent.isModal) {
      setShowProjectModal(true)
    } else if (agent.requiresClient) {
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

      {/* Project Agent modal */}
      <ProjectAgentModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
      />

      {/* Floating circular trigger bar */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
      >
        <div className="glass rounded-full px-6 py-4 shadow-2xl border border-zinc-800/50">
          <div className="flex items-center gap-6">
            {/* Sparkles icon */}
            <div className="flex items-center gap-2 pr-4 border-r border-zinc-700/50">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-medium text-zinc-500 hidden sm:block">Agents</span>
            </div>

            {/* Agent buttons */}
            <div className="flex items-center gap-4">
              {AGENTS.map(agent => (
                <CircularAgentButton
                  key={agent.id}
                  agent={agent}
                  isRunning={runningAgent === agent.id}
                  onTrigger={handleTrigger}
                  disabled={runningAgent !== null && runningAgent !== agent.id}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
