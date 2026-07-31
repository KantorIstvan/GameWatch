import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { usePlaythroughEvents } from '../hooks/usePlaythroughEvents'
import { useCalendarFilters } from '../hooks/useCalendarFilters'
import { useCalendarView } from '../hooks/useCalendarView'
import { CalendarToolbar } from '../components/calendar/CalendarToolbar'
import { CalendarFilters } from '../components/calendar/CalendarFilters'
import { CalendarListView } from '../components/calendar/CalendarListView'
import { CalendarGridView } from '../components/calendar/CalendarGridView'
import { Alert, AlertDescription } from '@/components/ui/alert'
import './Calendar.css'

function Calendar() {
  const { mode } = useTheme()
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()

  const { events, loading, error, refetch } = usePlaythroughEvents(mode)
  const { viewMode, setViewMode, isMobile } = useCalendarView()
  const {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    filteredEvents,
    groupedEventsByMonth,
  } = useCalendarFilters(events)

  useEffect(() => {
    if (isAuthReady) {
      refetch()
    }
  }, [isAuthReady])

  const handleEventClick = (info: any) => {
    const playthroughId = info.event.extendedProps.originalId || info.event.id
    window.location.href = `/playthrough/${playthroughId}`
  }

  const handleListItemClick = (eventId: string) => {
    window.location.href = `/playthrough/${eventId}`
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div>
      <CalendarToolbar
        mode={mode}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isMobile={isMobile}
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{t(error)}</AlertDescription>
        </Alert>
      )}

      <CalendarFilters
        mode={mode}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {viewMode === 'list' ? (
        <CalendarListView
          groupedEventsByMonth={groupedEventsByMonth}
          mode={mode}
          onEventClick={handleListItemClick}
        />
      ) : (
        <CalendarGridView
          events={filteredEvents}
          mode={mode}
          onEventClick={handleEventClick}
        />
      )}

      {events.length === 0 && !loading && (
        <div
          className="mt-12 rounded-xl border-2 border-dashed p-12 text-center"
          style={{
            backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.03)' : 'rgba(139, 154, 247, 0.03)',
            borderColor: mode === 'light' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(139, 154, 247, 0.2)',
          }}
        >
          <p
            className="mb-2 text-h3 font-semibold"
            style={{ color: mode === 'light' ? '#495057' : '#adb5bd' }}
          >
            📅 {t('calendar.noEvents')}
          </p>
          <p
            className="mx-auto max-w-125"
            style={{ color: mode === 'light' ? '#6c757d' : '#868e96' }}
          >
            {t('calendar.noEventsDescription')}
          </p>
        </div>
      )}
    </div>
  )
}

export default Calendar
