import { Box, Typography, Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'
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
  mode: string
  onEventClick: (eventId: string) => void
}

export const CalendarListView = ({ groupedEventsByMonth, mode, onEventClick }: CalendarListViewProps) => {
  const { t } = useTranslation()
  const sortedMonths = Object.keys(groupedEventsByMonth).sort().reverse()

  const formatMonthHeader = (monthKey: string) => {
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString(t('app.locale', 'en'), { 
      year: 'numeric', 
      month: 'long' 
    })
  }

  return (
    <Box>
      {sortedMonths.map((monthKey) => (
        <Box key={monthKey} sx={{ mb: 4 }}>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontWeight: 600,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              color: mode === 'light' ? '#667eea' : '#8b9af7',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {formatMonthHeader(monthKey)}
            <Chip 
              label={groupedEventsByMonth[monthKey].length} 
              size="small"
              sx={{ 
                fontWeight: 600,
                backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(139, 154, 247, 0.1)',
                color: mode === 'light' ? '#667eea' : '#8b9af7',
              }}
            />
          </Typography>
          
          {groupedEventsByMonth[monthKey].map((event) => (
            <EventCard
              key={event.id}
              event={event}
              mode={mode}
              onEventClick={onEventClick}
            />
          ))}
        </Box>
      ))}
    </Box>
  )
}
