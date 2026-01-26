import { useState, useCallback, useEffect } from 'react'
import healthApi, { HealthSettings } from '../services/healthApi'
import { useAuthContext } from '../contexts/AuthContext'

export function useHealthSettings() {
  const { isAuthReady, isAuthenticated } = useAuthContext()
  const [settings, setSettings] = useState<HealthSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSettings = useCallback(async () => {
    try {
      const response = await healthApi.getHealthSettings()
      setSettings(response.data)
    } catch (error) {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthReady && isAuthenticated) {
      loadSettings()
    }
  }, [isAuthReady, isAuthenticated, loadSettings])

  return {
    settings,
    loading,
    reload: loadSettings,
  }
}

export function useMoodPrompt() {
  const { settings } = useHealthSettings()
  const [showMoodPrompt, setShowMoodPrompt] = useState(false)
  const [lastSessionId, setLastSessionId] = useState<number | null>(null)

  const promptForMood = useCallback((sessionHistoryId?: number) => {
    if (settings?.moodPromptEnabled) {
      setLastSessionId(sessionHistoryId || null)
      setShowMoodPrompt(true)
    }
  }, [settings])

  const closeMoodPrompt = useCallback(() => {
    setShowMoodPrompt(false)
    setLastSessionId(null)
  }, [])

  return {
    showMoodPrompt,
    lastSessionId,
    promptForMood,
    closeMoodPrompt,
    required: settings?.moodPromptRequired || false,
  }
}
