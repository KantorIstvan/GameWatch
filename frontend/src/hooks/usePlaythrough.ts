import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { playthroughsApi, gamesApi } from '../services/api'
import healthApi from '../services/healthApi'
import { Playthrough, Game } from '../types'
import { healthNotificationService } from '../services/healthNotificationService'

export function usePlaythrough(id: number, isAuthReady: boolean) {
  const navigate = useNavigate()
  const [playthrough, setPlaythrough] = useState<Playthrough | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [timerGradient, setTimerGradient] = useState('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')

  const fetchPlaythrough = useCallback(async () => {
    try {
      setLoading(true)
      const ptResponse = await playthroughsApi.getById(id)
      const gameResponse = await gamesApi.getById(ptResponse.data.gameId)
      
      setPlaythrough(ptResponse.data)
      setGame(gameResponse.data)
      
      if (ptResponse.data.isActive && ptResponse.data.startedAt) {
        const now = Date.now()
        const startTime = new Date(ptResponse.data.startedAt).getTime()
        const currentSessionSeconds = Math.floor((now - startTime) / 1000)
        const baseDuration = ptResponse.data.durationSeconds || 0
        setElapsedTime(baseDuration + currentSessionSeconds)
      } else {
        setElapsedTime(ptResponse.data.durationSeconds || 0)
      }
      
      setIsRunning(ptResponse.data.isActive === true)
      setError(null)
    } catch (err: any) {
      console.error('Failed to fetch playthrough:', err)
      setError('Failed to load playthrough. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    window.scrollTo(0, 0)
    if (isAuthReady) {
      fetchPlaythrough()
      // Load health settings for notifications
      healthApi.getHealthSettings().then((response) => {
        healthNotificationService.setSettings(response.data)
      }).catch(() => {
        // Ignore errors, notifications will be disabled
      })
    }
  }, [isAuthReady, id, fetchPlaythrough])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    let lateNightCheckInterval: NodeJS.Timeout | null = null
    
    if (isRunning && playthrough?.isActive === true) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
      
      // Check for late night gaming every 5 minutes
      lateNightCheckInterval = setInterval(() => {
        const now = new Date()
        const hour = now.getHours()
        // Late night is 22:00 (10 PM) to 06:00 (6 AM)
        if (hour >= 22 || hour < 6) {
          healthNotificationService.showLateNightWarning()
        }
      }, 5 * 60 * 1000) // Check every 5 minutes
      
      // Also check immediately when session starts
      const now = new Date()
      const hour = now.getHours()
      if (hour >= 22 || hour < 6) {
        setTimeout(() => {
          healthNotificationService.showLateNightWarning()
        }, 2000) // Delay 2 seconds after session start
      }
    } else {
      if (interval) clearInterval(interval)
      if (lateNightCheckInterval) clearInterval(lateNightCheckInterval)
    }
    
    return () => {
      if (interval) clearInterval(interval)
      if (lateNightCheckInterval) clearInterval(lateNightCheckInterval)
    }
  }, [isRunning, playthrough])

  useEffect(() => {
    if (game?.dominantColor1 && game?.dominantColor2) {
      const gradient = `linear-gradient(135deg, ${game.dominantColor1} 0%, ${game.dominantColor2} 100%)`
      setTimerGradient(gradient)
    }
  }, [game])

  const handleStart = useCallback(async () => {
    try {
      const response = await playthroughsApi.start(id)
      setPlaythrough(response.data)
      setIsRunning(true)
      // Start health notifications
      healthNotificationService.startSession()
    } catch (err: any) {
      console.error('Failed to start playthrough:', err)
      setError('Failed to start timer.')
    }
  }, [id])

  const handlePause = useCallback(async () => {
    if (!playthrough?.isActive) return
    
    try {
      setIsRunning(false)
      const response = await playthroughsApi.pause(id)
      setPlaythrough(response.data)
      // Stop notifications while paused
      healthNotificationService.stopAllReminders()
    } catch (err: any) {
      console.error('Failed to pause:', err)
      setError('Failed to pause.')
      setIsRunning(playthrough.isActive)
    }
  }, [id, playthrough])

  const handleEndSession = useCallback(async () => {
    if (!playthrough?.isActive && !playthrough?.isPaused) return
    
    try {
      setIsRunning(false)
      setPlaythrough({ ...playthrough, isActive: false, isPaused: false })
      const response = await playthroughsApi.endSession(id)
      setPlaythrough(response.data)
      // Stop all health reminders when session ends
      healthNotificationService.stopAllReminders()
      // Return the lastSessionHistoryId for mood prompt
      return response.data.lastSessionHistoryId
    } catch (err: any) {
      console.error('Failed to end session:', err)
      setError('Failed to end session.')
      if (playthrough) {
        setIsRunning(playthrough.isActive)
        setPlaythrough(playthrough)
      }
      throw err
    }
  }, [id, playthrough])

  const handleFinish = useCallback(async () => {
    try {
      const response = await playthroughsApi.stop(id)
      setPlaythrough(response.data)
      setIsRunning(false)
    } catch (err) {
      console.error('Failed to finish playthrough:', err)
      setError('Failed to finish playthrough.')
    }
  }, [id])

  const handleDrop = useCallback(async () => {
    try {
      const response = await playthroughsApi.drop(id)
      setPlaythrough(response.data)
      setIsRunning(false)
    } catch (err) {
      console.error('Failed to drop playthrough:', err)
      setError('Failed to drop playthrough.')
    }
  }, [id])

  const handlePickup = useCallback(async () => {
    try {
      const response = await playthroughsApi.pickup(id)
      setPlaythrough(response.data)
      setIsRunning(false)
    } catch (err) {
      console.error('Failed to pickup playthrough:', err)
      setError('Failed to pickup playthrough.')
    }
  }, [id])

  const handleDelete = useCallback(async () => {
    try {
      await playthroughsApi.delete(id)
      navigate('/')
    } catch (err: any) {
      console.error('Failed to delete playthrough:', err)
      setError('Failed to delete playthrough.')
    }
  }, [id, navigate])

  const updateDuration = useCallback(async (totalSeconds: number) => {
    const response = await playthroughsApi.updateDuration(id, totalSeconds)
    setElapsedTime(totalSeconds)
    setPlaythrough(response.data)
  }, [id])

  const updatePlatform = useCallback(async (platform: string) => {
    const response = await playthroughsApi.updatePlatform(id, platform)
    setPlaythrough(response.data)
  }, [id])

  const updateTitle = useCallback(async (title: string) => {
    const response = await playthroughsApi.updateTitle(id, title)
    setPlaythrough(response.data)
  }, [id])

  const logManualSession = useCallback(async (startedAt: string, endedAt: string) => {
    const response = await playthroughsApi.logManualSession(id, startedAt, endedAt)
    setPlaythrough(response.data)
    setElapsedTime(response.data.durationSeconds || 0)
  }, [id])

  const importSessions = useCallback(async (sourcePlaythroughId: number) => {
    const response = await playthroughsApi.importSessions(id, sourcePlaythroughId)
    setPlaythrough(response.data)
    setElapsedTime(response.data.durationSeconds || 0)
  }, [id])

  return {
    playthrough,
    game,
    loading,
    error,
    elapsedTime,
    isRunning,
    timerGradient,
    handlers: {
      handleStart,
      handlePause,
      handleEndSession,
      handleFinish,
      handleDrop,
      handlePickup,
      handleDelete,
      updateDuration,
      updatePlatform,
      updateTitle,
      logManualSession,
      importSessions,
    }
  }
}
