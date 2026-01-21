import { useState, useCallback, useEffect } from 'react'

const API_KEY = 'sc_676782661b25ced4ffaa25c0a5b4bfa7b07985f6b49fe0ee'
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://superchase-production.up.railway.app'
  : '')

const PHASES = ['INIT', 'UPLOAD', 'EXTRACT', 'QUESTIONS', 'REVIEW', 'COMMIT']

const initialState = {
  phase: 'UPLOAD',
  businessId: '',
  businessName: '',
  uploads: [],
  uploading: false,
  extracting: false,
  extractedFields: [],
  gaps: [],
  questions: {},
  answers: {},
  summary: '',
  committing: false,
  committed: false,
  filesModified: [],
  error: null,
  progress: 0,
}

export function useDiscovery(businessId) {
  const [state, setState] = useState({
    ...initialState,
    businessId,
    businessName: businessId,
  })

  // Load current status on mount
  useEffect(() => {
    if (businessId) {
      loadStatus()
    }
  }, [businessId])

  const loadStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/discover/${businessId}/status`, {
        headers: { 'X-API-Key': API_KEY }
      })

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          phase: mapPhase(data.phase),
          uploads: data.uploads || [],
          progress: data.currentPhaseIndex / (PHASES.length - 1) * 100,
        }))

        // If we have uploads but haven't extracted, load questions
        if (data.phase === 'EXTRACTED' || data.phase === 'ANSWERED') {
          await loadQuestions()
        }
      }
    } catch (error) {
      console.error('Failed to load discovery status:', error)
    }
  }

  const mapPhase = (backendPhase) => {
    const phaseMap = {
      'INIT': 'UPLOAD',
      'UPLOADED': 'EXTRACT',
      'EXTRACTED': 'QUESTIONS',
      'ANSWERED': 'REVIEW',
      'COMMITTED': 'COMMIT',
    }
    return phaseMap[backendPhase] || 'UPLOAD'
  }

  const uploadFiles = useCallback(async (files) => {
    setState(prev => ({ ...prev, uploading: true, error: null }))

    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append('files', file)
      }

      const response = await fetch(`${API_BASE}/api/discover/${businessId}/upload`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY },
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setState(prev => ({
          ...prev,
          uploading: false,
          uploads: [...prev.uploads, ...data.uploaded],
          phase: 'EXTRACT',
          progress: 25,
        }))
        return { success: true, uploaded: data.uploaded }
      } else {
        setState(prev => ({
          ...prev,
          uploading: false,
          error: data.error || 'Upload failed',
        }))
        return { success: false, error: data.error }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        uploading: false,
        error: error.message,
      }))
      return { success: false, error: error.message }
    }
  }, [businessId])

  const startExtraction = useCallback(async () => {
    setState(prev => ({ ...prev, extracting: true, error: null }))

    try {
      const response = await fetch(`${API_BASE}/api/discover/${businessId}/extract`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY },
      })

      const data = await response.json()

      if (data.success) {
        setState(prev => ({
          ...prev,
          extracting: false,
          extractedFields: data.fields || [],
          gaps: data.gaps || [],
          summary: data.summary || '',
          phase: 'QUESTIONS',
          progress: 50,
        }))

        // Load questions after extraction
        await loadQuestions()

        return { success: true }
      } else {
        setState(prev => ({
          ...prev,
          extracting: false,
          error: data.error || 'Extraction failed',
        }))
        return { success: false, error: data.error }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        extracting: false,
        error: error.message,
      }))
      return { success: false, error: error.message }
    }
  }, [businessId])

  const loadQuestions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/discover/${businessId}/questions`, {
        headers: { 'X-API-Key': API_KEY }
      })

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          questions: data.questions || {},
          extractedFields: Object.values(data.questions || {}).flatMap(cat =>
            cat.questions.filter(q => q.status === 'extracted').map(q => ({
              key: q.id,
              value: q.extractedValue,
              confidence: q.confidence,
              source: q.source,
            }))
          ),
        }))
      }
    } catch (error) {
      console.error('Failed to load questions:', error)
    }
  }

  const updateAnswer = useCallback((fieldId, value) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [fieldId]: value,
      },
    }))
  }, [])

  const saveAnswers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/discover/${businessId}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ answers: state.answers }),
      })

      const data = await response.json()

      if (data.success) {
        setState(prev => ({
          ...prev,
          phase: 'REVIEW',
          progress: 75,
        }))
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }, [businessId, state.answers])

  const commitDiscovery = useCallback(async () => {
    setState(prev => ({ ...prev, committing: true, error: null }))

    try {
      const response = await fetch(`${API_BASE}/api/discover/${businessId}/commit`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY },
      })

      const data = await response.json()

      if (data.success) {
        setState(prev => ({
          ...prev,
          committing: false,
          committed: true,
          filesModified: data.filesModified || [],
          phase: 'COMMIT',
          progress: 100,
        }))
        return { success: true, filesModified: data.filesModified }
      } else {
        setState(prev => ({
          ...prev,
          committing: false,
          error: data.error || 'Commit failed',
        }))
        return { success: false, error: data.error }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        committing: false,
        error: error.message,
      }))
      return { success: false, error: error.message }
    }
  }, [businessId])

  const goToPhase = useCallback((phase) => {
    const phaseIndex = PHASES.indexOf(phase)
    if (phaseIndex >= 0) {
      setState(prev => ({
        ...prev,
        phase,
        progress: (phaseIndex / (PHASES.length - 1)) * 100,
      }))
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      ...initialState,
      businessId,
      businessName: businessId,
    })
  }, [businessId])

  return {
    state,
    actions: {
      uploadFiles,
      startExtraction,
      updateAnswer,
      saveAnswers,
      commitDiscovery,
      goToPhase,
      reset,
      loadStatus,
    },
    phases: PHASES,
  }
}

export default useDiscovery
