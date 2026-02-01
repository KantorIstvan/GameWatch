import { createContext, useContext, ReactNode, useCallback } from 'react'

interface SessionTimerContextType {
  getSessionTime: (playthroughId: number, baseTime: number, startedAt: string | null, isActive: boolean) => number
  clearSessionTime: (playthroughId: number) => void
}

const SessionTimerContext = createContext<SessionTimerContextType | undefined>(undefined)

export const useSessionTimer = (): SessionTimerContextType => {
  const context = useContext(SessionTimerContext)
  if (!context) {
    throw new Error('useSessionTimer must be used within SessionTimerProvider')
  }
  return context
}

export const SessionTimerProvider = ({ children }: { children: ReactNode }) => {
  /**
   * Calculate the current session time based on backend data
   * This ensures the timer is always accurate, even after page refresh or navigation
   * 
   * @param _playthroughId - The ID of the playthrough (unused now, but kept for future enhancements)
   * @param baseTime - Current session time from backend (durationSeconds - sessionStartDurationSeconds)
   * @param startedAt - When the active session started (null if paused)
   * @param isActive - Whether the session is currently active
   * @returns The current session time in seconds
   */
  const getSessionTime = useCallback((
    _playthroughId: number,
    baseTime: number,
    startedAt: string | null,
    isActive: boolean
  ): number => {
    // If paused, return the exact time from backend
    if (!isActive || !startedAt) {
      return baseTime
    }
    
    // If active, add elapsed time since startedAt to the base time
    const now = Date.now()
    const sessionStartTime = new Date(startedAt).getTime()
    const elapsedSeconds = Math.floor((now - sessionStartTime) / 1000)
    
    return baseTime + elapsedSeconds
  }, [])

  const clearSessionTime = useCallback((_playthroughId: number) => {
    // No-op now since we don't store state, but kept for API compatibility
  }, [])

  return (
    <SessionTimerContext.Provider
      value={{
        getSessionTime,
        clearSessionTime,
      }}
    >
      {children}
    </SessionTimerContext.Provider>
  )
}
