import { useMediaQuery } from './useMediaQuery'

export const useTimelineView = () => {
  const isMobile = useMediaQuery('(max-width: 767px)')

  // Mobile never gets the desktop Gantt/timeline view — it's a 2D grid that
  // doesn't fit a phone screen, so there's no toggle to escape into it.
  const viewMode: 'timeline' | 'list' = isMobile ? 'list' : 'timeline'

  return {
    viewMode,
    isMobile,
  }
}
