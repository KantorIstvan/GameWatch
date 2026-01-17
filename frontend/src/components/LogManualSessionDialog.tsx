import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  alpha,
  useTheme,
  Slide,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useTranslation } from 'react-i18next'

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

interface LogManualSessionDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (startedAt: string, endedAt: string) => void
  playthroughStartDate?: string | null
  isCompleted?: boolean
  isDropped?: boolean
}

function LogManualSessionDialog({ open, onClose, onSubmit, playthroughStartDate, isCompleted, isDropped }: LogManualSessionDialogProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [startDateTime, setStartDateTime] = useState('')
  const [endDateTime, setEndDateTime] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    setError('')

    if (!startDateTime || !endDateTime) {
      setError('Both start and end times are required')
      return
    }

    const start = new Date(startDateTime)
    const end = new Date(endDateTime)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Invalid date/time format')
      return
    }

    if (start >= end) {
      setError('Start time must be before end time')
      return
    }

    const now = new Date()
    if (start > now) {
      setError('Start time cannot be in the future')
      return
    }

    if (end > now) {
      setError('End time cannot be in the future')
      return
    }

    if (isCompleted) {
      setError('Cannot log session for a completed playthrough')
      return
    }

    if (isDropped) {
      setError('Cannot log session for a dropped playthrough')
      return
    }

    if (playthroughStartDate) {
      const playthroughStart = new Date(playthroughStartDate)
      playthroughStart.setHours(0, 0, 0, 0) 
      const sessionStart = new Date(start)
      sessionStart.setHours(0, 0, 0, 0)
      
      if (sessionStart < playthroughStart) {
        setError(`Cannot log session before playthrough start date: ${playthroughStart.toLocaleDateString()}`)
        return
      }
    }

    onSubmit(start.toISOString(), end.toISOString())
    handleClose()
  }

  const handleClose = () => {
    setStartDateTime('')
    setEndDateTime('')
    setError('')
    onClose()
  }

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: theme.palette.mode === 'dark'
            ? `0 8px 32px ${alpha('#000000', 0.6)}`
            : `0 8px 32px ${alpha('#000000', 0.15)}`,
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, fontSize: '1.5rem', fontWeight: 600 }}>
        {t('playthrough.logManualSession')}
      </DialogTitle>
      <DialogContent>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 3, 
            lineHeight: 1.6,
          }}
        >
          Log a play session that you forgot to track. Enter the exact start and end times.
        </Typography>
        
        <Stack spacing={3}>
          <TextField
            label="Start Date & Time"
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              max: formatDateTimeLocal(new Date()),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
          
          <TextField
            label="End Date & Time"
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              max: formatDateTimeLocal(new Date()),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          {startDateTime && endDateTime && !error && (() => {
            const start = new Date(startDateTime)
            const end = new Date(endDateTime)
            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start < end) {
              const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)
              const hours = Math.floor(durationSeconds / 3600)
              const minutes = Math.floor((durationSeconds % 3600) / 60)
              const seconds = durationSeconds % 60
              return (
                <Typography 
                  variant="body2" 
                  color="primary"
                  sx={{ 
                    p: 2, 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    borderRadius: 2,
                    fontWeight: 600
                  }}
                >
                  Duration: {hours}h {minutes}m {seconds}s
                </Typography>
              )
            }
            return null
          })()}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1 }}>
        <Button 
          onClick={handleClose}
          variant="outlined"
          size="medium"
          fullWidth
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            borderWidth: 1.5,
            minHeight: 40,
            '&:hover': {
              borderWidth: 1.5,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
            }
          }}
        >
          {t('common.cancel')}
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          size="medium"
          fullWidth
          disabled={!startDateTime || !endDateTime}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 40,
            boxShadow: `0 3px 10px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default LogManualSessionDialog
