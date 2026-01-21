import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  X,
  Brain,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  Minimize2,
  Maximize2
} from 'lucide-react'

/**
 * George Chat Component
 *
 * Persistent chat interface for querying George (the AI executive assistant).
 * Supports text input and voice (when available).
 */

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://superchase-production.up.railway.app'
  : '')
const API_KEY = 'sc_676782661b25ced4ffaa25c0a5b4bfa7b07985f6b49fe0ee'

function ChatMessage({ message, isUser }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`
        w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
        ${isUser ? 'bg-blue-500/20' : 'bg-purple-500/20'}
      `}>
        {isUser ? (
          <span className="text-sm">CP</span>
        ) : (
          <Brain className="w-4 h-4 text-purple-400" />
        )}
      </div>
      <div className={`
        max-w-[80%] rounded-2xl px-4 py-2.5
        ${isUser
          ? 'bg-blue-500/20 text-blue-100 rounded-tr-sm'
          : 'bg-zinc-800/80 text-zinc-200 rounded-tl-sm'
        }
      `}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
        {message.context && (
          <div className="mt-2 pt-2 border-t border-zinc-700/50 text-xs text-zinc-500">
            {message.context}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function GeorgeChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      isUser: false,
      text: "Good evening, Mr. Pierson. How may I assist you?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Keyboard shortcut to open chat (Cmd+J or Ctrl+J)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  async function sendMessage() {
    if (!input.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      isUser: true,
      text: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Build conversation history for context (last 6 messages)
      const recentMessages = [...messages, userMessage].slice(-6)
      const conversationHistory = recentMessages.map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.text
      }))

      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          query: userMessage.text,
          conversationHistory
        })
      })

      const data = await response.json()

      const georgeMessage = {
        id: Date.now() + 1,
        isUser: false,
        text: data.answer || data.error || 'I apologize, but I was unable to process that request.',
        context: data.sources ? `Sources: ${data.sources.join(', ')}` : null,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, georgeMessage])
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        isUser: false,
        text: 'I apologize, but I encountered a connection error. Please try again.',
        timestamp: new Date()
      }])
    }

    setIsLoading(false)
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Toggle button when closed
  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/30 flex items-center justify-center"
        title="Chat with George (⌘J)"
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={`
        fixed z-50 flex flex-col
        bg-zinc-900/95 backdrop-blur-xl border border-zinc-800
        shadow-2xl shadow-black/50
        ${isExpanded
          ? 'inset-4 rounded-2xl'
          : 'bottom-24 right-6 w-96 h-[500px] rounded-2xl'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">George</h3>
            <p className="text-xs text-zinc-500">Executive Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-zinc-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-zinc-400" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} isUser={message.isUser} />
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-purple-400" />
            </div>
            <div className="bg-zinc-800/80 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask George anything..."
              rows={1}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={() => setIsListening(!isListening)}
            className={`p-3 rounded-xl transition-colors ${
              isListening
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Voice input"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl text-white transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-zinc-600">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>⌘J to toggle</span>
        </div>
      </div>
    </motion.div>
  )
}
