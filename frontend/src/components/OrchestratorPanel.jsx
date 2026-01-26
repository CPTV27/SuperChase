import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Brain,
  Loader2,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Save,
  ListTodo,
  Trash2,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

/**
 * Chase OS v2 - Orchestrator Panel
 *
 * Conversational command center that dispatches to the AI council
 * and streams responses in real-time.
 */

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://superchase-production.up.railway.app'
  : '')
const API_KEY = 'sc_676782661b25ced4ffaa25c0a5b4bfa7b07985f6b49fe0ee'

// Council member colors and icons
const COUNCIL_COLORS = {
  grok: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', emoji: '🔴' },
  gemini: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', emoji: '🟡' },
  gpt4: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', emoji: '🔵' },
  claude: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', emoji: '🟣' }
}

function CouncilMemberCard({ member, response, isLoading, isError }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const colors = COUNCIL_COLORS[member.id] || COUNCIL_COLORS.claude

  // Extract content from response
  const content = response?.response?.content || response?.response || response?.error || ''
  const timing = response?.timing
  const preview = content.substring(0, 150) + (content.length > 150 ? '...' : '')

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        rounded-xl border ${colors.border} ${colors.bg}
        p-4 backdrop-blur-sm transition-all
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{colors.emoji}</span>
          <span className={`font-semibold ${colors.text}`}>{member.name}</span>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
        {!isLoading && !isError && response && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="w-3 h-3" />
            {(timing / 1000).toFixed(1)}s
          </div>
        )}
        {isError && <XCircle className="w-4 h-4 text-red-400" />}
      </div>

      <p className="text-xs text-zinc-500 mb-2">{member.strength}</p>

      {content && (
        <>
          <div className={`text-sm text-zinc-300 ${isExpanded ? '' : 'line-clamp-3'}`}>
            {isExpanded ? content : preview}
          </div>
          {content.length > 150 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mt-2"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      )}

      {isLoading && !content && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
          Thinking...
        </div>
      )}
    </motion.div>
  )
}

