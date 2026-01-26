import { useState, useEffect } from 'react'
import SourcesTab from './SourcesTab'
import NotesTab from './NotesTab'
import ArtifactsTab from './ArtifactsTab'
import ChatTab from './ChatTab'

const TABS = [
  { id: 'sources', label: 'Sources' },
  { id: 'notes', label: 'Notes' },
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'chat', label: 'Chat' },
]

export default function MainPanel({ notebook }) {
  const [activeTab, setActiveTab] = useState('sources')
  const [sources, setSources] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (notebook) {
      fetchData()
    } else {
      setSources([])
      setNotes([])
    }
  }, [notebook])

  async function fetchData() {
    if (!notebook) return
    setLoading(true)
    try {
      const [sourcesRes, notesRes] = await Promise.all([
        fetch(`/api/sources?notebook_id=${notebook.id}`),
        fetch(`/api/notes?notebook_id=${notebook.id}`),
      ])
      const sourcesData = await sourcesRes.json()
      const notesData = await notesRes.json()
      setSources(Array.isArray(sourcesData) ? sourcesData : [])
      setNotes(Array.isArray(notesData) ? notesData : [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!notebook) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-20">M</div>
          <p className="text-[var(--text-muted)] text-sm">
            Select a notebook to begin
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-semibold">{notebook.name}</h2>
        {notebook.description && (
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-2xl truncate">
            {notebook.description}
          </p>
        )}
      </header>

      {/* Tabs */}
      <div className="px-6 border-b border-[var(--border)]">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--accent)] text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
              {tab.id === 'sources' && sources.length > 0 && (
                <span className="ml-2 text-[10px] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
                  {sources.length}
                </span>
              )}
              {tab.id === 'notes' && notes.length > 0 && (
                <span className="ml-2 text-[10px] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
                  {notes.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-[var(--text-muted)] text-sm">Loading...</div>
        ) : (
          <>
            {activeTab === 'sources' && (
              <SourcesTab
                sources={sources}
                notebookId={notebook.id}
                onRefresh={fetchData}
              />
            )}
            {activeTab === 'notes' && (
              <NotesTab
                notes={notes}
                notebookId={notebook.id}
                onRefresh={fetchData}
              />
            )}
            {activeTab === 'artifacts' && (
              <ArtifactsTab notebookId={notebook.id} notebookName={notebook.name} notes={notes} />
            )}
            {activeTab === 'chat' && (
              <ChatTab
                notebookId={notebook.id}
                sources={sources}
                notes={notes}
              />
            )}
          </>
        )}
      </div>
    </main>
  )
}
