import { useState } from 'react'

export default function SourcesTab({ sources, notebookId, onRefresh }) {
  const [showAddUrl, setShowAddUrl] = useState(false)
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAddUrl(e) {
    e.preventDefault()
    if (!url.trim()) return

    setAdding(true)
    try {
      await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebook_id: notebookId,
          type: 'url',
          url: url.trim(),
        }),
      })
      setUrl('')
      setShowAddUrl(false)
      onRefresh()
    } catch (err) {
      console.error('Failed to add source:', err)
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(sourceId) {
    if (!confirm('Delete this source?')) return
    try {
      await fetch(`/api/sources/${sourceId}`, { method: 'DELETE' })
      onRefresh()
    } catch (err) {
      console.error('Failed to delete source:', err)
    }
  }

  return (
    <div>
      {/* Actions */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setShowAddUrl(!showAddUrl)}
          className="px-3 py-1.5 text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--border)] rounded border border-[var(--border)] transition-colors"
        >
          + Add URL
        </button>
        <button
          disabled
          className="px-3 py-1.5 text-xs bg-[var(--bg-tertiary)] rounded border border-[var(--border)] opacity-50 cursor-not-allowed"
        >
          Upload File
        </button>
        <button
          disabled
          className="px-3 py-1.5 text-xs bg-[var(--bg-tertiary)] rounded border border-[var(--border)] opacity-50 cursor-not-allowed"
        >
          Paste Text
        </button>
      </div>

      {/* Add URL Form */}
      {showAddUrl && (
        <form onSubmit={handleAddUrl} className="mb-6 p-4 bg-[var(--bg-secondary)] rounded border border-[var(--border)]">
          <label className="block text-xs text-[var(--text-muted)] mb-2">
            URL to fetch
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/document"
              className="flex-1 px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
              autoFocus
            />
            <button
              type="submit"
              disabled={adding || !url.trim()}
              className="px-4 py-2 text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded disabled:opacity-50 transition-colors"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddUrl(false)}
              className="px-4 py-2 text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--border)] rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Source List */}
      {sources.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <div className="text-4xl mb-3 opacity-30">+</div>
          <p className="text-sm">No sources yet</p>
          <p className="text-xs mt-1">Add URLs, upload files, or paste text</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="p-4 bg-[var(--bg-secondary)] rounded border border-[var(--border)] hover:border-[var(--text-muted)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] uppercase">
                      {source.type || 'url'}
                    </span>
                    {source.status === 'embedded' && (
                      <span className="text-[10px] text-green-400">
                        Embedded
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium mt-1 truncate">
                    {source.title || source.url || 'Untitled'}
                  </h3>
                  {source.url && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                      {source.url}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(source.id)}
                  className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
