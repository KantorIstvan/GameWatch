import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useTranslation } from 'react-i18next'
import { useWeekStart } from '../../contexts/WeekStartContext'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import './fullcalendar-overrides.css'

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

interface CalendarGridViewProps {
  events: CalendarEvent[]
  onEventClick: (info: any) => void
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export const CalendarGridView = ({ events, onEventClick }: CalendarGridViewProps) => {
  const { t } = useTranslation()
  const { getFirstDayNumber } = useWeekStart()

  const renderEventContent = (eventInfo: any) => {
    const isCompleted = eventInfo.event.extendedProps.isCompleted
    const isDropped = eventInfo.event.extendedProps.isDropped
    const dotColor = eventInfo.event.borderColor || eventInfo.event.backgroundColor

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap px-1.5 py-1 text-[0.75rem] font-semibold">
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
            <span className="truncate">{eventInfo.event.title}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-semibold">{eventInfo.event.title}</p>
          <p className="text-text-secondary">
            {isCompleted ? t('calendar.completed') : isDropped ? t('calendar.dropped') : t('calendar.started')}
            {' · '}
            {formatDuration(eventInfo.event.extendedProps.durationSeconds)}
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div
      className="gw-calendar-card overflow-hidden rounded-xl border border-border bg-surface-raised p-4 shadow-1 transition-all duration-300 sm:p-6 md:p-8"
    >
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next',
          center: 'title',
          right: 'today dayGridMonth,dayGridYear',
        }}
        buttonText={{
          today: t('calendar.today'),
          year: t('calendar.yearView'),
          month: t('calendar.monthView'),
        }}
        locale={{
          code: t('app.locale', 'en'),
          buttonText: {
            today: t('calendar.today'),
            year: t('calendar.yearView'),
            month: t('calendar.monthView'),
            prev: t('calendar.prev'),
            next: t('calendar.next'),
          },
        }}
        views={{
          dayGridYear: {
            type: 'dayGrid',
            duration: { years: 1 },
            buttonText: t('calendar.yearView'),
          },
          dayGridMonth: {
            buttonText: t('calendar.monthView'),
          },
        }}
        events={events}
        eventClick={onEventClick}
        eventContent={renderEventContent}
        height="auto"
        contentHeight="auto"
        firstDay={getFirstDayNumber()}
        weekNumbers={false}
        editable={false}
        selectable={false}
        dayMaxEvents={2}
        moreLinkText={(num) => `+${num}`}
        handleWindowResize={true}
        windowResizeDelay={100}
      />
    </div>
  )
}
