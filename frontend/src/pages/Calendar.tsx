import { useEffect } from 'react'
import { Box, Typography, Alert, CircularProgress } from '@mui/material'
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <CalendarToolbar
        mode={mode}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isMobile={isMobile}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t(error)}
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
        <Box
          sx={{
            mt: 6,
            p: 6,
            textAlign: 'center',
            backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.03)' : 'rgba(139, 154, 247, 0.03)',
            borderRadius: 3,
            border: '2px dashed',
            borderColor: mode === 'light' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(139, 154, 247, 0.2)',
          }}
        >
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 600,
              color: mode === 'light' ? '#495057' : '#adb5bd',
              mb: 2,
            }}
          >
            📅 {t('calendar.noEvents')}
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: mode === 'light' ? '#6c757d' : '#868e96',
              maxWidth: '500px',
              mx: 'auto',
            }}
          >
            {t('calendar.noEventsDescription')}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default Calendar
