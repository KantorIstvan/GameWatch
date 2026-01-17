import { useEffect, useRef } from 'react'
import healthApi, { HealthDashboard } from '../services/healthApi'
import { healthNotificationService } from '../services/healthNotificationService'

/**
 * Hook to check daily gaming goals and show notifications when limits are reached/exceeded
 */
export function useHealthGoals(isAuthenticated: boolean, isAuthReady: boolean) {
  const lastCheckRef = useRef<{ hours: number; sessions: number }>({ hours: 0, sessions: 0 })
  const hasShownGoalReachedRef = useRef<{ hours: boolean; sessions: boolean }>({
    hours: false,
    sessions: false,
  })
  const hasShownGoalExceededRef = useRef<{ hours: boolean; sessions: boolean }>({
    hours: false,
    sessions: false,
  })

  useEffect(() => {
    // Don't check goals if not authenticated or auth not ready
    if (!isAuthenticated || !isAuthReady) {
      return
    }

    const checkGoals = async () => {
      try {
        const [dashboardRes, settingsRes] = await Promise.all([
          healthApi.getHealthDashboard(),
          healthApi.getHealthSettings(),
        ])

        const dashboard: HealthDashboard = dashboardRes.data
        const settings = settingsRes.data

        if (!settings.goalNotificationsEnabled) {
          return
        }

        const todayMetrics = dashboard.todayMetrics

        // Check hours goal
        if (settings.maxHoursPerDay !== null && settings.maxHoursPerDay > 0) {
          const currentHours = todayMetrics?.totalHours || 0
          const maxHours = settings.maxHoursPerDay

          // Only show notifications if the value changed
          if (currentHours !== lastCheckRef.current.hours) {
            if (currentHours > maxHours && !hasShownGoalExceededRef.current.hours) {
              healthNotificationService.showGoalExceeded('hours', currentHours, maxHours)
              hasShownGoalExceededRef.current.hours = true
              hasShownGoalReachedRef.current.hours = true
            } else if (
              currentHours >= maxHours &&
              !hasShownGoalReachedRef.current.hours &&
              !hasShownGoalExceededRef.current.hours
            ) {
              healthNotificationService.showGoalReached('hours', currentHours, maxHours)
              hasShownGoalReachedRef.current.hours = true
            }

            lastCheckRef.current.hours = currentHours
          }
        }

        // Check sessions goal
        if (settings.maxSessionsPerDay !== null && settings.maxSessionsPerDay > 0) {
          const currentSessions = todayMetrics?.sessionCount || 0
          const maxSessions = settings.maxSessionsPerDay

          // Only show notifications if the value changed
          if (currentSessions !== lastCheckRef.current.sessions) {
            if (currentSessions > maxSessions && !hasShownGoalExceededRef.current.sessions) {
              healthNotificationService.showGoalExceeded('sessions', currentSessions, maxSessions)
              hasShownGoalExceededRef.current.sessions = true
              hasShownGoalReachedRef.current.sessions = true
            } else if (
              currentSessions >= maxSessions &&
              !hasShownGoalReachedRef.current.sessions &&
              !hasShownGoalExceededRef.current.sessions
            ) {
              healthNotificationService.showGoalReached('sessions', currentSessions, maxSessions)
              hasShownGoalReachedRef.current.sessions = true
            }

            lastCheckRef.current.sessions = currentSessions
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }

    // Check goals immediately
    checkGoals()

    // Check goals every 30 seconds
    const interval = setInterval(checkGoals, 30000)

    // Reset goal notifications at midnight
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
    const msUntilMidnight = tomorrow.getTime() - now.getTime()

    const midnightTimeout = setTimeout(() => {
      hasShownGoalReachedRef.current = { hours: false, sessions: false }
      hasShownGoalExceededRef.current = { hours: false, sessions: false }
      lastCheckRef.current = { hours: 0, sessions: 0 }

      // Set up daily reset at midnight
      const dailyResetInterval = setInterval(() => {
        hasShownGoalReachedRef.current = { hours: false, sessions: false }
        hasShownGoalExceededRef.current = { hours: false, sessions: false }
        lastCheckRef.current = { hours: 0, sessions: 0 }
      }, 24 * 60 * 60 * 1000) // Every 24 hours

      return () => clearInterval(dailyResetInterval)
    }, msUntilMidnight)

    return () => {
      clearInterval(interval)
      clearTimeout(midnightTimeout)
    }
  }, [isAuthenticated, isAuthReady])
}
