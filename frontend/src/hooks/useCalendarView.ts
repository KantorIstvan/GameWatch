import { useState, useEffect } from 'react'
import { useMediaQuery } from '@mui/material'

export const useCalendarView = () => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list')
  const isMobile = useMediaQuery('(max-width:768px)')
  const isPortrait = useMediaQuery('(orientation: portrait)')

  // Auto-switch view mode based on screen size
  useEffect(() => {
    if (isMobile && isPortrait) {
      setViewMode('list')
    } else if (!isMobile) {
      setViewMode('calendar')
    }
  }, [isMobile, isPortrait])

  return {
    viewMode,
    setViewMode,
    isMobile,
    isPortrait,
  }
}
