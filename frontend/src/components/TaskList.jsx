import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Plus,
  Calendar,
  ChevronRight,
  Filter
} from 'lucide-react'
import { getTasks } from '../services/api'

/**
 * Task List Component
 *
 * Displays Asana tasks with ability to view details and mark complete.
 */

function TaskItem({ task, onComplete, onSelect, isSelected }) {
  const isOverdue = task.dueOn && new Date(task.dueOn) < new Date()
  const isDueSoon = task.dueOn && !isOverdue &&
    new Date(task.dueOn) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        group p-4 rounded-xl border transition-all cursor-pointer
        ${isSelected
          ? 'bg-blue-500/10 border-blue-500/30'
          : 'bg-zinc-800/30 border-zinc-800 hover:border-zinc-700'
        }
      `}
      onClick={() => onSelect(task)}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onComplete(task)
          }}
          className="mt-0.5 flex-shrink-0 text-zinc-500 hover:text-emerald-400 transition-colors"
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium leading-snug ${task.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
            {task.name}
          </h4>

          <div className="flex items-center gap-3 mt-2">
            {task.dueOn && (
              <span className={`
                flex items-center gap-1 text-xs
                ${isOverdue ? 'text-red-400' : isDueSoon ? 'text-amber-400' : 'text-zinc-500'}
              `}>
                {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                {new Date(task.dueOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}

            {task.url && (
              <a
                href={task.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-400 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Asana
              </a>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  )
}

function TaskDetail({ task, onClose }) {
  if (!task) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-white pr-4">{task.name}</h3>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white"
        >
          ×
        </button>
      </div>

      {task.notes && (
        <div className="mb-4">
          <div className="text-xs text-zinc-500 uppercase mb-2">Notes</div>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{task.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        {task.dueOn && (
          <div>
            <div className="text-xs text-zinc-500 uppercase mb-1">Due Date</div>
            <div className="text-zinc-300">
              {new Date(task.dueOn).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs text-zinc-500 uppercase mb-1">Status</div>
          <div className={task.completed ? 'text-emerald-400' : 'text-amber-400'}>
            {task.completed ? 'Completed' : 'In Progress'}
          </div>
        </div>

        {task.createdAt && (
          <div>
            <div className="text-xs text-zinc-500 uppercase mb-1">Created</div>
            <div className="text-zinc-300">
              {new Date(task.createdAt).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {task.url && (
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open in Asana
        </a>
      )}
    </motion.div>
  )
}

export default function TaskList({ limit = 20, showHeader = true }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [filter, setFilter] = useState('active') // active, overdue, all

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    setLoading(true)
    const data = await getTasks(limit)
    setTasks(data.tasks || [])
    setLoading(false)
  }

  async function handleComplete(task) {
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, completed: !t.completed } : t
    ))

    // In production, would call Asana API to update
    console.log('Toggle complete:', task.id)
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.completed
    if (filter === 'overdue') return task.dueOn && new Date(task.dueOn) < new Date() && !task.completed
    return true
  })

  const stats = {
    total: tasks.length,
    active: tasks.filter(t => !t.completed).length,
    overdue: tasks.filter(t => t.dueOn && new Date(t.dueOn) < new Date() && !t.completed).length
  }

  return (
    <div className="h-full flex flex-col">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Tasks</h2>
            <p className="text-sm text-zinc-500">{stats.active} active, {stats.overdue} overdue</p>
          </div>
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-zinc-500" />
        {[
          { key: 'active', label: 'Active', count: stats.active },
          { key: 'overdue', label: 'Overdue', count: stats.overdue },
          { key: 'all', label: 'All', count: stats.total }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${filter === f.key
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
              }
            `}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          ) : filteredTasks.length > 0 ? (
            <AnimatePresence>
              {filteredTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isSelected={selectedTask?.id === task.id}
                  onComplete={handleComplete}
                  onSelect={setSelectedTask}
                />
              ))}
            </AnimatePresence>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No tasks in this view</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedTask && (
            <div className="w-80 flex-shrink-0">
              <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
