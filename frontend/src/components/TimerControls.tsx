import { Button, Stack } from '@mui/material'
import { PlayArrow, Pause, Schedule, Stop } from '@mui/icons-material'
import { Playthrough } from '../types'

interface TimerControlsProps {
  playthrough: Playthrough
  onStart: () => void
  onPause: () => void
  onContinue: () => void
  onEndSession: () => void
  onFinish: () => void
  onDrop: () => void
  onPickup: () => void
  onOpenManualSession: () => void
  t: any
}

function TimerControls({
  playthrough,
  onStart,
  onPause,
  onContinue,
  onEndSession,
  onFinish,
  onDrop,
  onPickup,
  onOpenManualSession,
  t
}: TimerControlsProps) {
  const buttonStyle = {
    minHeight: { xs: 36, sm: 32 },
    px: 2,
    fontSize: '0.8125rem',
  }

  return (
    <>
      <Stack 
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1} 
        justifyContent="center" 
        sx={{ 
          mt: 2,
          width: { xs: '100%', sm: 'auto' },
          px: { xs: 2, sm: 0 },
        }}
      >
        {/* Play/Pause/Continue Button */}
        {!playthrough.isActive ? (
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={playthrough.durationSeconds === 0 ? onStart : onContinue}
            size="small"
            disabled={playthrough.isCompleted || playthrough.isDropped}
            sx={{ 
              ...buttonStyle,
              bgcolor: 'white',
              color: 'black',
              border: 'none',
              minWidth: { xs: 'auto', sm: 110 },
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
              '&:disabled': { bgcolor: 'rgba(255, 255, 255, 0.3)', color: 'rgba(0, 0, 0, 0.3)' }
            }}
          >
            {(playthrough.durationSeconds ?? 0) === 0 
              ? t('playthrough.start') 
              : (playthrough.isPaused
                ? t('playthrough.continue')
                : t('playthrough.newSession'))}
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<Pause />}
            onClick={onPause}
            size="small"
            sx={{ 
              ...buttonStyle,
              bgcolor: 'white',
              color: 'black',
              border: 'none',
              minWidth: { xs: 'auto', sm: 110 },
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' }
            }}
          >
            {t('playthrough.pause')}
          </Button>
        )}
        
        {/* End Session Button - Show when active or paused */}
        {(playthrough.isActive || playthrough.isPaused) && (
          <Button
            variant="contained"
            startIcon={<Schedule />}
            onClick={onEndSession}
            size="small"
            sx={{ 
              ...buttonStyle,
              bgcolor: '#ff9800',
              color: 'white',
              border: 'none',
              minWidth: { xs: 'auto', sm: 120 },
              '&:hover': { bgcolor: '#f57c00' }
            }}
          >
            {t('playthrough.endSession')}
          </Button>
        )}
        
        {/* Finish Button - Hide for casual playthroughs */}
        {playthrough.playthroughType !== 'casual' && (
          <Button
            variant="contained"
            startIcon={<Stop />}
            onClick={onFinish}
            disabled={playthrough.isCompleted || playthrough.isDropped || playthrough.isActive}
            size="small"
            sx={{ 
              ...buttonStyle,
              bgcolor: '#4caf50',
              color: 'white',
              border: 'none',
              minWidth: { xs: 'auto', sm: 100 },
              '&:hover': { bgcolor: '#45a049' },
              '&:disabled': { bgcolor: 'rgba(76, 175, 80, 0.3)' }
            }}
          >
            {t('playthrough.finish')}
          </Button>
        )}

        {/* Drop Button - Hide for casual playthroughs */}
        {playthrough.playthroughType !== 'casual' && (
          <Button
            variant="contained"
            startIcon={<Stop />}
            onClick={onDrop}
            disabled={playthrough.isCompleted || playthrough.isDropped || playthrough.isActive}
            size="small"
            sx={{ 
              ...buttonStyle,
              bgcolor: '#f44336',
              color: 'white',
              border: 'none',
              minWidth: { xs: 'auto', sm: 90 },
              '&:hover': { bgcolor: '#d32f2f' },
              '&:disabled': { bgcolor: 'rgba(244, 67, 54, 0.3)' }
            }}
          >
            {t('playthrough.drop')}
          </Button>
        )}
      </Stack>

      {/* Log Manual Session Button - Show when not active */}
      {!playthrough.isActive && !playthrough.isPaused && !playthrough.isDropped && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 1, px: { xs: 2, sm: 0 } }}>
          <Button
            variant="outlined"
            startIcon={<AccessTime />}
            onClick={onOpenManualSession}
            disabled={playthrough.isCompleted}
            size="small"
            sx={{ 
              ...buttonStyle,
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              minWidth: { xs: 'auto', sm: 180 },
              '&:hover': { 
                borderColor: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.1)'
              },
              '&:disabled': { 
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            {t('playthrough.logManualSession')}
          </Button>
        </Stack>
      )}

      {/* Pick Up Button - Show when dropped */}
      {playthrough.isDropped && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 1, px: { xs: 2, sm: 0 } }}>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={onPickup}
            size="small"
            sx={{ 
              ...buttonStyle,
              bgcolor: '#2196f3',
              color: 'white',
              border: 'none',
              minWidth: { xs: 'auto', sm: 180 },
              '&:hover': { bgcolor: '#1976d2' }
            }}
          >
            {t('playthrough.pickup')}
          </Button>
        </Stack>
      )}
    </>
  )
}

export default TimerControls

import { AccessTime } from '@mui/icons-material'
