import { useState, useEffect } from 'react'
import { useMediaQuery } from './useMediaQuery'

export const useTimelineView = () => {
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('list')
  const isMobile = useMediaQuery('(max-width:768px)')
  const isPortrait = useMediaQuery('(orientation: portrait)')

  // Auto-switch view mode based on screen size
  useEffect(() => {
    if (isMobile && isPortrait) {
      setViewMode('list')
    } else if (!isMobile) {
      setViewMode('timeline')
    }
  }, [isMobile, isPortrait])

  return {
    viewMode,
    setViewMode,
    isMobile,
    isPortrait,
  }
}
