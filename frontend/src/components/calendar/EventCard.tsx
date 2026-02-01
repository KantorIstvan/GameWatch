import { Box, Card, Typography, Chip } from '@mui/material'
import { CheckCircle, Cancel, PlayArrow } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

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
  mode: string
  onEventClick: (eventId: string) => void
}

export const EventCard = ({ event, mode, onEventClick }: EventCardProps) => {
  const { t } = useTranslation()

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(t('app.locale', 'en'), { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getEventIcon = () => {
    if (event.extendedProps.isCompleted) {
      return <CheckCircle sx={{ fontSize: '1.25rem', color: '#10b981' }} />
    } else if (event.extendedProps.isDropped) {
      return <Cancel sx={{ fontSize: '1.25rem', color: '#f44336' }} />
    } else {
      return <PlayArrow sx={{ fontSize: '1.25rem', color: '#f59e0b' }} />
    }
  }

  const getEventTypeLabel = () => {
    if (event.extendedProps.isCompleted) return t('calendar.completed', 'Completed')
    if (event.extendedProps.isDropped) return t('calendar.dropped', 'Dropped')
    return t('calendar.started', 'Started')
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h`
  }

  return (
    <Card
      onClick={() => onEventClick(event.extendedProps.originalId?.toString() || event.id)}
      elevation={0}
      sx={{
        mb: 2,
        p: 2,
        backgroundColor: mode === 'light' ? '#ffffff' : '#1a1d23',
        border: '1px solid',
        borderColor: mode === 'light' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(139, 154, 247, 0.1)',
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateX(4px)',
          borderColor: mode === 'light' ? '#667eea' : '#8b9af7',
          boxShadow: mode === 'light' 
            ? '0 4px 12px rgba(102, 126, 234, 0.15)'
            : '0 4px 12px rgba(139, 154, 247, 0.2)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            backgroundColor: event.backgroundColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {getEventIcon()}
        </Box>
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: '0.95rem', sm: '1.05rem' },
              fontWeight: 600,
              color: mode === 'light' ? '#212529' : '#ffffff',
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.title}
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Typography
              variant="body2"
              sx={{
                color: mode === 'light' ? '#6c757d' : '#868e96',
                fontSize: '0.85rem',
              }}
            >
              {formatEventDate(event.start)}
              {event.end && ` - ${formatEventDate(event.end)}`}
            </Typography>
            
            <Chip
              label={getEventTypeLabel()}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: event.backgroundColor,
                color: '#ffffff',
              }}
            />
            
            {event.extendedProps.durationSeconds > 0 && (
              <Typography
                variant="body2"
                sx={{
                  color: mode === 'light' ? '#6c757d' : '#868e96',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {formatDuration(event.extendedProps.durationSeconds)}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Card>
  )
}
