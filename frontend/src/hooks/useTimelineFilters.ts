import { useState, useMemo, useCallback } from 'react'
import { TimelineEvent } from '../types/timeline'
import { parseLocalDate } from '../utils/dateUtils'

export const useTimelineFilters = (events: TimelineEvent[]) => {
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
    const grouped: { [key: string]: TimelineEvent[] } = {}

    filteredEvents.forEach(event => {
      const date = parseLocalDate(event.start)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!grouped[monthKey]) {
        grouped[monthKey] = []
      }
      grouped[monthKey].push(event)
    })

    // Sort events within each month
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => parseLocalDate(a.start).getTime() - parseLocalDate(b.start).getTime())
    })

    return grouped
  }, [filteredEvents])

  const hasActiveFilters = statusFilter !== 'all' || searchQuery.trim() !== ''

  const clearFilters = useCallback(() => {
    setStatusFilter('all')
    setSearchQuery('')
  }, [])

  return {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    filteredEvents,
    groupedEventsByMonth,
    hasActiveFilters,
    clearFilters,
  }
}
