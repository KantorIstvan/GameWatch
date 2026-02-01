import { useState, useEffect } from 'react'
import { playthroughsApi } from '../services/api'
import { Playthrough } from '../types'

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

export const usePlaythroughEvents = (mode: string) => {
  const [playthroughs, setPlaythroughs] = useState<Playthrough[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getEventColor = (playthrough: Playthrough) => {
    if (playthrough.isDropped) {
      return mode === 'light' ? '#f44336' : '#ef5350'
    } else if (playthrough.isCompleted) {
      return mode === 'light' ? '#10b981' : '#34d399'
    } else if (playthrough.isActive) {
      return mode === 'light' ? '#667eea' : '#8b9af7'
    } else {
      return mode === 'light' ? '#f59e0b' : '#fbbf24'
    }
  }

  const fetchPlaythroughs = async () => {
    try {
      setLoading(true)
      const response = await playthroughsApi.getAll()
      const data = response.data
      setPlaythroughs(data)
      
      const calendarEvents: CalendarEvent[] = []
      
      data
        .filter((playthrough: Playthrough) => playthrough.startDate)
        .forEach((playthrough: Playthrough) => {
          if (playthrough.droppedAt && playthrough.pickedUpAt) {
            const dropDate = new Date(playthrough.droppedAt).toISOString().split('T')[0]
            calendarEvents.push({
              id: `${playthrough.id}-dropped`,
              title: playthrough.gameName || '',
              start: playthrough.startDate!,
              end: new Date(new Date(dropDate).getTime() + 86400000).toISOString().split('T')[0],
              backgroundColor: mode === 'light' ? '#f44336' : '#ef5350',
              borderColor: mode === 'light' ? '#f44336' : '#ef5350',
              textColor: '#ffffff',
              extendedProps: {
                gameId: playthrough.gameId || 0,
                playthroughType: playthrough.playthroughType || 'story',
                isCompleted: false,
                isDropped: true,
                durationSeconds: playthrough.durationSeconds || 0,
                originalId: playthrough.id,
              },
            })
            
            const pickupDate = new Date(playthrough.pickedUpAt).toISOString().split('T')[0]
            const endDate = playthrough.endDate 
              ? new Date(new Date(playthrough.endDate).getTime() + 86400000).toISOString().split('T')[0]
              : undefined
            
            calendarEvents.push({
              id: playthrough.id.toString(),
              title: playthrough.gameName || '',
              start: pickupDate,
              end: endDate,
              backgroundColor: getEventColor(playthrough),
              borderColor: getEventColor(playthrough),
              textColor: '#ffffff',
              extendedProps: {
                gameId: playthrough.gameId || 0,
                playthroughType: playthrough.playthroughType || 'story',
                isCompleted: playthrough.isCompleted || false,
                isDropped: false,
                durationSeconds: playthrough.durationSeconds || 0,
              },
            })
          } else {
            const endDate = playthrough.endDate 
              ? new Date(new Date(playthrough.endDate).getTime() + 86400000).toISOString().split('T')[0]
              : undefined
            
            calendarEvents.push({
              id: playthrough.id.toString(),
              title: playthrough.gameName || '',
              start: playthrough.startDate!,
              end: endDate,
              backgroundColor: getEventColor(playthrough),
              borderColor: getEventColor(playthrough),
              textColor: '#ffffff',
              extendedProps: {
                gameId: playthrough.gameId || 0,
                playthroughType: playthrough.playthroughType || 'story',
                isCompleted: playthrough.isCompleted || false,
                isDropped: playthrough.isDropped || false,
                durationSeconds: playthrough.durationSeconds || 0,
              },
            })
          }
        })
      
      setEvents(calendarEvents)
      setError(null)
    } catch (err: any) {
      setError('calendar.errorLoading')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlaythroughs()
  }, [])

  return { playthroughs, events, loading, error, refetch: fetchPlaythroughs }
}
