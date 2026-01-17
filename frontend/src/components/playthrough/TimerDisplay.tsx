import { Box, Typography, IconButton, Paper, Tooltip } from '@mui/material'
import { Edit, Delete } from '@mui/icons-material'
import { formatTimeHMS } from '../../utils/formatters'
import { Playthrough } from '../../types'

interface TimerDisplayProps {
  playthrough: Playthrough
  elapsedTime: number
  timerGradient: string
  onEdit: () => void
  onDelete: () => void
  children?: React.ReactNode
  statusText: string
}

function TimerDisplay({ 
  playthrough, 
  elapsedTime, 
  timerGradient, 
  onEdit, 
  onDelete,
  children,
  statusText 
}: TimerDisplayProps) {
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 4, 
        mb: 3, 
        textAlign: 'center',
        background: timerGradient,
        color: 'white',
        transition: 'background 0.5s ease-in-out',
        position: 'relative'
      }}
    >
      <Tooltip title="Delete playthrough" arrow>
        <IconButton 
          onClick={onDelete}
          sx={{ 
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'white',
            '&:hover': { 
              bgcolor: 'rgba(255, 255, 255, 0.2)'
            }
          }}
        >
          <Delete />
        </IconButton>
      </Tooltip>

      <Typography variant="overline" sx={{ opacity: 0.9 }}>
        Time Played
      </Typography>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center', 
        justifyContent: 'center', 
        my: 2,
        gap: { xs: 1.5, sm: 0 },
      }}>
        <Typography 
          variant="h2" 
          component="div" 
          sx={{ 
            fontFamily: 'monospace', 
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            fontSize: { xs: '2.5rem', sm: '3rem', md: '3.75rem' },
            textAlign: 'center',
          }}
        >
          {formatTimeHMS(elapsedTime)}
        </Typography>
        {(!playthrough.isActive || (playthrough.durationSeconds === 0 && !playthrough.startedAt)) && !playthrough.isCompleted && !playthrough.isDropped && (
          <IconButton 
            onClick={onEdit} 
            sx={{ 
              ml: { xs: 0, sm: 2 },
              color: 'white',
              bgcolor: { xs: 'rgba(255, 255, 255, 0.15)', sm: 'transparent' },
              '&:hover': {
                bgcolor: { xs: 'rgba(255, 255, 255, 0.25)', sm: 'rgba(255, 255, 255, 0.2)' },
              },
              width: { xs: 48, sm: 'auto' },
              height: { xs: 48, sm: 'auto' },
            }}
            title="Edit time manually"
          >
            <Edit sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' } }} />
          </IconButton>
        )}
      </Box>
      
      {children}

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          {statusText}
        </Typography>
      </Box>
    </Paper>
  )
}

export default TimerDisplay
