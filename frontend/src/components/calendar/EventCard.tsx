import { CircleCheck, CircleX, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'

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

interface EventCardProps {
  event: CalendarEvent
  mode: string
  onEventClick: (eventId: string) => void
}

export const EventCard = ({ event, mode, onEventClick }: EventCardProps) => {
  const { t } = useTranslation()
  const accent = mode === 'light' ? '#667eea' : '#8b9af7'

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(t('app.locale', 'en'), {
      month: 'short',
      day: 'numeric',
    })
  }

  const getEventIcon = () => {
    if (event.extendedProps.isCompleted) {
      return <CircleCheck className="size-5" style={{ color: '#10b981' }} />
    } else if (event.extendedProps.isDropped) {
      return <CircleX className="size-5" style={{ color: '#f44336' }} />
    } else {
      return <Play className="size-5" style={{ color: '#f59e0b' }} />
    }
  }

  const getEventTypeLabel = () => {
    if (event.extendedProps.isCompleted) return t('calendar.completed', 'Completed')
    if (event.extendedProps.isDropped) return t('calendar.dropped', 'Dropped')
    return t('calendar.started', 'Started')
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h`
  }

  return (
    <div
      onClick={() => onEventClick(event.extendedProps.originalId?.toString() || event.id)}
      className="group mb-2 cursor-pointer rounded-md border p-4 transition-all duration-200 hover:translate-x-1"
      style={{
        backgroundColor: mode === 'light' ? '#ffffff' : '#1a1d23',
        borderColor: `${accent}1a`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${accent}1a`)}
    >
      <div className="flex items-center gap-4">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: event.backgroundColor }}
        >
          {getEventIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="mb-0.5 truncate text-body-sm font-semibold sm:text-body"
            style={{ color: mode === 'light' ? '#212529' : '#ffffff' }}
          >
            {event.title}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption" style={{ color: mode === 'light' ? '#6c757d' : '#868e96' }}>
              {formatEventDate(event.start)}
              {event.end && ` - ${formatEventDate(event.end)}`}
            </span>

            <Badge
              className="h-5 text-[0.7rem] font-semibold text-white"
              style={{ backgroundColor: event.backgroundColor }}
            >
              {getEventTypeLabel()}
            </Badge>

            {event.extendedProps.durationSeconds > 0 && (
              <span
                className="text-[0.75rem] font-medium"
                style={{ color: mode === 'light' ? '#6c757d' : '#868e96' }}
              >
                {formatDuration(event.extendedProps.durationSeconds)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
