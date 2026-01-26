import { useState, useEffect } from 'react'

// Simple markdown renderer for common patterns
function renderMarkdown(text) {
  if (!text) return null

  return text.split('\n').map((line, i) => {
    // Headers
    if (line.startsWith('### ')) {
      return <h3 key={i} className="text-base font-semibold mt-4 mb-2">{line.slice(4)}</h3>
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} className="text-lg font-semibold mt-5 mb-2">{line.slice(3)}</h2>
    }
    if (line.startsWith('# ')) {
      return <h1 key={i} className="text-xl font-bold mt-6 mb-3">{line.slice(2)}</h1>
    }

    // Checkbox items
    if (line.match(/^- \[[ x]\] /)) {
      const checked = line.includes('[x]')
      const content = line.replace(/^- \[[ x]\] /, '')
      return (
        <div key={i} className="flex items-start gap-2 my-1">
          <span className={checked ? 'text-green-400' : 'text-[var(--text-muted)]'}>
            {checked ? '✓' : '○'}
          </span>
          <span className={checked ? 'line-through text-[var(--text-muted)]' : ''}>
            {renderInline(content)}
          </span>
        </div>
      )
    }

    // List items
    if (line.startsWith('- ')) {
      return (
        <div key={i} className="flex items-start gap-2 my-1 ml-2">
          <span className="text-[var(--text-muted)]">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\. (.*)/)
    if (numberedMatch) {
      return (
        <div key={i} className="flex items-start gap-2 my-1 ml-2">
          <span className="text-[var(--text-muted)] min-w-[1.5em]">{numberedMatch[1]}.</span>
          <span>{renderInline(numberedMatch[2])}</span>
        </div>
      )
    }

    // Empty line
    if (line.trim() === '') {
      return <div key={i} className="h-2" />
    }

    // Regular paragraph
    return <p key={i} className="my-1">{renderInline(line)}</p>
  })
}

// Render inline markdown (bold, italic, code, links)
function renderInline(text) {
  if (!text) return text

  // Split by markdown patterns and render
  const parts = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Code `text`
    const codeMatch = remaining.match(/`([^`]+)`/)
    // Link [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)

    // Find earliest match
    const matches = [
      boldMatch && { type: 'bold', match: boldMatch, index: remaining.indexOf(boldMatch[0]) },
      codeMatch && { type: 'code', match: codeMatch, index: remaining.indexOf(codeMatch[0]) },
      linkMatch && { type: 'link', match: linkMatch, index: remaining.indexOf(linkMatch[0]) },
    ].filter(Boolean).sort((a, b) => a.index - b.index)

    if (matches.length === 0) {
      parts.push(remaining)
      break
    }

    const first = matches[0]

    // Add text before match
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index))
    }

    // Add formatted match
    if (first.type === 'bold') {
      parts.push(<strong key={key++} className="font-semibold text-[var(--text-primary)]">{first.match[1]}</strong>)
    } else if (first.type === 'code') {
      parts.push(<code key={key++} className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-[var(--accent)] text-xs">{first.match[1]}</code>)
    } else if (first.type === 'link') {
      parts.push(<a key={key++} href={first.match[2]} className="text-[var(--accent)] hover:underline" target="_blank" rel="noopener">{first.match[1]}</a>)
    }

    remaining = remaining.slice(first.index + first.match[0].length)
  }

  return parts.length === 1 ? parts[0] : parts
}

export default function NotesTab({ notes, notebookId, onRefresh }) {
  const [expandedId, setExpandedId] = useState(null)
  const [noteContents, setNoteContents] = useState({}) // Cache for loaded content
  const [loadingNote, setLoadingNote] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [creating, setCreating] = useState(false)

  // Reset state when notebook changes
  useEffect(() => {
    setExpandedId(null)
    setNoteContents({})
    setLoadingNote(null)
  }, [notebookId])

  async function handleExpand(noteId) {
    if (expandedId === noteId) {
      setExpandedId(null)
      return
    }

    setExpandedId(noteId)

    // Fetch full content if not cached
    if (!noteContents[noteId]) {
      setLoadingNote(noteId)
      try {
        const url = `/api/notes/${noteId}`
        console.log('[NotesTab] Fetching:', url)
        const res = await fetch(url)
        console.log('[NotesTab] Response status:', res.status)
        if (res.ok) {
          const fullNote = await res.json()
          console.log('[NotesTab] Got note:', fullNote.title, 'content length:', fullNote.content?.length)
          setNoteContents(prev => ({ ...prev, [noteId]: fullNote.content }))
        } else {
          console.error('[NotesTab] Failed to fetch:', res.status, res.statusText)
        }
      } catch (err) {
        console.error('[NotesTab] Failed to fetch note content:', err)
      } finally {
        setLoadingNote(null)
      }
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newTitle.trim()) return

    setCreating(true)
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebook_id: notebookId,
          title: newTitle.trim(),
          content: newContent.trim(),
        }),
      })
      setNewTitle('')
      setNewContent('')
      setShowCreate(false)
      onRefresh()
    } catch (err) {
      console.error('Failed to create note:', err)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(noteId) {
    if (!confirm('Delete this note?')) return
    try {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
      setNoteContents(prev => {
        const next = { ...prev }
        delete next[noteId]
        return next
      })
      onRefresh()
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  return (
    <div>
      {/* Actions */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--border)] rounded border border-[var(--border)] transition-colors"
        >
          + Create Note
        </button>
        <button
          disabled
          className="px-3 py-1.5 text-xs bg-[var(--bg-tertiary)] rounded border border-[var(--border)] opacity-50 cursor-not-allowed"
        >
          AI Summarize
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-[var(--bg-secondary)] rounded border border-[var(--border)]">
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-2">
              Title
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Note title"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-2">
              Content
            </label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Note content (markdown supported)"
              rows={6}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] resize-y"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="px-4 py-2 text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--border)] rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <div className="text-4xl mb-3 opacity-30">N</div>
          <p className="text-sm">No notes yet</p>
          <p className="text-xs mt-1">Create notes or generate AI summaries</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const isExpanded = expandedId === note.id
            const isLoading = loadingNote === note.id
            const content = noteContents[note.id]

            return (
              <div
                key={note.id}
                className="bg-[var(--bg-secondary)] rounded border border-[var(--border)] overflow-hidden"
              >
                <button
                  onClick={() => handleExpand(note.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                    <span className="font-medium truncate">
                      {note.title || 'Untitled'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {new Date(note.created).toLocaleDateString()}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[var(--border)]">
                    <div className="pt-3 text-sm text-[var(--text-secondary)]">
                      {isLoading ? (
                        <div className="text-[var(--text-muted)] animate-pulse">Loading...</div>
                      ) : content ? (
                        <div className="prose-invert">{renderMarkdown(content)}</div>
                      ) : (
                        <div className="text-[var(--text-muted)] italic">No content</div>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-[var(--border)] flex gap-3">
                      <button
                        disabled
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        disabled
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors opacity-50"
                      >
                        Use in Artifact
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
