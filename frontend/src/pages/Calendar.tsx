import { useState, useEffect } from 'react'
import { Box, Typography, Alert, CircularProgress, Card } from '@mui/material'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { playthroughsApi } from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { Playthrough } from '../types'
import './Calendar.css'

function Calendar() {
  const { mode } = useTheme()
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()
  const [_playthroughs, setPlaythroughs] = useState<Playthrough[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthReady) {
      fetchPlaythroughs()
    }
  }, [isAuthReady])

  const fetchPlaythroughs = async () => {
    try {
      setLoading(true)
      const response = await playthroughsApi.getAll()
      const data = response.data
      setPlaythroughs(data)
      
      const calendarEvents: any[] = []
      
      data
        .filter((playthrough: Playthrough) => playthrough.startDate) 
        .forEach((playthrough: Playthrough) => {
          if (playthrough.droppedAt && playthrough.pickedUpAt) {
            const dropDate = new Date(playthrough.droppedAt).toISOString().split('T')[0]
            calendarEvents.push({
              id: `${playthrough.id}-dropped`,
              title: playthrough.gameName,
              start: playthrough.startDate,
              end: new Date(new Date(dropDate).getTime() + 86400000).toISOString().split('T')[0], 
              backgroundColor: mode === 'light' ? '#f44336' : '#ef5350', 
              borderColor: mode === 'light' ? '#f44336' : '#ef5350',
              textColor: '#ffffff',
              extendedProps: {
                gameId: playthrough.gameId,
                playthroughType: playthrough.playthroughType,
                isCompleted: false,
                isDropped: true,
                durationSeconds: playthrough.durationSeconds,
                originalId: playthrough.id,
              },
            })
            
            const pickupDate = new Date(playthrough.pickedUpAt).toISOString().split('T')[0]
            calendarEvents.push({
              id: playthrough.id.toString(),
              title: playthrough.gameName,
              start: pickupDate,
              end: playthrough.endDate ? new Date(new Date(playthrough.endDate).getTime() + 86400000).toISOString().split('T')[0] : null,
              backgroundColor: getEventColor(playthrough),
              borderColor: getEventColor(playthrough),
              textColor: '#ffffff',
              extendedProps: {
                gameId: playthrough.gameId,
                playthroughType: playthrough.playthroughType,
                isCompleted: playthrough.isCompleted,
                isDropped: false,
                durationSeconds: playthrough.durationSeconds,
              },
            })
          } else {
            calendarEvents.push({
              id: playthrough.id.toString(),
              title: playthrough.gameName,
              start: playthrough.startDate,
              end: playthrough.endDate ? new Date(new Date(playthrough.endDate).getTime() + 86400000).toISOString().split('T')[0] : null,
              backgroundColor: getEventColor(playthrough),
              borderColor: getEventColor(playthrough),
              textColor: '#ffffff',
              extendedProps: {
                gameId: playthrough.gameId,
                playthroughType: playthrough.playthroughType,
                isCompleted: playthrough.isCompleted,
                isDropped: playthrough.isDropped,
                durationSeconds: playthrough.durationSeconds,
              },
            })
          }
        })
      
      setEvents(calendarEvents)
      setError(null)
    } catch (err: any) {
      setError(t('calendar.errorLoading'))
    } finally {
      setLoading(false)
    }
  }

  const getEventColor = (playthrough: Playthrough) => {
    if (playthrough.isDropped) {
      return mode === 'light' ? '#f44336' : '#ef5350' 
    } else if (playthrough.isCompleted) {
      return mode === 'light' ? '#10b981' : '#34d399'
    } else if (playthrough.isActive) {
      return mode === 'light' ? '#667eea' : '#8b9af7' 
    } else {
      return mode === 'light' ? '#f59e0b' : '#fbbf24' 
    }
  }

  const handleEventClick = (info: any) => {

    const playthroughId = info.event.extendedProps.originalId || info.event.id
    window.location.href = `/playthrough/${playthroughId}`
  }

  const renderEventContent = (eventInfo: any) => {
    const isCompleted = eventInfo.event.extendedProps.isCompleted
    const isDropped = eventInfo.event.extendedProps.isDropped
    return (
      <Box
        sx={{
          p: 0.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          color: '#ffffff',
        }}
      >
        {isCompleted && <span style={{ fontSize: '0.7rem', color: '#ffffff' }}>✓</span>}
        {isDropped && <span style={{ fontSize: '0.7rem', color: '#ffffff' }}>✗</span>}
        <span style={{ color: '#ffffff' }}>{eventInfo.event.title}</span>
      </Box>
    )
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
      <Typography
        variant="h4"
        sx={{
          mb: { xs: 3, md: 4 },
          fontWeight: 500,
          fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
          color: mode === 'light' ? '#212529' : '#ffffff',
        }}
      >
        {t('calendar.title')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          backgroundColor: mode === 'light' ? '#ffffff' : '#1a1d23',
          border: '1px solid',
          borderColor: mode === 'light' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(139, 154, 247, 0.1)',
          borderRadius: 3,
          boxShadow: mode === 'light' 
            ? '0 1px 3px rgba(102, 126, 234, 0.08), 0 20px 40px rgba(102, 126, 234, 0.05)'
            : '0 1px 3px rgba(139, 154, 247, 0.15), 0 20px 40px rgba(139, 154, 247, 0.1)',
          transition: 'all 0.3s ease',
          overflow: 'hidden',
          '& .fc': {
            '--fc-border-color': mode === 'light' ? 'rgba(102, 126, 234, 0.12)' : 'rgba(139, 154, 247, 0.12)',
            '--fc-neutral-bg-color': mode === 'light' ? 'rgba(102, 126, 234, 0.04)' : 'rgba(139, 154, 247, 0.04)',
            '--fc-page-bg-color': 'transparent',
            '--fc-today-bg-color': mode === 'light' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(139, 154, 247, 0.1)',
          },
          '& .fc-toolbar': {
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1.5, sm: 0 },
            mb: { xs: 2, sm: 3 },
            alignItems: { xs: 'stretch', sm: 'center' },
          },
          '& .fc-toolbar-chunk': {
            display: 'flex',
            justifyContent: { xs: 'center', sm: 'flex-start' },
            width: { xs: '100%', sm: 'auto' },
            gap: { xs: 0.5, sm: 0 },
          },
          '& .fc-toolbar-title': {
            color: mode === 'light' ? '#212529' : '#ffffff',
            fontSize: { xs: '1.1rem', sm: '1.5rem', md: '1.75rem' },
            fontWeight: 600,
            letterSpacing: '-0.5px',
            background: mode === 'light'
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #8b9af7 0%, #9f7aea 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textAlign: { xs: 'center', sm: 'left' },
            width: { xs: '100%', sm: 'auto' },
          },
          '& .fc-button': {
            backgroundColor: mode === 'light' ? '#667eea' : '#8b9af7',
            borderColor: mode === 'light' ? '#667eea' : '#8b9af7',
            color: '#ffffff',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: { xs: '6px', sm: '8px' },
            padding: { xs: '6px 10px', sm: '8px 16px' },
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            minHeight: { xs: '36px', sm: '40px' },
            flex: { xs: 1, sm: 'initial' },
            boxShadow: mode === 'light' 
              ? '0 2px 8px rgba(102, 126, 234, 0.25)' 
              : '0 2px 8px rgba(139, 154, 247, 0.25)',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: mode === 'light' ? '#5568d3' : '#7481e0',
              borderColor: mode === 'light' ? '#5568d3' : '#7481e0',
              transform: 'translateY(-1px)',
              boxShadow: mode === 'light' 
                ? '0 4px 12px rgba(102, 126, 234, 0.35)' 
                : '0 4px 12px rgba(139, 154, 247, 0.35)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
            '&:disabled': {
              backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
              borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
              boxShadow: 'none',
            },
          },
          '& .fc-button-active': {
            backgroundColor: mode === 'light' ? '#4a56b6' : '#6370c7',
            borderColor: mode === 'light' ? '#4a56b6' : '#6370c7',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
          },
          '& .fc-col-header-cell': {
            backgroundColor: mode === 'light' 
              ? 'linear-gradient(180deg, rgba(102, 126, 234, 0.05) 0%, rgba(102, 126, 234, 0.02) 100%)' 
              : 'linear-gradient(180deg, rgba(139, 154, 247, 0.08) 0%, rgba(139, 154, 247, 0.03) 100%)',
            color: mode === 'light' ? '#495057' : '#adb5bd',
            fontWeight: 700,
            fontSize: { xs: '0.65rem', sm: '0.75rem' },
            textTransform: 'uppercase',
            letterSpacing: { xs: '0.5px', sm: '1px' },
            padding: { xs: '8px 2px', sm: '12px 0' },
            borderBottom: '2px solid',
            borderBottomColor: mode === 'light' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(139, 154, 247, 0.1)',
          },
          '& .fc-daygrid-day-number': {
            color: mode === 'light' ? '#495057' : '#adb5bd',
            fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.9rem' },
            fontWeight: 600,
            padding: { xs: '4px', sm: '6px', md: '8px' },
          },
          '& .fc-daygrid-day.fc-day-today': {
            backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.08)' : 'rgba(139, 154, 247, 0.08)',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: mode === 'light'
                ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(90deg, #8b9af7 0%, #9f7aea 100%)',
            },
          },
          '& .fc-daygrid-day.fc-day-today .fc-daygrid-day-number': {
            color: mode === 'light' ? '#667eea' : '#8b9af7',
            fontWeight: 700,
          },
          '& .fc-event': {
            borderRadius: { xs: '4px', sm: '6px' },
            border: 'none',
            fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' },
            fontWeight: 600,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
            minHeight: { xs: '22px', sm: '24px' },
            '@media (hover: hover)': {
              '&:hover': {
                transform: 'translateY(-2px) scale(1.02)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
                filter: 'brightness(1.1)',
                zIndex: 10,
              },
            },
            '@media (hover: none)': {
              '&:active': {
                transform: 'scale(0.98)',
                filter: 'brightness(0.95)',
              },
            },
          },
          '& .fc-daygrid-event': {
            padding: { xs: '1px 3px', sm: '2px 4px' },
            marginBottom: { xs: '1px', sm: '2px' },
          },
          '& .fc-daygrid-day': {
            transition: 'background-color 0.2s ease',
            '@media (hover: hover)': {
              '&:hover': {
                backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.03)' : 'rgba(139, 154, 247, 0.03)',
              },
            },
          },
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
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          height="auto"
          contentHeight="auto"
          firstDay={1}
          weekNumbers={false}
          editable={false}
          selectable={false}
          dayMaxEvents={2}
          moreLinkText={(num) => `+${num}`}
          handleWindowResize={true}
          windowResizeDelay={100}
        />
      </Card>

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
