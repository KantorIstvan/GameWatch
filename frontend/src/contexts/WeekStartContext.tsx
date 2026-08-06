import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { userApi } from '../services/api'
import { User } from '../types'
import { useAuthContext } from './AuthContext'

type WeekStart = 'MONDAY' | 'SUNDAY'

interface WeekStartContextType {
  weekStart: WeekStart
  setWeekStart: (weekStart: WeekStart) => void
  getFirstDayNumber: () => number
}

const WeekStartContext = createContext<WeekStartContextType | undefined>(undefined)

export const WeekStartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthReady, isAuthenticated } = useAuthContext()
  
  const [weekStart, setWeekStartState] = useState<WeekStart>(() => {
    const stored = localStorage.getItem('weekStart')
    return (stored === 'MONDAY' || stored === 'SUNDAY') ? stored : 'MONDAY'
  })

  useEffect(() => {
    localStorage.setItem('weekStart', weekStart)
  }, [weekStart])

  // Load user's weekStart from backend on mount - ONLY when authenticated and auth is ready
  useEffect(() => {
    const loadUserWeekStart = async () => {
      if (!isAuthReady || !isAuthenticated) {
        return
      }
      
      try {
        const response = await userApi.getCurrentUser()
        const userData = response.data as User
        if (userData.firstDayOfWeek) {
          setWeekStartState(userData.firstDayOfWeek)
        }
      } catch (error) {
        // Silently fail - will use default/stored value
      }
    }
    loadUserWeekStart()
  }, [isAuthReady, isAuthenticated])

  const setWeekStart = useCallback((ws: WeekStart) => {
    setWeekStartState(ws)
  }, [])

  // Returns 0 for Sunday, 1 for Monday (for calendar libraries). Memoized so consumers
  // like CalendarHeatmap - which key an effect off this function's identity - don't tear
  // down and repaint every time an unrelated ancestor re-renders this provider.
  const getFirstDayNumber = useCallback((): number => {
    return weekStart === 'SUNDAY' ? 0 : 1
  }, [weekStart])

  const value: WeekStartContextType = useMemo(() => ({
    weekStart,
    setWeekStart,
    getFirstDayNumber
  }), [weekStart, setWeekStart, getFirstDayNumber])

  return <WeekStartContext.Provider value={value}>{children}</WeekStartContext.Provider>
}

export const useWeekStart = (): WeekStartContextType => {
  const context = useContext(WeekStartContext)
  if (!context) {
    throw new Error('useWeekStart must be used within a WeekStartProvider')
  }
  return context
}
