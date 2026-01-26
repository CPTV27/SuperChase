import { useState, useRef, useEffect } from 'react'

export default function ChatTab({ notebookId, sources, notes }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [fullNotes, setFullNotes] = useState([])
  const messagesEndRef = useRef(null)

  // Reset when notebook changes
  useEffect(() => {
    setMessages([])
    setNotesLoaded(false)
    setFullNotes([])
  }, [notebookId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch full note content when tab is opened
  useEffect(() => {
    if (notes.length > 0 && !notesLoaded) {
      loadFullNotes()
    }
  }, [notes, notesLoaded])

  async function loadFullNotes() {
    console.log('[ChatTab] Loading full notes for', notes.length, 'notes')
    try {
      const loaded = await Promise.all(
        notes.slice(0, 15).map(async (n) => {
          try {
            const url = `/api/notes/${n.id}`
            const res = await fetch(url)
            if (res.ok) {
              const fullNote = await res.json()
              console.log('[ChatTab] Loaded:', fullNote.title, 'content:', fullNote.content?.length || 0)
              return fullNote
            }
          } catch (e) {
            console.error('[ChatTab] Failed to fetch note:', n.id, e)
          }
          return n
        })
      )
      const withContent = loaded.filter(n => n && n.content)
      console.log('[ChatTab] Loaded', withContent.length, 'notes with content')
      setFullNotes(loaded.filter(Boolean))
      setNotesLoaded(true)
    } catch (err) {
      console.error('[ChatTab] Failed to load notes:', err)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Build context from fully loaded notes
      const notesWithContent = fullNotes.filter(n => n.content)

      // Query the notebook via MARS API
      const res = await fetch('/mars/api/notebook/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          notebookId,
          context: {
            sources: sources.map((s) => ({ id: s.id, title: s.title, type: s.type })),
            notes: notesWithContent.map((n) => ({
              id: n.id,
              title: n.title,
              content: n.content,
            })),
          },
        }),
      })

      if (!res.ok) {
        throw new Error('Query failed')
      }

      const data = await res.json()

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response || data.answer || 'No response generated.',
          sources: data.sources || data.citations || [],
        },
      ])
    } catch (err) {
      console.error('Chat error:', err)
      // Fallback: search through loaded notes locally
      const queryLower = userMessage.content.toLowerCase()
      const relevantNotes = fullNotes.filter(
        (n) =>
          n.title?.toLowerCase().includes(queryLower) ||
          n.content?.toLowerCase().includes(queryLower)
      )

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: relevantNotes.length > 0
            ? `Based on your notes, I found ${relevantNotes.length} relevant item(s):\n\n${relevantNotes.map((n) => `**${n.title}**\n${n.content?.slice(0, 300)}...`).join('\n\n')}`
            : 'I couldn\'t connect to the query service. Try searching your notes directly.',
          sources: relevantNotes.map((n) => ({ type: 'note', title: n.title, id: n.id })),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadedCount = fullNotes.filter(n => n.content).length

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <div className="text-4xl mb-3 opacity-30">?</div>
            <p className="text-sm">Ask questions about this notebook</p>
            <p className="text-xs mt-1">
              {notesLoaded
                ? `Ready: ${loadedCount} notes loaded`
                : `Loading ${notes.length} notes...`}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-secondary)] border border-[var(--border)]'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

                {/* Source citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase mb-2">
                      Sources
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-xs bg-[var(--bg-tertiary)] px-2 py-1 rounded"
                        >
                          <span>{src.type === 'note' ? 'N' : 'S'}</span>
                          <span className="text-[var(--text-secondary)]">
                            {src.title || src.name || 'Source'}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                <span className="animate-pulse">Searching notebook...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="mt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your sources and notes..."
            className="flex-1 px-4 py-3 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
