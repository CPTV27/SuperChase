import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Zap, Thermometer, Building2, MapPin } from 'lucide-react'

/**
 * Tier-A Radar Visualization
 * Polar visualization showing leads by heat level and tier
 * Ring 1 (inner): Hot - meeting scheduled
 * Ring 2: Warm - engaged, no meeting
 * Ring 3 (outer): Cold - in system, not engaged
 */

const HEAT_COLORS = {
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#64748b'
}

const HEAT_LABELS = {
  hot: 'Meeting Scheduled',
  warm: 'Engaged',
  cold: 'In System'
}

const TIER_SIZES = {
  A: 16,
  B: 12,
  C: 8
}

const MARKET_COLORS = {
  NYC: '#3b82f6',
  BOS: '#10b981',
  DC: '#8b5cf6',
  PHL: '#ec4899',
  ALB: '#f59e0b',
  DET: '#14b8a6',
  DAL: '#f97316'
}

function LeadBlip({ lead, position, onClick, isSelected }) {
  const size = TIER_SIZES[lead.tier] || 10
  const color = HEAT_COLORS[lead.heat] || HEAT_COLORS.cold

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isSelected ? 1.3 : 1,
        opacity: 1
      }}
      whileHover={{ scale: 1.2 }}
      onClick={() => onClick?.(lead)}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow effect */}
      <circle
        cx={position.x}
        cy={position.y}
        r={size + 4}
        fill={color}
        opacity={0.2}
      />

      {/* Main blip */}
      <circle
        cx={position.x}
        cy={position.y}
        r={size}
        fill={color}
        stroke={isSelected ? '#fff' : 'transparent'}
        strokeWidth={2}
      />

      {/* Tier label */}
      <text
        x={position.x}
        y={position.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={size * 0.7}
        fontWeight="bold"
      >
        {lead.tier}
      </text>

      {/* Pulse animation for hot leads */}
      {lead.heat === 'hot' && (
        <motion.circle
          cx={position.x}
          cy={position.y}
          r={size}
          fill="none"
          stroke={color}
          strokeWidth={2}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{
            scale: [1, 1.5, 1.5],
            opacity: [0.8, 0, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut'
          }}
        />
      )}
    </motion.g>
  )
}

function RadarRings({ centerX, centerY, maxRadius }) {
  const rings = [
    { radius: maxRadius * 0.33, label: 'Hot', heat: 'hot' },
    { radius: maxRadius * 0.66, label: 'Warm', heat: 'warm' },
    { radius: maxRadius, label: 'Cold', heat: 'cold' }
  ]

  return (
    <g>
      {/* Grid lines (8 sectors) */}
      {[...Array(8)].map((_, i) => {
        const angle = (i * Math.PI * 2) / 8
        const x2 = centerX + Math.cos(angle) * maxRadius
        const y2 = centerY + Math.sin(angle) * maxRadius
        return (
          <line
            key={`grid-${i}`}
            x1={centerX}
            y1={centerY}
            x2={x2}
            y2={y2}
            stroke="#374151"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        )
      })}

      {/* Concentric rings */}
      {rings.map((ring, i) => (
        <g key={`ring-${i}`}>
          <circle
            cx={centerX}
            cy={centerY}
            r={ring.radius}
            fill="none"
            stroke={HEAT_COLORS[ring.heat]}
            strokeWidth={1}
            opacity={0.3}
          />
          {/* Ring label */}
          <text
            x={centerX + ring.radius - 30}
            y={centerY - 8}
            fill={HEAT_COLORS[ring.heat]}
            fontSize={10}
            opacity={0.7}
          >
            {ring.label}
          </text>
        </g>
      ))}

      {/* Center dot */}
      <circle
        cx={centerX}
        cy={centerY}
        r={4}
        fill="#3b82f6"
      />
    </g>
  )
}

function SweepLine({ centerX, centerY, maxRadius }) {
  return (
    <motion.line
      x1={centerX}
      y1={centerY}
      x2={centerX + maxRadius}
      y2={centerY}
      stroke="rgba(59, 130, 246, 0.5)"
      strokeWidth={2}
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'linear'
      }}
      style={{ transformOrigin: `${centerX}px ${centerY}px` }}
    />
  )
}

