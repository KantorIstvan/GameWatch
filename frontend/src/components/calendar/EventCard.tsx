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
  onEventClick: (eventId: string) => void
}

export const EventCard = ({ event, onEventClick }: EventCardProps) => {
  const { t } = useTranslation()

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(t('app.locale', 'en'), {
      month: 'short',
      day: 'numeric',
    })
  }

  const getEventIcon = () => {
    if (event.extendedProps.isCompleted) {
      return <CircleCheck className="size-5 text-success" />
    } else if (event.extendedProps.isDropped) {
      return <CircleX className="size-5 text-danger" />
    } else {
      return <Play className="size-5 text-warning" />
    }
  }

  const getEventTypeLabel = () => {
    if (event.extendedProps.isCompleted) return t('calendar.completed')
    if (event.extendedProps.isDropped) return t('calendar.dropped')
    return t('calendar.started')
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h`
  }

  return (
    <div
      onClick={() => onEventClick(event.extendedProps.originalId?.toString() || event.id)}
      className="group mb-2 cursor-pointer rounded-lg border border-border bg-surface-raised p-4 transition-all duration-200 hover:translate-x-1 hover:border-accent/40"
    >
      <div className="flex items-center gap-4">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `color-mix(in srgb, ${event.borderColor} 14%, transparent)` }}
        >
          {getEventIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-0.5 truncate text-body-sm font-semibold text-text-primary sm:text-body">
            {event.title}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption text-text-secondary">
              {formatEventDate(event.start)}
              {event.end && ` - ${formatEventDate(event.end)}`}
            </span>

            {/* borderColor holds the solid accent; backgroundColor is now a soft
                tint (for the month-grid pills), too faint for white label text. */}
            <Badge
              className="h-5 text-[0.7rem] font-semibold text-white"
              style={{ backgroundColor: event.borderColor }}
            >
              {getEventTypeLabel()}
            </Badge>

            {event.extendedProps.durationSeconds > 0 && (
              <span className="text-[0.75rem] font-medium text-text-secondary">
                {formatDuration(event.extendedProps.durationSeconds)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
