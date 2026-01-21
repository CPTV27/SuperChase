import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  LayoutDashboard,
  FileText,
  Megaphone,
  Target,
  Radio,
  Sparkles,
  Building2,
  Settings,
  RefreshCw,
  Brain,
  ListTodo,
  History,
  MessageSquare,
  Zap,
  Command
} from 'lucide-react'
import { searchLimitless, triggerLimitlessScout } from '../services/api'

/**
 * Command Palette Component
 *
 * Global search and command interface.
 * Activated with Cmd+K or Ctrl+K.
 */

const COMMANDS = [
  // Navigation
  { id: 'nav-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, action: 'navigate', path: '/', category: 'Navigation' },
  { id: 'nav-review', label: 'Go to Review Queue', icon: FileText, action: 'navigate', path: '/review', category: 'Navigation' },
  { id: 'nav-marketing', label: 'Go to Marketing Hub', icon: Megaphone, action: 'navigate', path: '/marketing', category: 'Navigation' },
  { id: 'nav-s2p', label: 'Go to S2P Lead Radar', icon: Target, action: 'navigate', path: '/s2p', category: 'Navigation' },
  { id: 'nav-sparks', label: 'Go to Voice Sparks', icon: Radio, action: 'navigate', path: '/sparks', category: 'Navigation' },
  { id: 'nav-insights', label: 'Go to Scout Insights', icon: Sparkles, action: 'navigate', path: '/insights', category: 'Navigation' },
  { id: 'nav-tasks', label: 'Go to Tasks', icon: ListTodo, action: 'navigate', path: '/tasks', category: 'Navigation' },
  { id: 'nav-logs', label: 'Go to Audit Log', icon: History, action: 'navigate', path: '/logs', category: 'Navigation' },
  { id: 'nav-settings', label: 'Go to Settings', icon: Settings, action: 'navigate', path: '/settings', category: 'Navigation' },

  // Portfolio
  { id: 'port-s2p', label: 'Scan2Plan GST', icon: Building2, action: 'navigate', path: '/gst/s2p', category: 'Portfolio' },
  { id: 'port-bigmuddy', label: 'Big Muddy GST', icon: Building2, action: 'navigate', path: '/gst/bigmuddy', category: 'Portfolio' },
  { id: 'port-studioc', label: 'Studio C GST', icon: Building2, action: 'navigate', path: '/gst/studioc', category: 'Portfolio' },
  { id: 'port-tuthill', label: 'Tuthill GST', icon: Building2, action: 'navigate', path: '/gst/tuthill', category: 'Portfolio' },
  { id: 'port-utopia', label: 'Utopia GST', icon: Building2, action: 'navigate', path: '/gst/utopia', category: 'Portfolio' },
  { id: 'port-cptv', label: 'CPTV GST', icon: Building2, action: 'navigate', path: '/gst/cptv', category: 'Portfolio' },

  // Actions
  { id: 'action-scout', label: 'Run Limitless Scout', icon: Sparkles, action: 'scout', category: 'Actions' },
  { id: 'action-briefing', label: 'Generate Briefing', icon: Brain, action: 'briefing', category: 'Actions' },
  { id: 'action-chat', label: 'Chat with George', icon: MessageSquare, action: 'chat', category: 'Actions' },
  { id: 'action-refresh', label: 'Refresh Dashboard', icon: RefreshCw, action: 'refresh', category: 'Actions' },
]

function CommandItem({ command, isSelected, onSelect }) {
  const Icon = command.icon

  return (
    <button
      onClick={() => onSelect(command)}
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
        ${isSelected ? 'bg-blue-500/20 text-white' : 'text-zinc-300 hover:bg-zinc-800/50'}
      `}
    >
      <Icon className="w-5 h-5 text-zinc-400" />
      <span className="flex-1">{command.label}</span>
      {command.shortcut && (
        <kbd className="px-2 py-0.5 text-xs bg-zinc-800 rounded text-zinc-500">{command.shortcut}</kbd>
      )}
    </button>
  )
}

function SearchResult({ result, isSelected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(result)}
      className={`
        w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
        ${isSelected ? 'bg-blue-500/20' : 'hover:bg-zinc-800/50'}
      `}
    >
      <Search className="w-5 h-5 text-zinc-500 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{result.title || result.text?.substring(0, 50)}</div>
        {result.snippet && (
          <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{result.snippet}</div>
        )}
      </div>
    </button>
  )
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [mode, setMode] = useState('commands') // commands, search
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return COMMANDS
    const q = query.toLowerCase()
    return COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    )
  }, [query])

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups = {}
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = []
      groups[cmd.category].push(cmd)
    })
    return groups
  }, [filteredCommands])

  // Flatten for keyboard navigation
  const allItems = useMemo(() => {
    if (mode === 'search') return searchResults
    return filteredCommands
  }, [mode, filteredCommands, searchResults])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Open palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
        setQuery('')
        setSelectedIndex(0)
        setMode('commands')
      }

      if (!isOpen) return

      // Close
      if (e.key === 'Escape') {
        setIsOpen(false)
      }

      // Navigate
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      }

      // Select
      if (e.key === 'Enter' && allItems[selectedIndex]) {
        e.preventDefault()
        handleSelect(allItems[selectedIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, allItems, selectedIndex])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Search Limitless when query changes (debounced)
  useEffect(() => {
    if (!query || query.length < 3) {
      setMode('commands')
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      setMode('search')
      try {
        const results = await searchLimitless(query)
        setSearchResults(results.results || [])
      } catch (e) {
        console.error('Search failed:', e)
        setSearchResults([])
      }
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  async function handleSelect(item) {
    if (item.action === 'navigate') {
      navigate(item.path)
      setIsOpen(false)
    } else if (item.action === 'scout') {
      setIsOpen(false)
      await triggerLimitlessScout()
    } else if (item.action === 'briefing') {
      setIsOpen(false)
      // Trigger briefing
    } else if (item.action === 'chat') {
      setIsOpen(false)
      // Would open George chat
    } else if (item.action === 'refresh') {
      window.location.reload()
    } else if (item.title || item.text) {
      // Search result - could navigate to detail view
      console.log('Selected search result:', item)
      setIsOpen(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
            <Search className="w-5 h-5 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Search or type a command..."
              className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none"
            />
            {isSearching && <RefreshCw className="w-4 h-4 text-zinc-500 animate-spin" />}
            <kbd className="px-2 py-1 text-xs bg-zinc-800 rounded text-zinc-500 flex items-center gap-1">
              <Command className="w-3 h-3" />K
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {mode === 'commands' ? (
              Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category}>
                  <div className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase bg-zinc-900/50">
                    {category}
                  </div>
                  {commands.map((cmd, i) => {
                    const globalIndex = filteredCommands.indexOf(cmd)
                    return (
                      <CommandItem
                        key={cmd.id}
                        command={cmd}
                        isSelected={selectedIndex === globalIndex}
                        onSelect={handleSelect}
                      />
                    )
                  })}
                </div>
              ))
            ) : (
              <>
                <div className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase bg-zinc-900/50">
                  Limitless Search Results
                </div>
                {searchResults.length > 0 ? (
                  searchResults.map((result, i) => (
                    <SearchResult
                      key={i}
                      result={result}
                      isSelected={selectedIndex === i}
                      onSelect={handleSelect}
                    />
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-zinc-500">
                    {isSearching ? 'Searching...' : 'No results found'}
                  </div>
                )}
              </>
            )}

            {filteredCommands.length === 0 && mode === 'commands' && (
              <div className="px-4 py-8 text-center text-zinc-500">
                No commands match your search
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
            <span>Type 3+ chars to search Limitless</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
