export default function Sidebar({ notebooks, selectedNotebook, onSelect, loading }) {
  return (
    <aside className="w-64 min-w-64 h-screen bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <h1 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
          MARS WORKBENCH
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Knowledge Pipeline
        </p>
      </div>

      {/* Notebook List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] px-2 py-2">
            Notebooks
          </div>

          {loading ? (
            <div className="px-2 py-4 text-[var(--text-muted)] text-xs">
              Loading...
            </div>
          ) : notebooks.length === 0 ? (
            <div className="px-2 py-4 text-[var(--text-muted)] text-xs">
              No notebooks found
            </div>
          ) : (
            <ul className="space-y-0.5">
              {notebooks.map((nb) => (
                <li key={nb.id}>
                  <button
                    onClick={() => onSelect(nb)}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                      selectedNotebook?.id === nb.id
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="font-medium truncate">{nb.name}</div>
                    <div className="text-[10px] opacity-60 mt-0.5 truncate">
                      {nb.source_count} sources · {nb.note_count} notes
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)]">
        OpenNotebook API · localhost:5055
      </div>
    </aside>
  )
}