export default function TierARadar({ leads: propLeads, onSelectLead, selectedLead }) {
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 })
  const [filter, setFilter] = useState('all') // all, hot, warm, cold

  // Default demo leads if not provided
  const leads = propLeads || [
    { id: 'lead_001', company: 'Gensler NYC', tier: 'A', heat: 'warm', market: 'NYC', sqft_estimate: 150000 },
    { id: 'lead_002', company: 'HKS Architects', tier: 'A', heat: 'cold', market: 'DAL', sqft_estimate: 200000 },
    { id: 'lead_003', company: 'Perkins Eastman', tier: 'A', heat: 'hot', market: 'NYC', sqft_estimate: 85000 },
    { id: 'lead_004', company: 'STUDIOS Architecture', tier: 'B', heat: 'warm', market: 'DC', sqft_estimate: 45000 },
    { id: 'lead_005', company: 'Bohlin Cywinski Jackson', tier: 'B', heat: 'cold', market: 'PHL', sqft_estimate: 35000 },
    { id: 'lead_006', company: 'Smith Group', tier: 'A', heat: 'warm', market: 'DET', sqft_estimate: 120000 },
    { id: 'lead_007', company: 'Voith & Mactavish', tier: 'C', heat: 'hot', market: 'PHL', sqft_estimate: 15000 },
    { id: 'lead_008', company: 'FXCollaborative', tier: 'A', heat: 'cold', market: 'NYC', sqft_estimate: 175000 }
  ]

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height: Math.min(height, 400) })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const centerX = dimensions.width / 2
  const centerY = dimensions.height / 2
  const maxRadius = Math.min(centerX, centerY) - 40

  // Filter leads
  const filteredLeads = filter === 'all'
    ? leads
    : leads.filter(l => l.heat === filter)

  // Calculate positions for leads
  const leadPositions = useMemo(() => {
    const positions = {}
    const heatGroups = { hot: [], warm: [], cold: [] }

    filteredLeads.forEach(lead => {
      heatGroups[lead.heat]?.push(lead)
    })

    Object.entries(heatGroups).forEach(([heat, groupLeads]) => {
      const ringRadius = heat === 'hot' ? maxRadius * 0.25 :
                         heat === 'warm' ? maxRadius * 0.55 :
                         maxRadius * 0.85

      groupLeads.forEach((lead, i) => {
        const angleOffset = Math.random() * 0.3 // Small random offset
        const angle = ((i / groupLeads.length) * Math.PI * 2) + angleOffset
        const radiusJitter = (Math.random() - 0.5) * maxRadius * 0.1

        positions[lead.id] = {
          x: centerX + Math.cos(angle) * (ringRadius + radiusJitter),
          y: centerY + Math.sin(angle) * (ringRadius + radiusJitter)
        }
      })
    })

    return positions
  }, [filteredLeads, centerX, centerY, maxRadius])

  // Stats
  const stats = useMemo(() => ({
    total: leads.length,
    tierA: leads.filter(l => l.tier === 'A').length,
    hot: leads.filter(l => l.heat === 'hot').length,
    warm: leads.filter(l => l.heat === 'warm').length,
    cold: leads.filter(l => l.heat === 'cold').length,
    totalValue: leads.reduce((sum, l) => sum + (l.sqft_estimate || 0), 0)
  }), [leads])

  return (
    <div className="glass rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Tier-A Radar</h3>
          <span className="text-xs text-zinc-500">
            {stats.tierA} whales tracked
          </span>
        </div>

        {/* Heat filter */}
        <div className="flex items-center gap-1">
          {['all', 'hot', 'warm', 'cold'].map(h => (
            <button
              key={h}
              onClick={() => setFilter(h)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filter === h
                  ? h === 'all' ? 'bg-blue-500/20 text-blue-400' :
                    `bg-opacity-20 text-opacity-100`
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              style={filter === h && h !== 'all' ? {
                backgroundColor: `${HEAT_COLORS[h]}20`,
                color: HEAT_COLORS[h]
              } : {}}
            >
              {h === 'all' ? 'All' : h.charAt(0).toUpperCase() + h.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Radar SVG */}
      <div
        ref={containerRef}
        className="relative aspect-square max-h-[400px] w-full"
      >
        <svg
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible"
        >
          {/* Background gradient */}
          <defs>
            <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#0a1628" stopOpacity={0.8} />
            </radialGradient>
          </defs>

          <circle
            cx={centerX}
            cy={centerY}
            r={maxRadius}
            fill="url(#radarGradient)"
          />

          {/* Grid and rings */}
          <RadarRings
            centerX={centerX}
            centerY={centerY}
            maxRadius={maxRadius}
          />

          {/* Sweep line animation */}
          <SweepLine
            centerX={centerX}
            centerY={centerY}
            maxRadius={maxRadius}
          />

          {/* Lead blips */}
          {filteredLeads.map(lead => (
            <LeadBlip
              key={lead.id}
              lead={lead}
              position={leadPositions[lead.id] || { x: centerX, y: centerY }}
              onClick={onSelectLead}
              isSelected={selectedLead?.id === lead.id}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 text-xs">
        <div className="flex items-center gap-4">
          {Object.entries(HEAT_COLORS).map(([heat, color]) => (
            <div key={heat} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-zinc-400">{HEAT_LABELS[heat]}</span>
              <span className="text-zinc-500">({stats[heat]})</span>
            </div>
          ))}
        </div>

        <div className="text-zinc-500">
          {(stats.totalValue / 1000000).toFixed(1)}M sqft total
        </div>
      </div>

      {/* Selected Lead Preview */}
      <AnimatePresence>
        {selectedLead && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{selectedLead.company}</div>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {(selectedLead.sqft_estimate / 1000).toFixed(0)}K sqft
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedLead.market}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${HEAT_COLORS[selectedLead.heat]}20`,
                    color: HEAT_COLORS[selectedLead.heat]
                  }}
                >
                  {selectedLead.heat}
                </span>
                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
                  Tier {selectedLead.tier}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
