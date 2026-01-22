import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Calendar, Layers, Target, Award, Fish, AlertTriangle } from 'lucide-react'

/**
 * Hockey Stick KPIs Header
 * Displays real-time KPIs from FY2026 strategy targets
 */

const ICONS = {
  'dollar-sign': DollarSign,
  'trending-up': TrendingUp,
  'calendar': Calendar,
  'layers': Layers,
  'target': Target,
  'award': Award,
  'fish': Fish
}

function formatValue(value, unit, format) {
  if (value === null || value === undefined) return '-'

  switch (unit) {
    case 'currency':
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
      return `$${value.toLocaleString()}`
    case 'percentage':
      return `${(value * 100).toFixed(0)}%`
    case 'multiplier':
      return `${value.toFixed(1)}x`
    case 'number':
    default:
      return value.toFixed ? value.toFixed(1) : value.toString()
  }
}

function KPICard({ kpi, data }) {
  const Icon = ICONS[kpi.icon] || Target
  const current = data?.current ?? kpi.current ?? 0
  const target = kpi.target
  const progress = target ? (current / target) * 100 : 0
  const isAlert = kpi.alertThreshold && (
    kpi.unit === 'percentage' ? current < kpi.alertThreshold :
    kpi.unit === 'multiplier' ? current < kpi.alertThreshold :
    progress < (kpi.alertThreshold * 100)
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-xl p-3 flex items-center gap-3 min-w-[140px] ${
        isAlert ? 'border border-red-500/50' : ''
      }`}
    >
      <div className={`p-2 rounded-lg ${
        isAlert ? 'bg-red-500/20' : 'bg-blue-500/20'
      }`}>
        <Icon className={`w-4 h-4 ${isAlert ? 'text-red-400' : 'text-blue-400'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs text-zinc-500 truncate">{kpi.label}</div>
        <div className="flex items-baseline gap-1">
          <span className={`text-lg font-bold ${
            isAlert ? 'text-red-400' : 'text-white'
          }`}>
            {formatValue(current, kpi.unit)}
          </span>
          <span className="text-xs text-zinc-500">
            / {formatValue(target, kpi.unit)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              isAlert ? 'bg-red-500' :
              progress >= 100 ? 'bg-green-500' :
              progress >= 75 ? 'bg-blue-500' :
              'bg-amber-500'
            }`}
          />
        </div>
      </div>

      {isAlert && (
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
      )}
    </motion.div>
  )
}

export default function KPIHeader({ kpis, liveData }) {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    setAnimate(true)
  }, [liveData])

  // Default KPIs if not provided
  const defaultKpis = {
    revenue: {
      label: 'Revenue',
      target: 2200000,
      current: 45000,
      unit: 'currency',
      alertThreshold: 0.90,
      icon: 'dollar-sign'
    },
    grossMargin: {
      label: 'Gross Margin',
      target: 0.45,
      floor: 0.40,
      current: 0.43,
      unit: 'percentage',
      alertThreshold: 0.42,
      icon: 'trending-up'
    },
    meetingsPerWeek: {
      label: 'Mtgs/Week',
      target: 4.5,
      current: 3.2,
      unit: 'number',
      alertThreshold: 4.0,
      icon: 'calendar'
    },
    pipelineCoverage: {
      label: 'Pipeline',
      target: 3.0,
      current: 2.8,
      unit: 'multiplier',
      alertThreshold: 2.5,
      icon: 'layers'
    },
    tierAMeetings: {
      label: 'Tier-A YTD',
      target: 60,
      current: 4,
      unit: 'number',
      icon: 'target'
    },
    winRate: {
      label: 'Win Rate',
      target: 0.30,
      current: 0.28,
      unit: 'percentage',
      alertThreshold: 0.25,
      icon: 'award'
    },
    whaleWins: {
      label: 'Whale Wins',
      target: 12,
      current: 0,
      unit: 'number',
      icon: 'fish'
    }
  }

  const displayKpis = kpis || defaultKpis

  return (
    <div className="w-full">
      {/* Quarter + Phase indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">Q1 2026</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
            Phase 1: Build Engines
          </span>
        </div>
        <span className="text-xs text-zinc-500">
          Week 3 of 12
        </span>
      </div>

      {/* KPI Cards - horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
        {Object.entries(displayKpis).map(([key, kpi], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <KPICard
              kpi={kpi}
              data={liveData?.[key]}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
