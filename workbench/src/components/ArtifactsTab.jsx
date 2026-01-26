import { useState, useEffect } from 'react'

const ARTIFACT_TYPES = [
  { id: 'microsite', label: 'Microsite', desc: 'Single-page responsive HTML' },
  { id: 'deck', label: 'Deck', desc: 'Slide presentation' },
  { id: 'proposal', label: 'Proposal', desc: 'Multi-page document' },
  { id: 'one-pager', label: 'One-Pager', desc: 'Single-page summary' },
]

export default function ArtifactsTab({ notebookId, notebookName, notes = [] }) {
  const [artifacts, setArtifacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGenerate, setShowGenerate] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewArtifact, setPreviewArtifact] = useState(null)
  const [fullNotes, setFullNotes] = useState([])
  const [notesLoaded, setNotesLoaded] = useState(false)

  // Form state
  const [selectedType, setSelectedType] = useState('microsite')
  const [title, setTitle] = useState('')

  // Extract business name from notebook (keep hyphens for feed-farm)
  const business = notebookName?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'default'

  useEffect(() => {
    fetchArtifacts()
    setNotesLoaded(false)
    setFullNotes([])
  }, [notebookId, business])

  // Load full notes when generate modal opens
  useEffect(() => {
    if (showGenerate && !notesLoaded && notes.length > 0) {
      loadFullNotes()
    }
  }, [showGenerate, notes, notesLoaded])

  async function loadFullNotes() {
    console.log('[ArtifactsTab] Loading full notes for generation')
    try {
      const loaded = await Promise.all(
        notes.slice(0, 10).map(async (n) => {
          try {
            const res = await fetch(`/api/notes/${n.id}`)
            if (res.ok) {
              return await res.json()
            }
          } catch (e) {
            console.error('[ArtifactsTab] Failed to fetch note:', n.id)
          }
          return n
        })
      )
      const withContent = loaded.filter(n => n && n.content)
      console.log('[ArtifactsTab] Loaded', withContent.length, 'notes with content')
      setFullNotes(withContent)
      setNotesLoaded(true)
    } catch (err) {
      console.error('[ArtifactsTab] Failed to load notes:', err)
    }
  }

  async function fetchArtifacts() {
    setLoading(true)
    try {
      const res = await fetch(`/mars/api/artifacts?business=${business}`)
      if (res.ok) {
        const data = await res.json()
        setArtifacts(data.artifacts || [])
      }
    } catch (err) {
      console.error('Failed to fetch artifacts:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (!title.trim()) return

    setGenerating(true)
    try {
      // Include notes with content for context-aware generation
      const notesForGeneration = fullNotes.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
      }))

      console.log('[ArtifactsTab] Generating with', notesForGeneration.length, 'notes for', business)

      const res = await fetch('/mars/api/artifacts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          business,
          title: title.trim(),
          notebookId,
          notes: notesForGeneration,
        }),
      })

      if (res.ok) {
        setTitle('')
        setShowGenerate(false)
        fetchArtifacts()
      } else {
        const err = await res.json()
        console.error('Generate failed:', err)
      }
    } catch (err) {
      console.error('Failed to generate artifact:', err)
    } finally {
      setGenerating(false)
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'published': return 'text-green-400'
      case 'draft': return 'text-yellow-400'
      case 'review': return 'text-blue-400'
      default: return 'text-[var(--text-muted)]'
    }
  }

  return (
    <div>
      {/* Actions */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setShowGenerate(true)}
          className="px-3 py-1.5 text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded transition-colors"
        >
          Generate Artifact
        </button>
        <button
          onClick={fetchArtifacts}
          className="px-3 py-1.5 text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--border)] rounded border border-[var(--border)] transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Generate Artifact</h3>
            <form onSubmit={handleGenerate}>
              <div className="mb-4">
                <label className="block text-xs text-[var(--text-muted)] mb-2">
                  Artifact Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ARTIFACT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedType(type.id)}
                      className={`p-3 rounded border text-left transition-colors ${
                        selectedType === type.id
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                          : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      <div className="text-sm font-medium">{type.label}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-[var(--text-muted)] mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Q1 Marketing Proposal"
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowGenerate(false)}
                  className="px-4 py-2 text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--border)] rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || !title.trim()}
                  className="px-4 py-2 text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded disabled:opacity-50 transition-colors"
                >
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewArtifact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div>
                <h3 className="font-semibold">{previewArtifact.title}</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {previewArtifact.type} · {previewArtifact.status}
                </p>
              </div>
              <button
                onClick={() => setPreviewArtifact(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>
            <div className="flex-1 bg-white">
              <iframe
                src={`/mars/api/artifacts/${previewArtifact.id}/preview`}
                className="w-full h-full border-0"
                title={previewArtifact.title}
              />
            </div>
          </div>
        </div>
      )}

      {/* Artifacts Grid */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p className="text-sm animate-pulse">Loading artifacts...</p>
        </div>
      ) : artifacts.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <div className="text-4xl mb-3 opacity-30">A</div>
          <p className="text-sm">No artifacts yet</p>
          <p className="text-xs mt-1">
            Generate microsites, decks, proposals, and one-pagers
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="p-4 bg-[var(--bg-secondary)] rounded border border-[var(--border)] hover:border-[var(--text-muted)] transition-colors"
            >
              {/* Preview thumbnail */}
              <div
                className="h-32 bg-[var(--bg-tertiary)] rounded mb-3 flex items-center justify-center cursor-pointer hover:bg-[var(--border)] transition-colors"
                onClick={() => setPreviewArtifact(artifact)}
              >
                <span className="text-[var(--text-muted)] text-xs">Click to preview</span>
              </div>

              {/* Info */}
              <h3 className="font-medium text-sm truncate">{artifact.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase">
                  {artifact.type}
                </span>
                <span className={`text-[10px] ${getStatusColor(artifact.status)}`}>
                  {artifact.status}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                {new Date(artifact.created).toLocaleDateString()}
              </p>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setPreviewArtifact(artifact)}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  Preview
                </button>
                {artifact.status === 'published' && (
                  <a
                    href={`/mars/api/artifacts/${artifact.id}/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Open
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
