import { useEffect, useState } from 'react'
import { CalendarSearch, CalendarX } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { useTimelineEvents } from '../hooks/useTimelineEvents'
import { useTimelineFilters } from '../hooks/useTimelineFilters'
import { useTimelineView } from '../hooks/useTimelineView'
import Loading from '../components/Loading'
import { TimelineToolbar } from '../components/timeline/TimelineToolbar'
import { TimelineFilters } from '../components/timeline/TimelineFilters'
import { TimelineListView } from '../components/timeline/TimelineListView'
import { TimelineGanttView } from '../components/timeline/TimelineGanttView'
import { TimelineEventPanel } from '../components/timeline/TimelineEventPanel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

function Timeline() {
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()

  const { playthroughs, events, loading, error, refetch } = useTimelineEvents()
  const { viewMode } = useTimelineView()
  const {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    filteredEvents,
    groupedEventsByMonth,
    hasActiveFilters,
    clearFilters,
  } = useTimelineFilters(events)

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

  const selectedEvent = events.find((event) => event.id === selectedEventId) || null
  const selectedPlaythrough = selectedEvent
    ? playthroughs.find((pt) => pt.id === (selectedEvent.extendedProps.originalId ?? Number(selectedEvent.id)))
    : undefined

  if (loading) {
    return <Loading />
  }

  return (
    <div>
      <TimelineToolbar />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{t(error)}</AlertDescription>
        </Alert>
      )}

      <TimelineFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {events.length === 0 && !loading ? (
        <div className="mt-8 flex flex-col items-center rounded-xl border-2 border-dashed border-accent/20 bg-accent/5 px-6 py-16 text-center sm:mt-12">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-accent-subtle text-accent">
            <CalendarX className="size-8" />
          </div>
          <p className="text-h4 font-semibold text-text-primary">{t('calendar.noEvents')}</p>
          <p className="mx-auto mt-1 max-w-sm text-body-sm text-text-secondary">
            {t('calendar.noEventsDescription')}
          </p>
        </div>
      ) : filteredEvents.length === 0 && !loading ? (
        <div className="mt-8 flex flex-col items-center rounded-xl border-2 border-dashed border-border px-6 py-16 text-center sm:mt-12">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface text-text-secondary">
            <CalendarSearch className="size-8" />
          </div>
          <p className="text-h4 font-semibold text-text-primary">{t('calendar.noMatchingEvents')}</p>
          <p className="mx-auto mt-1 max-w-sm text-body-sm text-text-secondary">
            {t('calendar.noMatchingEventsDescription')}
          </p>
          <Button variant="outline" onClick={clearFilters} className="mt-6">
            {t('games.clearFilters')}
          </Button>
        </div>
      ) : viewMode === 'list' ? (
        <TimelineListView
          groupedEventsByMonth={groupedEventsByMonth}
          onEventClick={openEventPanel}
        />
      ) : (
        <TimelineGanttView
          events={filteredEvents}
          onEventClick={openEventPanel}
        />
      )}

      <TimelineEventPanel
        event={selectedEvent}
        playthrough={selectedPlaythrough}
        open={panelOpen}
        onOpenChange={setPanelOpen}
      />
    </div>
  )
}

export default Timeline
