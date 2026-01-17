import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  TextField,
  Box,
  Typography,
  useTheme,
} from '@mui/material'
import {
  SentimentVeryDissatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentVerySatisfied,
} from '@mui/icons-material'
import healthApi from '../services/healthApi'

interface MoodPromptModalProps {
  open: boolean
  onClose: () => void
  sessionHistoryId?: number | null
  required?: boolean
}

const moodIcons = [
  <SentimentVeryDissatisfied key="1" />,
  <SentimentDissatisfied key="2" />,
  <SentimentNeutral key="3" />,
  <SentimentSatisfied key="4" />,
  <SentimentVerySatisfied key="5" />,
]

const moodLabels = ['Very Bad', 'Bad', 'Neutral', 'Good', 'Excellent']

export default function MoodPromptModal({
  open,
  onClose,
  sessionHistoryId,
  required = false,
}: MoodPromptModalProps) {
  const theme = useTheme()
  const [moodRating, setMoodRating] = useState<number>(3)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await healthApi.submitMood({
        sessionHistoryId: sessionHistoryId || null,
        moodRating,
        note: note.trim() || null,
      })
      onClose()
      setMoodRating(3)
      setNote('')
    } catch (error) {
      console.error('Failed to submit mood:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = () => {
    if (!required) {
      onClose()
      setMoodRating(3)
      setNote('')
    }
  }

  const handleClose = (_event: object, reason: string) => {
    if (reason === 'backdropClick' && required) {
      return
    }
    handleSkip()
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: theme.palette.mode === 'light' 
            ? 'rgba(255, 255, 255, 0.95)' 
            : 'rgba(33, 37, 41, 0.95)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          How was your session?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Rate your gaming mood from 1 to 5
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, pb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            {moodIcons[moodRating - 1] && (
              <Box
                sx={{
                  fontSize: '4rem',
                  color: 
                    moodRating === 1 ? '#ef5350' :
                    moodRating === 2 ? '#ff9800' :
                    moodRating === 3 ? '#9e9e9e' :
                    moodRating === 4 ? '#66bb6a' :
                    '#4caf50',
                  transition: 'all 0.3s',
                }}
              >
                {moodIcons[moodRating - 1]}
              </Box>
            )}
          </Box>
          
          <Typography 
            variant="h5" 
            align="center" 
            sx={{ mb: 3, fontWeight: 600 }}
          >
            {moodLabels[moodRating - 1]}
          </Typography>

          <Slider
            value={moodRating}
            onChange={(_e, value) => setMoodRating(value as number)}
            min={1}
            max={5}
            step={1}
            marks
            valueLabelDisplay="auto"
            sx={{
              '& .MuiSlider-thumb': {
                width: 24,
                height: 24,
              },
              '& .MuiSlider-mark': {
                width: 8,
                height: 8,
                borderRadius: '50%',
              },
            }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Any thoughts? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            sx={{ mt: 3 }}
            inputProps={{ maxLength: 500 }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!required && (
          <Button 
            onClick={handleSkip} 
            disabled={submitting}
            sx={{ mr: 1 }}
          >
            Skip
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
          sx={{
            px: 4,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
