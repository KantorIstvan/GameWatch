import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { usePlaythroughEvents } from '../hooks/usePlaythroughEvents'
import { useCalendarFilters } from '../hooks/useCalendarFilters'
import { useCalendarView } from '../hooks/useCalendarView'
import { CalendarToolbar } from '../components/calendar/CalendarToolbar'
import { CalendarFilters } from '../components/calendar/CalendarFilters'
import { CalendarListView } from '../components/calendar/CalendarListView'
import { CalendarGridView } from '../components/calendar/CalendarGridView'
import { CalendarEventPanel } from '../components/calendar/CalendarEventPanel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import './Calendar.css'

function Calendar() {
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()

  const { playthroughs, events, loading, error, refetch } = usePlaythroughEvents()
  const { viewMode, setViewMode, isMobile } = useCalendarView()
  const {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    filteredEvents,
    groupedEventsByMonth,
  } = useCalendarFilters(events)

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    if (isAuthReady) {
      refetch()
    }
  }, [isAuthReady])

  const openEventPanel = (eventId: string) => {
    setSelectedEventId(eventId)
    setPanelOpen(true)
  }

  const handleEventClick = (info: any) => {
    openEventPanel(info.event.id)
  }

  const handleListItemClick = (eventId: string) => {
    openEventPanel(eventId)
  }

  const selectedEvent = events.find((event) => event.id === selectedEventId) || null
  const selectedPlaythrough = selectedEvent
    ? playthroughs.find((pt) => pt.id === (selectedEvent.extendedProps.originalId ?? Number(selectedEvent.id)))
    : undefined

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
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {viewMode === 'list' ? (
        <CalendarListView
          groupedEventsByMonth={groupedEventsByMonth}
          onEventClick={handleListItemClick}
        />
      ) : (
        <CalendarGridView
          events={filteredEvents}
          onEventClick={handleEventClick}
        />
      )}

      {events.length === 0 && !loading && (
        <div className="mt-12 rounded-xl border-2 border-dashed border-accent/20 bg-accent/5 p-12 text-center">
          <p className="mb-2 text-h3 font-semibold text-text-primary">
            {t('calendar.noEvents')}
          </p>
          <p className="mx-auto max-w-125 text-text-secondary">
            {t('calendar.noEventsDescription')}
          </p>
        </div>
      )}

      <CalendarEventPanel
        event={selectedEvent}
        playthrough={selectedPlaythrough}
        open={panelOpen}
        onOpenChange={setPanelOpen}
      />
    </div>
  )
}

export default Calendar
