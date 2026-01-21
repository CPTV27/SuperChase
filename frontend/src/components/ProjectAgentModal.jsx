import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Users,
  Target,
  FileText,
  TrendingUp,
  CheckCircle2,
  Loader2,
  X,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react'

/**
 * Project Agent Modal
 *
 * Interface for running autonomous agent teams on specific projects.
 * Allows selecting a project, specifying a task, and viewing agent results.
 */

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://superchase-production.up.railway.app'
  : '')
const API_KEY = 'sc_676782661b25ced4ffaa25c0a5b4bfa7b07985f6b49fe0ee'

// Agent type icons
const AGENT_ICONS = {
  strategist: TrendingUp,
  copywriter: FileText,
  analyst: Target,
  executor: CheckCircle2
}

const AGENT_COLORS = {
  strategist: '#a855f7',
  copywriter: '#3b82f6',
  analyst: '#10b981',
  executor: '#f59e0b'
}

function AgentResultCard({ agent, result }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = AGENT_ICONS[agent] || Brain
  const color = AGENT_COLORS[agent] || '#6b7280'

  if (!result || result.error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium capitalize">{agent}</span>
          <span className="text-sm text-red-300">- Failed</span>
        </div>
        {result?.error && (
          <p className="text-sm text-red-300 mt-2">{result.error}</p>
        )}
      </div>
    )
  }

  return (
    <motion.div
      layout
      className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-zinc-800/80 transition-colors"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="font-medium text-zinc-200 capitalize">{agent}</div>
          <div className="text-xs text-zinc-500">
            {result.recommendations?.length || 0} recommendations
          </div>
        </div>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }}>
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              {/* Analysis */}
              {result.analysis && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Analysis</div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{result.analysis}</p>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Recommendations</div>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              {result.actions?.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Actions</div>
                  <div className="space-y-2">
                    {result.actions.map((action, i) => (
                      <div key={i} className="p-3 bg-zinc-900/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-200">{action.action}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            action.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            action.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-zinc-700 text-zinc-400'
                          }`}>
                            {action.priority}
                          </span>
                        </div>
                        {(action.owner || action.timeline) && (
                          <div className="text-xs text-zinc-500 mt-1">
                            {action.owner && <span>{action.owner}</span>}
                            {action.owner && action.timeline && <span> • </span>}
                            {action.timeline && <span>{action.timeline}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Ideas */}
              {result.contentIdeas?.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Content Ideas</div>
                  <ul className="space-y-1">
                    {result.contentIdeas.map((idea, i) => (
                      <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-1 text-purple-400" />
                        {idea}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              {result.nextSteps && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="text-xs text-emerald-400 uppercase tracking-wide mb-1">Next Step</div>
                  <p className="text-sm text-emerald-300">{result.nextSteps}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ProjectAgentModal({ isOpen, onClose }) {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [task, setTask] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [loadingProjects, setLoadingProjects] = useState(true)

  // Fetch available projects
  useEffect(() => {
    if (isOpen) {
      fetchProjects()
    }
  }, [isOpen])

  async function fetchProjects() {
    setLoadingProjects(true)
    try {
      const response = await fetch(`${API_BASE}/api/projects`, {
        headers: { 'X-API-Key': API_KEY }
      })
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
    setLoadingProjects(false)
  }

  async function runAgentTeam() {
    if (!selectedProject || !task.trim()) return

    setLoading(true)
    setResults(null)

    try {
      const response = await fetch(`${API_BASE}/api/project-agent/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          task: task.trim()
        })
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Agent team error:', error)
      setResults({ error: error.message })
    }

    setLoading(false)
  }

  function handleClose() {
    setResults(null)
    setTask('')
    setSelectedProject(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Project Agent Team</h2>
              <p className="text-xs text-zinc-500">Run autonomous agents on a project</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Project Selection */}
          {!results && (
            <>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Select Project</label>
                {loadingProjects ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {projects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                          selectedProject?.id === project.id
                            ? 'bg-purple-500/20 border-2 border-purple-500/50'
                            : 'bg-zinc-800/50 border-2 border-transparent hover:border-zinc-700'
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <div>
                          <div className="text-sm font-medium text-zinc-200">{project.name}</div>
                          <div className="text-xs text-zinc-500 truncate">{project.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Task Input */}
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Task for Agent Team</label>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="e.g., Develop a Q1 marketing strategy focused on local businesses..."
                  className="w-full h-24 px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Agent Team Preview */}
              <div>
                <div className="text-sm text-zinc-400 mb-2">Agent Team</div>
                <div className="flex gap-2">
                  {Object.entries(AGENT_ICONS).map(([agent, Icon]) => (
                    <div
                      key={agent}
                      className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg"
                    >
                      <Icon className="w-4 h-4" style={{ color: AGENT_COLORS[agent] }} />
                      <span className="text-xs text-zinc-400 capitalize">{agent}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Results */}
          {results && !results.error && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Agent Team Complete</span>
              </div>

              <div className="text-sm text-zinc-400">
                Project: <span className="text-zinc-200">{results.projectId}</span> •
                Task: <span className="text-zinc-200">{results.task}</span>
              </div>

              <div className="space-y-3">
                {results.agents && Object.entries(results.agents).map(([agent, result]) => (
                  <AgentResultCard key={agent} agent={agent} result={result} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {results?.error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-red-300 mt-2">{results.error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
          {results ? (
            <button
              onClick={() => setResults(null)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            >
              Run Another
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={runAgentTeam}
                disabled={!selectedProject || !task.trim() || loading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl text-white font-medium transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running Agents...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Run Agent Team
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
