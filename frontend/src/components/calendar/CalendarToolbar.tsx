import { Box, Typography, IconButton } from '@mui/material'
import { CalendarMonth, ViewList } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

interface CalendarToolbarProps {
  mode: string
  viewMode: 'calendar' | 'list'
  setViewMode: (mode: 'calendar' | 'list') => void
  isMobile: boolean
}

export const CalendarToolbar = ({ mode, viewMode, setViewMode, isMobile }: CalendarToolbarProps) => {
  const { t } = useTranslation()

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      mb: { xs: 3, md: 4 },
      flexWrap: 'wrap',
      gap: 2,
    }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 500,
          fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
          color: mode === 'light' ? '#212529' : '#ffffff',
        }}
      >
        {t('calendar.title')}
      </Typography>

      {isMobile && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={() => setViewMode('list')}
            sx={{
              backgroundColor: viewMode === 'list' 
                ? (mode === 'light' ? '#667eea' : '#8b9af7')
                : (mode === 'light' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(139, 154, 247, 0.1)'),
              color: viewMode === 'list'
                ? '#ffffff'
                : (mode === 'light' ? '#667eea' : '#8b9af7'),
              '&:hover': {
                backgroundColor: viewMode === 'list'
                  ? (mode === 'light' ? '#5568d3' : '#7481e0')
                  : (mode === 'light' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(139, 154, 247, 0.2)'),
              },
            }}
          >
            <ViewList />
          </IconButton>
          <IconButton
            onClick={() => setViewMode('calendar')}
            sx={{
              backgroundColor: viewMode === 'calendar'
                ? (mode === 'light' ? '#667eea' : '#8b9af7')
                : (mode === 'light' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(139, 154, 247, 0.1)'),
              color: viewMode === 'calendar'
                ? '#ffffff'
                : (mode === 'light' ? '#667eea' : '#8b9af7'),
              '&:hover': {
                backgroundColor: viewMode === 'calendar'
                  ? (mode === 'light' ? '#5568d3' : '#7481e0')
                  : (mode === 'light' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(139, 154, 247, 0.2)'),
              },
            }}
          >
            <CalendarMonth />
          </IconButton>
        </Box>
      )}
    </Box>
  )
}
