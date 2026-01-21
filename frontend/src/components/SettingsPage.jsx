import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Key,
  Bell,
  Palette,
  Database,
  Shield,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { getSpokeStatus } from '../services/api'

/**
 * Settings Page
 *
 * System configuration and spoke status overview.
 */

const SPOKES = [
  { id: 'asana', name: 'Asana', description: 'Task management', envVar: 'ASANA_ACCESS_TOKEN' },
  { id: 'twitter', name: 'Twitter/X', description: 'Social publishing', envVar: 'TWITTER_BEARER_TOKEN' },
  { id: 'gmail', name: 'Gmail', description: 'Email processing', envVar: 'GOOGLE_*' },
  { id: 'sheets', name: 'Google Sheets', description: 'Audit logging', envVar: 'SHEET_ID' },
  { id: 'hub', name: 'Gemini Hub', description: 'AI classification', envVar: 'GEMINI_API_KEY' },
  { id: 'voice', name: 'ElevenLabs', description: 'Voice synthesis', envVar: 'ELEVENLABS_API_KEY' },
  { id: 'limitless', name: 'Limitless', description: 'Pendant lifelogs', envVar: 'LIMITLESS_API_KEY' }
]

function SpokeCard({ spoke, status }) {
  const isOnline = status?.status === 'online'
  const isWarning = status?.status === 'warning'

  return (
    <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl border border-zinc-800">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isOnline ? 'bg-emerald-500/20' : isWarning ? 'bg-amber-500/20' : 'bg-red-500/20'
        }`}>
          {isOnline ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : isWarning ? (
            <RefreshCw className="w-5 h-5 text-amber-400" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400" />
          )}
        </div>
        <div>
          <div className="font-medium text-zinc-200">{spoke.name}</div>
          <div className="text-xs text-zinc-500">{spoke.description}</div>
        </div>
      </div>

      <div className="text-right">
        <div className={`text-sm font-medium ${
          isOnline ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-red-400'
        }`}>
          {status?.status || 'Unknown'}
        </div>
        <div className="text-xs text-zinc-600 max-w-[200px] truncate">
          {status?.message || 'No status'}
        </div>
      </div>
    </div>
  )
}

function SettingsSection({ title, icon: Icon, children }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
        <Icon className="w-5 h-5 text-zinc-400" />
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [spokeStatus, setSpokeStatus] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    setLoading(true)
    const status = await getSpokeStatus()
    setSpokeStatus(status.spokes || {})
    setLoading(false)
  }

  const onlineCount = Object.values(spokeStatus).filter(s => s.status === 'online').length
  const totalCount = SPOKES.length

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-sm text-zinc-500">System configuration and status</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-white">{onlineCount}/{totalCount}</div>
          <div className="text-xs text-zinc-500">Spokes Online</div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Spoke Status */}
        <SettingsSection title="Spoke Status" icon={Database}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-400">
              Integration status for all connected services
            </p>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {SPOKES.map(spoke => (
              <SpokeCard
                key={spoke.id}
                spoke={spoke}
                status={spokeStatus[spoke.id]}
              />
            ))}
          </div>
        </SettingsSection>

        {/* Quick Links */}
        <SettingsSection title="External Services" icon={ExternalLink}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Railway', url: 'https://railway.com/project/cc5389c6-ab33-4c79-8d52-c96f995b8d27' },
              { name: 'Asana', url: 'https://app.asana.com/' },
              { name: 'GitHub', url: 'https://github.com/CPTV27/SuperChase' },
              { name: 'Documentation', url: 'https://superchase-manual-production.up.railway.app' }
            ].map(link => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {link.name}
              </a>
            ))}
          </div>
        </SettingsSection>

        {/* Keyboard Shortcuts */}
        <SettingsSection title="Keyboard Shortcuts" icon={Key}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { keys: '⌘ K', action: 'Command palette' },
              { keys: '⌘ J', action: 'Toggle George chat' },
              { keys: 'Esc', action: 'Close modal / chat' },
              { keys: '↑ ↓', action: 'Navigate lists' },
              { keys: 'Enter', action: 'Select / Submit' },
              { keys: 'G then D', action: 'Go to Dashboard' }
            ].map(shortcut => (
              <div key={shortcut.keys} className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">{shortcut.action}</span>
                <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </SettingsSection>

        {/* System Info */}
        <SettingsSection title="System Info" icon={Shield}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-zinc-500">Version</div>
              <div className="text-zinc-200">v3.0 Executive Cockpit</div>
            </div>
            <div>
              <div className="text-zinc-500">Backend</div>
              <div className="text-zinc-200">superchase-production.up.railway.app</div>
            </div>
            <div>
              <div className="text-zinc-500">Frontend</div>
              <div className="text-zinc-200">superchase-dashboard-production.up.railway.app</div>
            </div>
            <div>
              <div className="text-zinc-500">Architecture</div>
              <div className="text-zinc-200">Hub & Spoke (Asana-centric)</div>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
