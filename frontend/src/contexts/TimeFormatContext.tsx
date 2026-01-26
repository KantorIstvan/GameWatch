import React, { createContext, useContext, useState, useEffect } from 'react'
import { userApi } from '../services/api'
import { User } from '../types'
import { useAuthContext } from './AuthContext'

type TimeFormat = '12h' | '24h'

interface TimeFormatContextType {
  timeFormat: TimeFormat
  setTimeFormat: (format: TimeFormat) => void
  timezone: string
  setTimezone: (timezone: string) => void
  formatTime: (date: Date | string) => string
  formatDateTime: (date: Date | string) => string
  formatDateOnly: (date: Date | string) => string
}

const TimeFormatContext = createContext<TimeFormatContextType | undefined>(undefined)

export const TimeFormatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthReady, isAuthenticated } = useAuthContext()
  
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(() => {
    const stored = localStorage.getItem('timeFormat')
    return (stored === '12h' || stored === '24h') ? stored : '24h'
  })

  const [timezone, setTimezoneState] = useState<string>(() => {
    const stored = localStorage.getItem('timezone')
    return stored || Intl.DateTimeFormat().resolvedOptions().timeZone
  })

  useEffect(() => {
    localStorage.setItem('timeFormat', timeFormat)
  }, [timeFormat])

  useEffect(() => {
    localStorage.setItem('timezone', timezone)
  }, [timezone])

  // Load user's timezone from backend on mount - ONLY when authenticated and auth is ready
  useEffect(() => {
    const loadUserTimezone = async () => {
      if (!isAuthReady || !isAuthenticated) {
        return
      }
      
      try {
        const response = await userApi.getCurrentUser()
        const userData = response.data as User
        if (userData.timezone) {
          setTimezoneState(userData.timezone)
        }
      } catch (error) {
        // Silently fail - will use browser's timezone
      }
    }
    loadUserTimezone()
  }, [isAuthReady, isAuthenticated])

  const setTimeFormat = (format: TimeFormat) => {
    setTimeFormatState(format)
  }

  const setTimezone = (tz: string) => {
    setTimezoneState(tz)
  }

  const formatTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: timeFormat === '12h',
      timeZone: timezone
    }
    return dateObj.toLocaleTimeString(undefined, options)
  }

  const formatDateTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: timeFormat === '12h',
      timeZone: timezone
    }
    return dateObj.toLocaleString(undefined, options)
  }

  const formatDateOnly = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: timezone
    }
    return dateObj.toLocaleDateString(undefined, options)
  }

  const value: TimeFormatContextType = {
    timeFormat,
    setTimeFormat,
    timezone,
    setTimezone,
    formatTime,
    formatDateTime,
    formatDateOnly
  }

  return <TimeFormatContext.Provider value={value}>{children}</TimeFormatContext.Provider>
}

export const useTimeFormat = (): TimeFormatContextType => {
  const context = useContext(TimeFormatContext)
  if (!context) {
    throw new Error('useTimeFormat must be used within a TimeFormatProvider')
  }
  return context
}
