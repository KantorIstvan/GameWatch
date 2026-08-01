import { useState, useEffect } from 'react'
import { playthroughsApi } from '../services/api'
import { Playthrough } from '../types'
import { TimelineEvent } from '../types/timeline'

export const useTimelineEvents = () => {
  const [playthroughs, setPlaythroughs] = useState<Playthrough[]>([])
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getEventColor = (playthrough: Playthrough) => {
    if (playthrough.isDropped) {
      return 'var(--color-danger)'
    } else if (playthrough.isCompleted) {
      return 'var(--color-success)'
    } else if (playthrough.isActive) {
      return 'var(--color-accent)'
    } else {
      return 'var(--color-warning)'
    }
  }

  // Soft, tinted pill styling (accent color for text/border, a light tint for the
  // fill) instead of a solid color block with white text.
  const eventStyle = (accent: string) => ({
    backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
    borderColor: accent,
    textColor: accent,
  })

  const fetchPlaythroughs = async () => {
    try {
      setLoading(true)
      const response = await playthroughsApi.getAll()
      const data = response.data
      setPlaythroughs(data)

      const timelineEvents: TimelineEvent[] = []

      data
        .filter((playthrough: Playthrough) => playthrough.startDate)
        .forEach((playthrough: Playthrough) => {
          if (playthrough.droppedAt && playthrough.pickedUpAt) {
            const dropDate = new Date(playthrough.droppedAt).toISOString().split('T')[0]
            timelineEvents.push({
              id: `${playthrough.id}-dropped`,
              title: playthrough.gameName || '',
              start: playthrough.startDate!,
              end: new Date(new Date(dropDate).getTime() + 86400000).toISOString().split('T')[0],
              ...eventStyle('var(--color-danger)'),
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

            timelineEvents.push({
              id: playthrough.id.toString(),
              title: playthrough.gameName || '',
              start: pickupDate,
              end: endDate,
              ...eventStyle(getEventColor(playthrough)),
              extendedProps: {
                gameId: playthrough.gameId || 0,
                playthroughType: playthrough.playthroughType || 'story',
                isCompleted: playthrough.isCompleted || false,
                isDropped: false,
                durationSeconds: playthrough.durationSeconds || 0,
              },
            })
          } else if (playthrough.isDropped && playthrough.droppedAt) {
            // For dropped games that were never picked up, only show event on the drop date
            const dropDate = new Date(playthrough.droppedAt).toISOString().split('T')[0]
            timelineEvents.push({
              id: playthrough.id.toString(),
              title: playthrough.gameName || '',
              start: dropDate,
              end: new Date(new Date(dropDate).getTime() + 86400000).toISOString().split('T')[0],
              ...eventStyle('var(--color-danger)'),
              extendedProps: {
                gameId: playthrough.gameId || 0,
                playthroughType: playthrough.playthroughType || 'story',
                isCompleted: false,
                isDropped: true,
                durationSeconds: playthrough.durationSeconds || 0,
              },
            })
          } else {
            const endDate = playthrough.endDate
              ? new Date(new Date(playthrough.endDate).getTime() + 86400000).toISOString().split('T')[0]
              : undefined

            timelineEvents.push({
              id: playthrough.id.toString(),
              title: playthrough.gameName || '',
              start: playthrough.startDate!,
              end: endDate,
              ...eventStyle(getEventColor(playthrough)),
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

      setEvents(timelineEvents)
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
