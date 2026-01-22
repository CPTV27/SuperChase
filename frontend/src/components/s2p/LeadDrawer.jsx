import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Building2, Users, MapPin, Mail, Phone, ExternalLink,
  Calendar, Clock, Send, FileText, Image, ChevronRight,
  Thermometer, Target, Zap, MessageSquare
} from 'lucide-react'

/**
 * Lead Detail Drawer
 * Shows full lead profile with proof matching and actions
 */

const HEAT_COLORS = {
  hot: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  warm: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  cold: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/30' }
}

const TIER_COLORS = {
  A: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  B: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  C: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/30' }
}

function Section({ title, icon: Icon, children, action }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-zinc-400" />
          <h4 className="text-sm font-medium text-zinc-300">{title}</h4>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function ProofMatchCard({ proof, onSelect }) {
  return (
    <motion.button
      onClick={() => onSelect?.(proof)}
      className="w-full flex items-start gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-left transition-colors"
      whileHover={{ scale: 1.01 }}
    >
      <div className="w-12 h-12 bg-zinc-700 rounded-lg flex items-center justify-center flex-shrink-0">
        <Image className="w-6 h-6 text-zinc-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white text-sm truncate">
          {proof.title}
        </div>
        <div className="text-xs text-zinc-400 mt-0.5">
          {proof.type === 'case_study' ? 'Case Study' : `LOD ${proof.lod_level} Sample`}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={`px-1.5 py-0.5 rounded text-xs ${
            proof.matchType === 'exact'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}>
            {proof.matchType === 'exact' ? 'Exact Match' : 'Adjacent'}
          </span>
          <span className="text-xs text-zinc-500">
            {(proof.confidence * 100).toFixed(0)}% match
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
    </motion.button>
  )
}

function ActivityItem({ activity }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-zinc-300">{activity.description}</div>
        <div className="text-xs text-zinc-500 mt-0.5">
          {new Date(activity.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
}

export default function LeadDrawer({ lead, proofMatches, isOpen, onClose, onAction }) {
  const [activeTab, setActiveTab] = useState('profile')

  // Demo proof matches if not provided
  const matches = proofMatches || [
    {
      id: 'proof_001',
      title: 'The Castle - LOD 350 Historic Renovation',
      type: 'case_study',
      lod_level: 350,
      matchType: 'exact',
      confidence: 0.95
    },
    {
      id: 'proof_002',
      title: 'CUNY Baruch - LOD 200 Campus',
      type: 'lod_sample',
      lod_level: 200,
      matchType: 'adjacent',
      confidence: 0.72
    }
  ]

  // Demo activity if not on lead
  const activities = lead?.activities || [
    { id: 1, description: 'Lead added from Clutch.co CSV', timestamp: '2026-01-21T10:00:00Z' },
    { id: 2, description: 'Tier classification: A (megafirm)', timestamp: '2026-01-21T10:01:00Z' }
  ]

  if (!isOpen || !lead) return null

  const heatStyle = HEAT_COLORS[lead.heat] || HEAT_COLORS.cold
  const tierStyle = TIER_COLORS[lead.tier] || TIER_COLORS.C

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-800 overflow-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 p-4 z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white truncate">
                  {lead.company}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${heatStyle.bg} ${heatStyle.text} border ${heatStyle.border}`}>
                    {lead.heat}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}`}>
                    Tier {lead.tier}
                  </span>
                  {lead.tier === 'A' && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Whale
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4">
              {['profile', 'proof', 'activity'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {activeTab === 'profile' && (
              <>
                {/* Company Info */}
                <Section title="Company Profile" icon={Building2}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-300">{lead.employees} employees</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-300">{lead.location}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Target className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-300">{lead.service_focus}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-300">
                        {(lead.sqft_estimate / 1000).toFixed(0)}K sqft estimate
                      </span>
                    </div>
                  </div>
                </Section>

                {/* Scoring */}
                <Section title="Scoring" icon={Thermometer}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <div className="text-xs text-zinc-500">Distance to Meeting</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {((lead.distance_to_meeting || 0.5) * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <div className="text-xs text-zinc-500">Market</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {lead.market}
                      </div>
                    </div>
                  </div>

                  {/* Signals */}
                  {lead.signals && lead.signals.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {lead.signals.map((signal, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs"
                        >
                          {signal}
                        </span>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Contact */}
                {lead.contacts && lead.contacts.length > 0 && (
                  <Section title="Primary Contact" icon={Users}>
                    {lead.contacts.map((contact, i) => (
                      <div key={i} className="p-3 bg-zinc-800/50 rounded-lg">
                        <div className="font-medium text-white">{contact.name}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{contact.title}</div>
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mt-2"
                          >
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </a>
                        )}
                      </div>
                    ))}
                  </Section>
                )}
              </>
            )}

            {activeTab === 'proof' && (
              <Section
                title="Proof Match"
                icon={Image}
                action={
                  <span className="text-xs text-zinc-500">
                    Auto-matched from P4 Vault
                  </span>
                }
              >
                <div className="space-y-2">
                  {matches.map(proof => (
                    <ProofMatchCard
                      key={proof.id}
                      proof={proof}
                      onSelect={() => onAction?.('viewProof', proof)}
                    />
                  ))}
                </div>

                <div className="mt-4 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700">
                  <div className="text-xs text-zinc-400 mb-2">
                    Selection Rule (P4):
                  </div>
                  <div className="text-xs text-zinc-500">
                    Exact match &gt; Adjacent match &gt; Generic
                  </div>
                </div>
              </Section>
            )}

            {activeTab === 'activity' && (
              <Section title="Activity Timeline" icon={Clock}>
                <div className="space-y-4">
                  {activities.map(activity => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Actions Footer */}
          <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 p-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onAction?.('scheduleMeeting', lead)}
                className="flex items-center justify-center gap-2 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 font-medium transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Schedule Meeting
              </button>
              <button
                onClick={() => onAction?.('sendProof', lead)}
                className="flex items-center justify-center gap-2 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl text-green-400 font-medium transition-colors"
              >
                <Send className="w-4 h-4" />
                Send Proof Kit
              </button>
            </div>

            {lead.wave_id && (
              <div className="mt-3 text-center text-xs text-zinc-500">
                In wave: {lead.wave_id}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
