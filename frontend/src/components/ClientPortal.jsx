import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Upload,
  Clock,
  CheckCircle2,
  Send,
  Eye,
  FileImage,
  FileText,
  Film,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Building2
} from 'lucide-react'
import { getClientQueue } from '../services/api'

// Client configuration
const CLIENT_CONFIG = {
  bigmuddy: {
    name: 'Big Muddy Inn',
    color: '#f97316',
    description: 'Blues Room venue content'
  },
  studioc: {
    name: 'Studio C',
    color: '#10b981',
    description: 'Production services content'
  },
  cptv: {
    name: 'Chase Pierson TV',
    color: '#a855f7',
    description: 'Personal brand content'
  },
  tuthill: {
    name: 'Tuthill Design',
    color: '#f97316',
    description: 'Design studio content'
  },
  utopia: {
    name: 'Utopia Studios',
    color: '#3b82f6',
    description: 'Studio facility content'
  }
}

// Workflow stages
const STAGES = [
  { key: 'ingest', label: 'Ingest', icon: Upload, color: '#6366f1', description: 'Awaiting processing' },
  { key: 'agencyReview', label: 'Agency Review', icon: Eye, color: '#f59e0b', description: 'Your approval needed' },
  { key: 'clientReview', label: 'Client Review', icon: Clock, color: '#3b82f6', description: 'Client approval pending' },
  { key: 'published', label: 'Published', icon: CheckCircle2, color: '#10b981', description: 'Live content' }
]

// Get icon for content type
function getTypeIcon(type) {
  switch (type?.toLowerCase()) {
    case 'image': return FileImage
    case 'video': return Film
    default: return FileText
  }
}

// Queue Item Card
function QueueItem({ item, stage }) {
  const TypeIcon = getTypeIcon(item.metadata?.type)
  const stageConfig = STAGES.find(s => s.key === stage)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50 hover:border-zinc-700/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${stageConfig?.color}20` }}
        >
          <TypeIcon className="w-5 h-5" style={{ color: stageConfig?.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-200 truncate">{item.id}</span>
            {item.complete && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            )}
          </div>

          {item.metadata?.thread && (
            <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{item.metadata.thread}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-zinc-500">
            {item.metadata?.type && (
              <span className="px-2 py-0.5 rounded bg-zinc-800">{item.metadata.type}</span>
            )}
            {item.metadata?.source && (
              <span className="px-2 py-0.5 rounded bg-zinc-800">{item.metadata.source}</span>
            )}
            {item.metadata?.status && (
              <span className="text-zinc-400">{item.metadata.status}</span>
            )}
          </div>

          {item.metadata?.publishedDate && (
            <div className="text-xs text-emerald-500 mt-2">
              Published: {item.metadata.publishedDate}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Stage Column
function StageColumn({ stage, items = [], clientColor }) {
  const Icon = stage.icon

  return (
    <div className="flex-1 min-w-[280px]">
      {/* Stage Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-800/50">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${stage.color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: stage.color }} />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-200">{stage.label}</h3>
          <p className="text-xs text-zinc-500">{stage.description}</p>
        </div>
        <span
          className="ml-auto px-2 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${stage.color}20`,
            color: stage.color
          }}
        >
          {items.length}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item, i) => (
            <QueueItem key={item.id || i} item={item} stage={stage.key} />
          ))
        ) : (
          <div className="text-center py-8 text-zinc-600 text-sm">
            No items in {stage.label.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  )
}

// Main Portal Component
export default function ClientPortal() {
  const { clientId } = useParams()
  const [queue, setQueue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const client = CLIENT_CONFIG[clientId] || {
    name: clientId,
    color: '#6366f1',
    description: 'Client portal'
  }

  useEffect(() => {
    fetchQueue()
  }, [clientId])

  async function fetchQueue() {
    setLoading(true)
    setError(null)
    try {
      const data = await getClientQueue(clientId)
      if (data.success === false) {
        setError(data.error || 'Failed to load queue')
      } else {
        setQueue(data.queue || data)
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Back + Title */}
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors touch-target"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>

            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${client.color}20` }}
              >
                <Building2 className="w-6 h-6" style={{ color: client.color }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{client.name}</h1>
                <p className="text-sm text-zinc-500">{client.description}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={fetchQueue}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-zinc-700/50 transition-colors touch-target"
            >
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm text-zinc-300">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-400">{error}</span>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && !queue && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin" />
        </div>
      )}

      {/* Queue Board */}
      {queue && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {STAGES.map(stage => (
              <div key={stage.key} className="glass rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <stage.icon className="w-5 h-5" style={{ color: stage.color }} />
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {queue[stage.key]?.length || 0}
                    </div>
                    <div className="text-xs text-zinc-500">{stage.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Kanban Board */}
          <div className="glass rounded-2xl p-6">
            <div className="flex gap-6 overflow-x-auto pb-4">
              {STAGES.map(stage => (
                <StageColumn
                  key={stage.key}
                  stage={stage}
                  items={queue[stage.key] || []}
                  clientColor={client.color}
                />
              ))}
            </div>
          </div>

          {/* Workflow Hint */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-600">
            <span>Workflow:</span>
            {STAGES.map((stage, i) => (
              <span key={stage.key} className="flex items-center gap-1">
                <span style={{ color: stage.color }}>{stage.label}</span>
                {i < STAGES.length - 1 && <ChevronRight className="w-3 h-3" />}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && !error && queue && Object.values(queue).every(arr => !arr?.length) && (
        <div className="text-center py-20">
          <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No content yet</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Content will appear here as it moves through the approval workflow.
            Use the API to upload assets or create content drafts.
          </p>
        </div>
      )}
    </div>
  )
}
