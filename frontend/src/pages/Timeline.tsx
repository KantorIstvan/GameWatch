import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { useTimelineEvents } from '../hooks/useTimelineEvents'
import { useTimelineFilters } from '../hooks/useTimelineFilters'
import { useTimelineView } from '../hooks/useTimelineView'
import { TimelineToolbar } from '../components/timeline/TimelineToolbar'
import { TimelineFilters } from '../components/timeline/TimelineFilters'
import { TimelineListView } from '../components/timeline/TimelineListView'
import { TimelineGanttView } from '../components/timeline/TimelineGanttView'
import { TimelineEventPanel } from '../components/timeline/TimelineEventPanel'
import { Alert, AlertDescription } from '@/components/ui/alert'

function Timeline() {
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()

  const { playthroughs, events, loading, error, refetch } = useTimelineEvents()
  const { viewMode, setViewMode, isMobile } = useTimelineView()
  const {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    filteredEvents,
    groupedEventsByMonth,
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
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div>
      <TimelineToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        isMobile={isMobile}
      />

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
      />

      {viewMode === 'list' ? (
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
