import TaskList from './TaskList'
import { ListTodo } from 'lucide-react'

/**
 * Tasks Page
 *
 * Full-page wrapper for the TaskList component.
 */

export default function TasksPage() {
  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
          <ListTodo className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-zinc-500">Manage your Asana tasks</p>
        </div>
      </div>

      {/* Task List */}
      <div className="glass rounded-xl p-6">
        <TaskList limit={50} showHeader={false} />
      </div>
    </div>
  )
}
