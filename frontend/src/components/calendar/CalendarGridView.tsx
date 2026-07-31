import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useTranslation } from 'react-i18next'
import { useWeekStart } from '../../contexts/WeekStartContext'
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
  mode: string
  onEventClick: (info: any) => void
}

export const CalendarGridView = ({ events, mode, onEventClick }: CalendarGridViewProps) => {
  const { t } = useTranslation()
  const { getFirstDayNumber } = useWeekStart()

  const renderEventContent = (eventInfo: any) => {
    const isCompleted = eventInfo.event.extendedProps.isCompleted
    const isDropped = eventInfo.event.extendedProps.isDropped
    return (
      <div className="flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap p-1 text-[0.8rem] font-semibold text-white">
        {isCompleted && <span className="text-[0.7rem] text-white">✓</span>}
        {isDropped && <span className="text-[0.7rem] text-white">✗</span>}
        <span className="text-white">{eventInfo.event.title}</span>
      </div>
    )
  }

  return (
    <div
      className="gw-calendar-card overflow-hidden rounded-xl border p-4 shadow-2 transition-all duration-300 sm:p-6 md:p-8"
      style={{
        backgroundColor: mode === 'light' ? '#ffffff' : '#1a1d23',
        borderColor: mode === 'light' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(139, 154, 247, 0.1)',
      }}
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
