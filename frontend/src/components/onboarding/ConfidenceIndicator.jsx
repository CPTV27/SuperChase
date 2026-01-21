import { CheckCircle, AlertCircle, HelpCircle } from 'lucide-react'

const config = {
  high: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    icon: CheckCircle,
    label: 'Verified',
  },
  medium: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    icon: AlertCircle,
    label: 'Inferred',
  },
  low: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    icon: HelpCircle,
    label: 'Uncertain',
  },
}

export function ConfidenceIndicator({ level }) {
  const { bg, text, icon: Icon, label } = config[level] || config.low

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
      text-xs font-medium ${bg} ${text}
    `}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

export default ConfidenceIndicator