function SynthesisCard({ synthesis, isLoading }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const content = synthesis?.content || synthesis || ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-6 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-emerald-400">Synthesis</span>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />}
        {!isLoading && content && <CheckCircle className="w-4 h-4 text-emerald-400" />}
      </div>

      {isLoading && !content && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Synthesizing council responses...
        </div>
      )}

      {content && (
        <div className="prose prose-invert prose-sm max-w-none">
          <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function SessionHistoryItem({ session, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
    >
      <p className="text-sm text-zinc-300 line-clamp-1">{session.question}</p>
      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {(session.time / 1000).toFixed(1)}s
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          ${session.cost?.toFixed(3)}
        </span>
        <span>{session.successCount}/4 models</span>
      </div>
    </button>
  )
}

export default function OrchestratorPanel() {
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [councilConfig, setCouncilConfig] = useState(null)
  const [currentSession, setCurrentSession] = useState(null)
  const [councilResponses, setCouncilResponses] = useState({})
  const [synthesis, setSynthesis] = useState(null)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [sessions, setSessions] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [status, setStatus] = useState('')
  const inputRef = useRef(null)

  // Load council config on mount
  useEffect(() => {
    fetchCouncilConfig()
    fetchSessions()
  }, [])

  async function fetchCouncilConfig() {
    try {
      const res = await fetch(`${API_BASE}/api/orchestrate/council`, {
        headers: { 'X-API-Key': API_KEY }
      })
      const data = await res.json()
      if (data.success) {
        setCouncilConfig(data.council)
      }
    } catch (err) {
      console.error('Failed to fetch council config:', err)
    }
  }

  async function fetchSessions() {
    try {
      const res = await fetch(`${API_BASE}/api/orchestrate/sessions?limit=10`, {
        headers: { 'X-API-Key': API_KEY }
      })
      const data = await res.json()
      if (data.success) {
        setSessions(data.sessions)
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!question.trim() || isLoading) return

    setIsLoading(true)
    setCouncilResponses({})
    setSynthesis(null)
    setStatus('Generating research brief...')
    setCurrentSession({ question })

    try {
      // Use SSE streaming endpoint
      const response = await fetch(`${API_BASE}/api/orchestrate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ question })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))
              handleStreamEvent(event)
            } catch (err) {
              console.error('Failed to parse SSE event:', err)
            }
          }
        }
      }
    } catch (err) {
      console.error('Orchestration failed:', err)
      setStatus('Error: ' + err.message)
    } finally {
      setIsLoading(false)
      fetchSessions()
    }
  }

  function handleStreamEvent(event) {
    switch (event.type) {
      case 'start':
        setStatus('Dispatching to council...')
        break
      case 'generating_brief':
        setStatus('Generating research brief...')
        break
      case 'brief_ready':
        setStatus('Research brief ready. Dispatching to council...')
        setCurrentSession(prev => ({ ...prev, brief: event.brief }))
        break
      case 'dispatching':
        setStatus(`Dispatching to ${event.members?.length || 4} council members...`)
        break
      case 'council_response':
        setCouncilResponses(prev => ({
          ...prev,
          [event.memberId]: {
            response: event.response,
            timing: event.timing
          }
        }))
        setStatus(`Received response from ${event.memberName}`)
        break
      case 'council_error':
        setCouncilResponses(prev => ({
          ...prev,
          [event.memberId]: {
            error: event.error
          }
        }))
        break
      case 'synthesizing':
        setIsSynthesizing(true)
        setStatus('Synthesizing council responses...')
        break
      case 'synthesis_complete':
        setIsSynthesizing(false)
        setSynthesis(event.synthesis)
        setStatus('Synthesis complete')
        break
      case 'complete':
        setCurrentSession(prev => ({ ...prev, ...event.result }))
        setStatus('Done')
        break
      case 'error':
        setStatus('Error: ' + event.error)
        break
      case 'done':
        setCurrentSession(prev => ({ ...prev, ...event.result }))
        setStatus('Done')
        break
    }
  }

  // Fallback to non-streaming if SSE fails
  async function handleSubmitFallback() {
    setIsLoading(true)
    setCouncilResponses({})
    setSynthesis(null)
    setStatus('Processing...')

    try {
      const res = await fetch(`${API_BASE}/api/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ question })
      })
      const data = await res.json()

      if (data.success) {
        setCurrentSession(data)
        // Populate council responses
        const responses = {}
        for (const member of data.council || []) {
          responses[member.memberId] = member
        }
        setCouncilResponses(responses)
        setSynthesis(data.synthesis)
        setStatus('Done')
      } else {
        setStatus('Error: ' + data.error)
      }
    } catch (err) {
      setStatus('Error: ' + err.message)
    } finally {
      setIsLoading(false)
      fetchSessions()
    }
  }

  function loadSession(session) {
    // Fetch full session details
    fetch(`${API_BASE}/api/orchestrate/sessions/${session.traceId}`, {
      headers: { 'X-API-Key': API_KEY }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.session) {
          setCurrentSession(data.session)
          setQuestion(data.session.question)
          const responses = {}
          for (const member of data.session.council || []) {
            responses[member.memberId] = member
          }
          setCouncilResponses(responses)
          setSynthesis(data.session.synthesis)
          setShowHistory(false)
        }
      })
  }

  const councilMembers = councilConfig ? Object.entries(councilConfig).map(([id, m]) => ({
    id,
    name: m.name,
    strength: m.strength
  })) : []

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-400" />
              Chase OS Orchestrator
            </h1>
            <p className="text-zinc-500 mt-1">
              Ask anything. Get insights from Grok, Gemini, GPT-4, and Claude.
            </p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
              ${showHistory ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}
            `}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Input */}
            <form onSubmit={handleSubmit} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What do you want to know?"
                className="
                  w-full bg-zinc-900 border border-zinc-800 rounded-xl
                  px-6 py-4 pr-14 text-lg
                  focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                  placeholder-zinc-600
                "
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="
                  absolute right-3 top-1/2 -translate-y-1/2
                  p-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-50
                  transition-colors
                "
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>

            {/* Status */}
            {status && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {status}
              </div>
            )}

            {/* Research Brief */}
            {currentSession?.brief && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">Research Brief</h3>
                <p className="text-zinc-300">{currentSession.brief.coreQuestion}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentSession.brief.researchAngles?.map((angle, i) => (
                    <span key={i} className="px-2 py-1 text-xs rounded-full bg-zinc-800 text-zinc-400">
                      {angle}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Council Grid */}
            {councilMembers.length > 0 && (currentSession || isLoading) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {councilMembers.map(member => (
                  <CouncilMemberCard
                    key={member.id}
                    member={member}
                    response={councilResponses[member.id]}
                    isLoading={isLoading && !councilResponses[member.id]}
                    isError={councilResponses[member.id]?.error}
                  />
                ))}
              </div>
            )}

            {/* Synthesis */}
            {(synthesis || isSynthesizing) && (
              <SynthesisCard synthesis={synthesis} isLoading={isSynthesizing} />
            )}

            {/* Actions */}
            {synthesis && !isLoading && (
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                  <Save className="w-4 h-4" />
                  Save to Notebook
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                  <ListTodo className="w-4 h-4" />
                  Create Task
                </button>
                <button
                  onClick={() => {
                    setCurrentSession(null)
                    setCouncilResponses({})
                    setSynthesis(null)
                    setQuestion('')
                    setStatus('')
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>
            )}

            {/* Meta */}
            {currentSession?.meta && (
              <div className="flex items-center gap-6 text-sm text-zinc-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {(currentSession.meta.totalTime / 1000).toFixed(1)}s
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  ${currentSession.meta.totalCost?.toFixed(3)}
                </span>
                <span>
                  {currentSession.meta.successCount}/{currentSession.meta.successCount + currentSession.meta.failCount} models
                </span>
              </div>
            )}
          </div>

          {/* Sidebar - History */}
          <div className={`lg:block ${showHistory ? 'block' : 'hidden'}`}>
            <div className="sticky top-6">
              <h3 className="text-sm font-semibold text-zinc-400 mb-4">Recent Sessions</h3>
              <div className="space-y-2">
                {sessions.map(session => (
                  <SessionHistoryItem
                    key={session.traceId}
                    session={session}
                    onClick={() => loadSession(session)}
                  />
                ))}
                {sessions.length === 0 && (
                  <p className="text-sm text-zinc-600">No sessions yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
