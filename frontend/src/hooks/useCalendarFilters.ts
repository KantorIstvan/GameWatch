import { useState, useMemo } from 'react'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    gameId: number
    playthroughType: string
    isCompleted: boolean
    isDropped: boolean
    durationSeconds: number
    originalId?: number
  }
}

export const useCalendarFilters = (events: CalendarEvent[]) => {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const filteredEvents = useMemo(() => {
    let filtered = events
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => {
        switch (statusFilter) {
          case 'completed':
            return event.extendedProps.isCompleted
          case 'dropped':
            return event.extendedProps.isDropped
          case 'started':
            return !event.extendedProps.isCompleted && !event.extendedProps.isDropped
          default:
            return true
        }
      })
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return filtered
  }, [events, statusFilter, searchQuery])

  const groupedEventsByMonth = useMemo(() => {
    const grouped: { [key: string]: CalendarEvent[] } = {}
    
    filteredEvents.forEach(event => {
      const date = new Date(event.start)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = []
      }
      grouped[monthKey].push(event)
    })
    
    // Sort events within each month
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    })
    
    return grouped
  }, [filteredEvents])

  return {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    filteredEvents,
    groupedEventsByMonth,
  }
}
