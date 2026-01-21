import { useState, useCallback, useEffect } from 'react'

const API_KEY = 'sc_676782661b25ced4ffaa25c0a5b4bfa7b07985f6b49fe0ee'

const initialState = {
  phase: 'RESEARCH',
  businessName: '',
  businessId: '',
  researchSteps: [],
  researchedData: [],
  gaps: [],
  userAnswers: {},
  filesCreated: [],
  progress: 0,
  error: null,
}

export function useOnboarding(businessName) {
  const [state, setState] = useState({
    ...initialState,
    businessName,
    businessId: businessName?.toLowerCase().replace(/[^a-z0-9]/g, '') || '',
  })

  // Start research on mount
  useEffect(() => {
    if (businessName) {
      startResearch()
    }
  }, [businessName])

  const startResearch = async () => {
    const steps = [
      { id: 'web', label: 'Searching web for business info...', status: 'loading', source: null },
      { id: 'internal', label: 'Checking internal SuperChase data...', status: 'pending', source: null },
      { id: 'limitless', label: 'Loading business intelligence...', status: 'pending', source: null },
      { id: 'portfolio', label: 'Checking portfolio registry...', status: 'pending', source: null },
    ]

    setState(prev => ({ ...prev, researchSteps: steps, phase: 'RESEARCH' }))

    try {
      // Call the research API
      const response = await fetch(`/api/onboard/research?name=${encodeURIComponent(businessName)}`, {
        headers: { 'X-API-Key': API_KEY }
      })

      if (!response.ok) {
        throw new Error('Research API failed')
      }

      // Simulate step completion for UX while API processes
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800))
        setState(prev => ({
          ...prev,
          researchSteps: prev.researchSteps.map((s, idx) => ({
            ...s,
            status: idx <= i ? 'complete' : idx === i + 1 ? 'loading' : s.status,
          })),
        }))
      }

      const data = await response.json()

      setState(prev => ({
        ...prev,
        phase: 'CONFIRM',
        businessId: data.businessId || prev.businessId,
        researchedData: data.researched || [],
        gaps: data.gaps || [],
        researchSteps: prev.researchSteps.map(s => ({ ...s, status: 'complete' })),
      }))
    } catch (error) {
      console.error('Research error:', error)
      setState(prev => ({
        ...prev,
        error: error.message,
        researchSteps: prev.researchSteps.map(s =>
          s.status === 'loading' ? { ...s, status: 'error' } : s
        ),
      }))
    }
  }

  const updateField = useCallback((field, value) => {
    setState(prev => ({
      ...prev,
      researchedData: prev.researchedData.map(item =>
        item.field === field ? { ...item, value, confidence: 'high', edited: true } : item
      ),
    }))
  }, [])

  const confirmData = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: prev.gaps.length > 0 ? 'GAP_FILL' : 'COMPLETE',
    }))

    // If no gaps, trigger completion
    if (state.gaps.length === 0) {
      completeOnboarding({})
    }
  }, [state.gaps])

  const completeOnboarding = async (answers) => {
    try {
      const response = await fetch('/api/onboard/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          businessId: state.businessId,
          businessName: state.businessName,
          researchedData: state.researchedData,
          answers,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete onboarding')
      }

      const result = await response.json()

      setState(prev => ({
        ...prev,
        phase: 'COMPLETE',
        filesCreated: result.filesCreated || [],
        userAnswers: answers,
      }))
    } catch (error) {
      console.error('Completion error:', error)
      setState(prev => ({
        ...prev,
        error: error.message,
      }))
    }
  }

  const submitGaps = useCallback(async (answers) => {
    setState(prev => ({ ...prev, userAnswers: answers }))
    await completeOnboarding(answers)
  }, [state.businessId, state.businessName, state.researchedData])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    state,
    actions: {
      updateField,
      confirmData,
      submitGaps,
      reset,
      startResearch,
    },
  }
}

export default useOnboarding
