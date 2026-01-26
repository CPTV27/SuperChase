import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'

function App() {
  const [notebooks, setNotebooks] = useState([])
  const [selectedNotebook, setSelectedNotebook] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotebooks()
  }, [])

  async function fetchNotebooks() {
    try {
      const res = await fetch('/api/notebooks')
      const data = await res.json()
      // Filter out archived and workflow notebooks
      const filtered = data.filter(nb =>
        !nb.archived && !nb.name.startsWith('Workflow:')
      )
      setNotebooks(filtered)
    } catch (err) {
      console.error('Failed to fetch notebooks:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full min-h-screen bg-[var(--bg-primary)]">
      <Sidebar
        notebooks={notebooks}
        selectedNotebook={selectedNotebook}
        onSelect={setSelectedNotebook}
        loading={loading}
      />
      <MainPanel notebook={selectedNotebook} />
    </div>
  )
}

export default App
