import { Box, Typography, ToggleButton, ToggleButtonGroup, TextField, InputAdornment } from '@mui/material'
import { FilterList, Search, CheckCircle, Cancel, PlayArrow } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

interface CalendarFiltersProps {
  mode: string
  statusFilter: string
  setStatusFilter: (filter: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const CalendarFilters = ({
  mode,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
}: CalendarFiltersProps) => {
  const { t } = useTranslation()

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <FilterList sx={{ color: mode === 'light' ? '#667eea' : '#8b9af7', fontSize: '1.25rem' }} />
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            color: mode === 'light' ? '#495057' : '#adb5bd',
          }}
        >
          {t('calendar.filter', 'Filter')}
        </Typography>
      </Box>
      
      <TextField
        fullWidth
        placeholder={t('calendar.searchPlaceholder', 'Search games...')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            backgroundColor: mode === 'light' ? '#ffffff' : '#1a1d23',
            '& fieldset': {
              borderColor: mode === 'light' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(139, 154, 247, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: mode === 'light' ? '#667eea' : '#8b9af7',
            },
            '&.Mui-focused fieldset': {
              borderColor: mode === 'light' ? '#667eea' : '#8b9af7',
            },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: mode === 'light' ? '#667eea' : '#8b9af7' }} />
            </InputAdornment>
          ),
        }}
      />
      
      <ToggleButtonGroup
        value={statusFilter}
        exclusive
        onChange={(_, newFilter) => newFilter && setStatusFilter(newFilter)}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          '& .MuiToggleButtonGroup-grouped': {
            border: '1px solid',
            borderColor: mode === 'light' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(139, 154, 247, 0.2)',
            borderRadius: '8px !important',
            margin: 0,
            '&:not(:first-of-type)': {
              marginLeft: 0,
            },
          },
        }}
      >
        <ToggleButton
          value="all"
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: { xs: '0.85rem', sm: '0.95rem' },
            color: statusFilter === 'all'
              ? '#ffffff'
              : mode === 'light' ? '#667eea' : '#8b9af7',
            backgroundColor: statusFilter === 'all'
              ? (mode === 'light' ? '#667eea' : '#8b9af7')
              : 'transparent',
            '&:hover': {
              backgroundColor: statusFilter === 'all'
                ? (mode === 'light' ? '#5568d3' : '#7481e0')
                : (mode === 'light' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(139, 154, 247, 0.1)'),
            },
          }}
        >
          {t('calendar.all', 'All')}
        </ToggleButton>
        <ToggleButton
          value="completed"
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: { xs: '0.85rem', sm: '0.95rem' },
            color: statusFilter === 'completed'
              ? '#ffffff'
              : mode === 'light' ? '#10b981' : '#34d399',
            backgroundColor: statusFilter === 'completed'
              ? (mode === 'light' ? '#10b981' : '#34d399')
              : 'transparent',
            '&:hover': {
              backgroundColor: statusFilter === 'completed'
                ? (mode === 'light' ? '#059669' : '#10b981')
                : (mode === 'light' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(52, 211, 153, 0.1)'),
            },
          }}
        >
          <CheckCircle sx={{ fontSize: '1rem', mr: 0.5 }} />
          {t('calendar.completed', 'Completed')}
        </ToggleButton>
        <ToggleButton
          value="dropped"
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: { xs: '0.85rem', sm: '0.95rem' },
            color: statusFilter === 'dropped'
              ? '#ffffff'
              : mode === 'light' ? '#f44336' : '#ef5350',
            backgroundColor: statusFilter === 'dropped'
              ? (mode === 'light' ? '#f44336' : '#ef5350')
              : 'transparent',
            '&:hover': {
              backgroundColor: statusFilter === 'dropped'
                ? (mode === 'light' ? '#d32f2f' : '#f44336')
                : (mode === 'light' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(239, 83, 80, 0.1)'),
            },
          }}
        >
          <Cancel sx={{ fontSize: '1rem', mr: 0.5 }} />
          {t('calendar.dropped', 'Dropped')}
        </ToggleButton>
        <ToggleButton
          value="started"
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: { xs: '0.85rem', sm: '0.95rem' },
            color: statusFilter === 'started'
              ? '#ffffff'
              : mode === 'light' ? '#f59e0b' : '#fbbf24',
            backgroundColor: statusFilter === 'started'
              ? (mode === 'light' ? '#f59e0b' : '#fbbf24')
              : 'transparent',
            '&:hover': {
              backgroundColor: statusFilter === 'started'
                ? (mode === 'light' ? '#d97706' : '#f59e0b')
                : (mode === 'light' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(251, 191, 36, 0.1)'),
            },
          }}
        >
          <PlayArrow sx={{ fontSize: '1rem', mr: 0.5 }} />
          {t('calendar.started', 'Started')}
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  )
}
