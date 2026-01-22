import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, Phone, Mail, CheckCircle, Clock,
  TrendingUp, Send, Eye, DollarSign, ChevronRight
} from 'lucide-react'

/**
 * TODAY View - CEO Daily Hit List
 * Shows exactly what to do today, sorted by urgency
 */

function ActionButton({ icon: Icon, label, variant = 'default', onClick }) {
  const variants = {
    call: 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30',
    email: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30',
    done: 'bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 border-zinc-600',
    default: 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${variants[variant]}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

function TaskCard({ task, onAction, onComplete }) {
  const [completing, setCompleting] = useState(false)

  const handleComplete = async () => {
    setCompleting(true)
    await onComplete?.(task)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: completing ? 0.5 : 1, x: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white">{task.company}</span>
            {task.tier && (
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                task.tier === 'A' ? 'bg-amber-500/20 text-amber-400' :
                task.tier === 'B' ? 'bg-blue-500/20 text-blue-400' :
                'bg-zinc-500/20 text-zinc-400'
              }`}>
                {task.tier}
              </span>
            )}
          </div>
          <div className="text-sm text-zinc-400 mb-2">{task.description}</div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>Last: {task.lastAction}</span>
            <span className="text-zinc-400">Next: {task.nextAction}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {task.actionType === 'call' && (
            <ActionButton
              icon={Phone}
              label="Call"
              variant="call"
              onClick={() => onAction?.('call', task)}
            />
          )}
          {task.actionType === 'email' && (
            <ActionButton
              icon={Mail}
              label="Email"
              variant="email"
              onClick={() => onAction?.('email', task)}
            />
          )}
          <ActionButton
            icon={CheckCircle}
            label="Done"
            variant="done"
            onClick={handleComplete}
          />
        </div>
      </div>
      {task.daysOverdue > 0 && (
        <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {task.daysOverdue} days overdue
        </div>
      )}
    </motion.div>
  )
}

function SectionHeader({ icon: Icon, title, color, count }) {
  const colors = {
    red: 'text-red-400 bg-red-500/10',
    yellow: 'text-amber-400 bg-amber-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-green-400 bg-green-500/10'
  }

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2 rounded-lg ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        {count !== undefined && (
          <span className="text-xs text-zinc-500">{count} items</span>
        )}
      </div>
    </div>
  )
}

function ProposalCard({ deal, onAction }) {
  const isVetoed = deal.gm_status === 'VETO'

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${
      isVetoed ? 'bg-red-500/10 border border-red-500/30' : 'bg-zinc-800/30'
    }`}>
      <div>
        <div className="font-medium text-white">{deal.company}</div>
        <div className="text-sm text-zinc-400">
          ${(deal.value / 1000).toFixed(0)}K | {(deal.gm_percent * 100).toFixed(0)}% GM
        </div>
        {deal.days_in_stage && (
          <div className="text-xs text-zinc-500">Pending {deal.days_in_stage} days</div>
        )}
      </div>
      {isVetoed ? (
        <button
          onClick={() => onAction?.('reprice', deal)}
          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium"
        >
          Reprice
        </button>
      ) : (
        <button
          onClick={() => onAction?.('followUp', deal)}
          className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-400 text-sm font-medium"
        >
          Follow Up
        </button>
      )}
    </div>
  )
}

export default function TodayView({ leads, deals, waves, onAction, onComplete }) {
  const [completedTasks, setCompletedTasks] = useState(new Set())

  // Generate today's date header
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  // Compute overdue tasks from leads/deals
  const overdueTasks = useMemo(() => {
    const tasks = []

    // Find leads that need follow-up (engaged but no recent touch)
    if (leads) {
      leads.forEach(lead => {
        if (lead.heat === 'warm' || lead.status === 'engaged') {
          const lastTouch = lead.last_touch ? new Date(lead.last_touch) : null
          if (lastTouch) {
            const daysSince = Math.floor((today - lastTouch) / (1000 * 60 * 60 * 24))
            if (daysSince > 5) {
              tasks.push({
                id: `lead_${lead.id}`,
                company: lead.firmName || lead.company,
                tier: lead.tier,
                description: 'Follow-up needed',
                lastAction: `Last touch ${daysSince} days ago`,
                nextAction: 'Call or email to re-engage',
                actionType: 'call',
                daysOverdue: daysSince - 5,
                priority: 1
              })
            }
          }
        }
      })
    }

    // Find deals with stalled proposals
    if (deals) {
      deals.forEach(deal => {
        if (deal.stage === 'Proposal Issued') {
          const updated = deal.updated_at ? new Date(deal.updated_at) : null
          if (updated) {
            const daysSince = Math.floor((today - updated) / (1000 * 60 * 60 * 24))
            if (daysSince > 7) {
              tasks.push({
                id: `deal_${deal.id}`,
                company: deal.firmName || deal.company,
                tier: deal.tier,
                description: 'Proposal stalled',
                lastAction: `Sent proposal ${daysSince} days ago`,
                nextAction: 'Follow up on decision',
                actionType: 'email',
                daysOverdue: daysSince - 7,
                priority: 2
              })
            }
          }
        }
      })
    }

    return tasks
      .filter(t => !completedTasks.has(t.id))
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
  }, [leads, deals, completedTasks])

  // Hot leads (recently engaged, proof viewers)
  const hotLeads = useMemo(() => {
    if (!leads) return []
    return leads
      .filter(lead => lead.heat === 'hot' || lead.status === 'meeting_scheduled')
      .filter(lead => !completedTasks.has(`hot_${lead.id}`))
      .slice(0, 3)
      .map(lead => ({
        id: `hot_${lead.id}`,
        company: lead.firmName || lead.company,
        tier: lead.tier,
        description: lead.status === 'meeting_scheduled' ? 'Meeting scheduled' : 'High engagement detected',
        lastAction: lead.notes || 'Recently active',
        nextAction: 'Send personalized follow-up',
        actionType: 'email',
        priority: 3
      }))
  }, [leads, completedTasks])

  // Outbound batch (Wave 1 leads ready for touch)
  const outboundBatch = useMemo(() => {
    if (!waves || !waves[0]?.targets) return []
    return waves[0].targets
      .filter(t => t.status === 'touched' || t.status === 'pending' || t.status === 'cold')
      .slice(0, 5)
  }, [waves])

  // Proposal stage deals
  const proposalDeals = useMemo(() => {
    if (!deals) return []
    return deals.filter(d =>
      d.stage === 'Proposal Issued' || d.stage === 'Opportunity'
    )
  }, [deals])

  const handleComplete = async (task) => {
    setCompletedTasks(prev => new Set([...prev, task.id]))
  }

  // Stats for header
  const weeklyStats = useMemo(() => {
    const prospectsAdded = leads?.filter(l => {
      const created = l.created_at ? new Date(l.created_at) : null
      if (!created) return false
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      return created > weekAgo
    }).length || 0

    const meetingsBooked = leads?.filter(l => l.status === 'meeting_scheduled').length || 0

    return { prospectsAdded, meetingsBooked }
  }, [leads])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">TODAY</h2>
            <p className="text-zinc-400">{dateStr}</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{weeklyStats.prospectsAdded}</div>
              <div className="text-zinc-500">Added This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{weeklyStats.meetingsBooked}</div>
              <div className="text-zinc-500">Meetings Booked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Section */}
      {overdueTasks.length > 0 && (
        <div>
          <SectionHeader
            icon={AlertCircle}
            title="OVERDUE"
            color="red"
            count={overdueTasks.length}
          />
          <div className="space-y-3">
            <AnimatePresence>
              {overdueTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onAction={onAction}
                  onComplete={handleComplete}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Hot Leads Section */}
      {hotLeads.length > 0 && (
        <div>
          <SectionHeader
            icon={TrendingUp}
            title="HOT LEADS"
            color="yellow"
            count={hotLeads.length}
          />
          <div className="space-y-3">
            <AnimatePresence>
              {hotLeads.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onAction={onAction}
                  onComplete={handleComplete}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Outbound Batch */}
      {outboundBatch.length > 0 && (
        <div>
          <SectionHeader
            icon={Send}
            title="OUTBOUND"
            color="blue"
            count={outboundBatch.length}
          />
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-300">
                {outboundBatch.length} leads ready for proof mailers
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {outboundBatch.map(target => (
                <span
                  key={target.lead_id}
                  className="px-2 py-1 bg-zinc-800 rounded text-sm text-zinc-300"
                >
                  {target.firmName || target.company}
                </span>
              ))}
            </div>
            <button
              onClick={() => onAction?.('sendBatch', outboundBatch)}
              className="w-full py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 font-medium transition-colors"
            >
              Send All Mailers
            </button>
          </div>
        </div>
      )}

      {/* Proposal Stage */}
      {proposalDeals.length > 0 && (
        <div>
          <SectionHeader
            icon={DollarSign}
            title="PROPOSAL STAGE"
            color="green"
            count={proposalDeals.length}
          />
          <div className="glass rounded-xl p-4 space-y-3">
            {proposalDeals.map(deal => (
              <ProposalCard
                key={deal.id}
                deal={deal}
                onAction={onAction}
              />
            ))}
            <button
              onClick={() => onAction?.('viewPipeline')}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              View Full Pipeline
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {overdueTasks.length === 0 && hotLeads.length === 0 && outboundBatch.length === 0 && proposalDeals.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
          <p className="text-zinc-400">No urgent tasks for today. Check back tomorrow or add new leads.</p>
        </div>
      )}
    </div>
  )
}
