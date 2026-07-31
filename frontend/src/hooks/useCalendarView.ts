import { useState, useEffect } from 'react'

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const listener = () => setMatches(mql.matches)
    listener()
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [query])

  return matches
}

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
