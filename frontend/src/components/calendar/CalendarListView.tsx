import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { EventCard } from './EventCard'

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

interface CalendarListViewProps {
  groupedEventsByMonth: { [key: string]: CalendarEvent[] }
  onEventClick: (eventId: string) => void
}

export const CalendarListView = ({ groupedEventsByMonth, onEventClick }: CalendarListViewProps) => {
  const { t } = useTranslation()
  const sortedMonths = Object.keys(groupedEventsByMonth).sort().reverse()

  const formatMonthHeader = (monthKey: string) => {
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString(t('app.locale', 'en'), {
      year: 'numeric',
      month: 'long',
    })
  }

  return (
    <div>
      {sortedMonths.map((monthKey) => (
        <div key={monthKey} className="mb-8">
          <p className="mb-4 flex items-center gap-2 text-h4 font-semibold text-accent">
            {formatMonthHeader(monthKey)}
            <Badge className="bg-accent-subtle font-semibold text-accent">
              {groupedEventsByMonth[monthKey].length}
            </Badge>
          </p>

          {groupedEventsByMonth[monthKey].map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEventClick={onEventClick}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
