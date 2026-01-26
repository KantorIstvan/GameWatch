import { Box, Typography, IconButton, Paper, Tooltip, Collapse } from '@mui/material'
import { Edit, Delete } from '@mui/icons-material'
import { formatTimeHMS } from '../../utils/formatters'
import { Playthrough } from '../../types'

interface TimerDisplayProps {
  playthrough: Playthrough
  elapsedTime: number
  currentSessionTime?: number
  timerGradient: string
  onEdit: () => void
  onDelete: () => void
  children?: React.ReactNode
  statusText: string
}

function TimerDisplay({ 
  playthrough, 
  elapsedTime, 
  currentSessionTime,
  timerGradient, 
  onEdit, 
  onDelete,
  children,
  statusText 
}: TimerDisplayProps) {
  // Determine if we should show dual timers (active or paused session with current session time)
  const showDualTimers = (playthrough.isActive || playthrough.isPaused) && currentSessionTime !== undefined
  
  // Calculate the overall playthrough time (frozen during active/paused session)
  const overallTime = (playthrough.isActive || playthrough.isPaused)
    ? (playthrough.durationSeconds || 0) 
    : elapsedTime

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

      {showDualTimers ? (
        // Active/Paused Session: Show both Current Session Timer (primary) and Overall Timer (secondary)
        <>
          <Typography 
            variant="overline" 
            sx={{ 
              opacity: 0.9, 
              fontSize: '0.875rem', 
              fontWeight: 600,
              animation: 'fadeIn 0.4s ease-out',
              '@keyframes fadeIn': {
                from: { opacity: 0, transform: 'translateY(-10px)' },
                to: { opacity: 0.9, transform: 'translateY(0)' }
              }
            }}
          >
            Current Session
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            my: 2,
            gap: 2,
            animation: 'slideIn 0.5s ease-out',
            '@keyframes slideIn': {
              from: { opacity: 0, transform: 'translateY(20px)' },
              to: { opacity: 1, transform: 'translateY(0)' }
            }
          }}>
            {/* Primary: Current Session Timer */}
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
              {formatTimeHMS(currentSessionTime)}
            </Typography>
            
            {/* Secondary: Overall Playthrough Timer with sophisticated animations */}
            <Collapse 
              in={showDualTimers}
              timeout={350}
              unmountOnExit
              sx={{
                transformOrigin: 'top center',
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                opacity: 0.8,
                willChange: 'transform, opacity',
                animation: showDualTimers ? 'scaleAndFadeIn 350ms ease-out' : 'slideDownAndFadeOut 350ms ease-out',
                '@keyframes scaleAndFadeIn': {
                  '0%': { 
                    opacity: 0, 
                    transform: 'scale(0.95) translateY(-5px)',
                  },
                  '100%': { 
                    opacity: 0.8, 
                    transform: 'scale(1) translateY(0)',
                  }
                },
                '@keyframes slideDownAndFadeOut': {
                  '0%': { 
                    opacity: 0.8, 
                    transform: 'translateY(0)',
                  },
                  '100%': { 
                    opacity: 0, 
                    transform: 'translateY(10px)',
                  }
                }
              }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Playtime
                </Typography>
                <Typography 
                  variant="h5" 
                  component="div" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  }}
                >
                  {formatTimeHMS(overallTime)}
                </Typography>
              </Box>
            </Collapse>
          </Box>
        </>
      ) : (
        // Idle State: Show only Overall Playthrough Timer
        <>
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
        </>
      )}
      
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
