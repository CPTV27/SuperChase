import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Flame,
  Zap,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  ChevronRight,
  RefreshCw,
  Send,
  FileText
} from 'lucide-react'

/**
 * S2P Hot Leads Radar
 *
 * Visual radar display showing Scan2Plan leads by heat level.
 * Gemini-inspired design with concentric rings and pulsing signals.
 */

// Sample lead data
const SAMPLE_LEADS = [
  {
    id: 1,
    name: 'Gensler NYC',
    type: 'Architecture Firm',
    location: 'New York, NY',
    heat: 'hot',
    value: '$45K',
    signal: 'Posted 3 renovation RFPs this week',
    angle: 45,
    distance: 0.3
  },
  {
    id: 2,
    name: 'Boston Properties',
    type: 'Developer',
    location: 'Boston, MA',
    heat: 'hot',
    value: '$120K',
    signal: 'Expanding portfolio, needs as-builts',
    angle: 120,
    distance: 0.4
  },
  {
    id: 3,
    name: 'HOK DC Office',
    type: 'Architecture Firm',
    location: 'Washington, DC',
    heat: 'warm',
    value: '$28K',
    signal: 'Historic preservation project starting',
    angle: 200,
    distance: 0.6
  },
  {
    id: 4,
    name: 'Related Companies',
    type: 'Developer',
    location: 'Hudson Yards, NY',
    heat: 'hot',
    value: '$85K',
    signal: 'New construction needs existing docs',
    angle: 280,
    distance: 0.35
  },
  {
    id: 5,
    name: 'Perkins Eastman',
    type: 'Architecture Firm',
    location: 'Philadelphia, PA',
    heat: 'warm',
    value: '$32K',
    signal: 'Healthcare renovation in planning',
    angle: 340,
    distance: 0.55
  },
  {
    id: 6,
    name: 'JLL Northeast',
    type: 'Property Management',
    location: 'Multiple',
    heat: 'cold',
    value: '$15K',
    signal: 'Annual facility audit contract',
    angle: 160,
    distance: 0.8
  }
]

const HEAT_CONFIG = {
  hot: {
    color: '#f59e0b',
    label: 'Hot',
    icon: Flame,
    glow: 'rgba(245, 158, 11, 0.6)'
  },
  warm: {
    color: '#3b82f6',
    label: 'Warm',
    icon: Zap,
    glow: 'rgba(59, 130, 246, 0.4)'
  },
  cold: {
    color: '#6b7280',
    label: 'Cold',
    icon: Target,
    glow: 'rgba(107, 114, 128, 0.3)'
  }
}

// Radar blip component
function RadarBlip({ lead, isSelected, onClick }) {
  const config = HEAT_CONFIG[lead.heat]
  const radius = 120 * lead.distance
  const x = Math.cos((lead.angle * Math.PI) / 180) * radius
  const y = Math.sin((lead.angle * Math.PI) / 180) * radius

  return (
    <motion.button
      onClick={onClick}
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`
      }}
      whileHover={{ scale: 1.2 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: lead.id * 0.1 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: config.glow }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.6, 0, 0.6]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: lead.id * 0.3
        }}
      />

      {/* Blip */}
      <div
        className={`relative w-4 h-4 rounded-full border-2 ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''}`}
        style={{
          backgroundColor: config.color,
          borderColor: config.color,
          boxShadow: `0 0 12px ${config.glow}`
        }}
      />

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-lg px-2 py-1 whitespace-nowrap">
          <div className="text-xs font-medium text-white">{lead.name}</div>
          <div className="text-xs text-zinc-400">{lead.value}</div>
        </div>
      </div>
    </motion.button>
  )
}

// Lead detail panel
function LeadDetail({ lead, onClose, onAction }) {
  const config = HEAT_CONFIG[lead.heat]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="glass rounded-xl p-4 border-l-4"
      style={{ borderLeftColor: config.color }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: config.color }} />
          </div>
          <div>
            <h4 className="font-semibold text-zinc-100">{lead.name}</h4>
            <div className="text-xs text-zinc-500">{lead.type}</div>
          </div>
        </div>
        <span
          className="px-2 py-1 text-xs font-medium rounded-lg"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          {config.label}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-zinc-400">
          <MapPin className="w-4 h-4" />
          <span>{lead.location}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <DollarSign className="w-4 h-4" />
          <span className="text-emerald-400 font-medium">{lead.value} estimated</span>
        </div>
      </div>

      <div className="mt-3 p-3 bg-zinc-900/50 rounded-lg">
        <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Signal
        </div>
        <p className="text-sm text-zinc-300">{lead.signal}</p>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onAction('prospectus', lead)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-colors"
        >
          <FileText className="w-4 h-4" />
          Prospectus
        </button>
        <button
          onClick={() => onAction('email', lead)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-medium transition-colors"
        >
          <Send className="w-4 h-4" />
          Reach Out
        </button>
      </div>
    </motion.div>
  )
}

export default function S2PLeadRadar({ onAction }) {
  const [leads, setLeads] = useState(SAMPLE_LEADS)
  const [selectedLead, setSelectedLead] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scanAngle, setScanAngle] = useState(0)

  // Radar sweep animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScanAngle(prev => (prev + 2) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const runScan = async () => {
    setLoading(true)
    // Would trigger actual API scan
    await new Promise(r => setTimeout(r, 2000))
    setLoading(false)
  }

  const handleAction = (action, lead) => {
    if (onAction) {
      onAction(action, lead)
    }
  }

  // Count by heat
  const counts = {
    hot: leads.filter(l => l.heat === 'hot').length,
    warm: leads.filter(l => l.heat === 'warm').length,
    cold: leads.filter(l => l.heat === 'cold').length
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Radar Display */}
      <div className="lg:col-span-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100">Lead Radar</h3>
                <p className="text-xs text-zinc-500">Northeast Corridor</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Heat legend */}
              <div className="hidden sm:flex items-center gap-4 text-xs">
                {Object.entries(HEAT_CONFIG).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-zinc-400">{counts[key]} {config.label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={runScan}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Scan
              </button>
            </div>
          </div>

          {/* Radar visualization */}
          <div className="relative aspect-square max-w-md mx-auto">
            {/* Background rings */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(59, 130, 246, 0.1)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>

              {/* Filled background */}
              <circle cx="50%" cy="50%" r="48%" fill="url(#radarGradient)" />

              {/* Rings */}
              {[0.25, 0.5, 0.75, 1].map((scale, i) => (
                <circle
                  key={i}
                  cx="50%"
                  cy="50%"
                  r={`${scale * 48}%`}
                  fill="none"
                  stroke="rgba(63, 63, 70, 0.5)"
                  strokeWidth="1"
                />
              ))}

              {/* Cross lines */}
              <line x1="50%" y1="2%" x2="50%" y2="98%" stroke="rgba(63, 63, 70, 0.3)" strokeWidth="1" />
              <line x1="2%" y1="50%" x2="98%" y2="50%" stroke="rgba(63, 63, 70, 0.3)" strokeWidth="1" />

              {/* Sweep line */}
              <line
                x1="50%"
                y1="50%"
                x2={`${50 + 48 * Math.cos((scanAngle * Math.PI) / 180)}%`}
                y2={`${50 + 48 * Math.sin((scanAngle * Math.PI) / 180)}%`}
                stroke="rgba(59, 130, 246, 0.6)"
                strokeWidth="2"
              />

              {/* Sweep gradient */}
              <defs>
                <linearGradient id="sweepGradient" gradientTransform={`rotate(${scanAngle}, 0.5, 0.5)`}>
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 0.3)" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center point */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500" />

            {/* Lead blips */}
            {leads.map(lead => (
              <RadarBlip
                key={lead.id}
                lead={lead}
                isSelected={selectedLead?.id === lead.id}
                onClick={() => setSelectedLead(lead)}
              />
            ))}
          </div>

          {/* Mobile legend */}
          <div className="sm:hidden flex items-center justify-center gap-4 mt-4 text-xs">
            {Object.entries(HEAT_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-zinc-400">{counts[key]}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Lead Details Panel */}
      <div className="lg:col-span-1 space-y-4">
        <AnimatePresence mode="wait">
          {selectedLead ? (
            <LeadDetail
              key={selectedLead.id}
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
              onAction={handleAction}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-xl p-6 text-center"
            >
              <Target className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-sm text-zinc-500">Select a lead on the radar to view details</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick stats */}
        <div className="glass rounded-xl p-4">
          <h4 className="text-sm font-medium text-zinc-300 mb-3">Pipeline Value</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Hot leads</span>
              <span className="text-sm font-medium text-amber-400">$250K</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Warm leads</span>
              <span className="text-sm font-medium text-blue-400">$60K</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Cold leads</span>
              <span className="text-sm font-medium text-zinc-400">$15K</span>
            </div>
            <div className="pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">Total pipeline</span>
                <span className="text-lg font-bold text-emerald-400">$325K</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
