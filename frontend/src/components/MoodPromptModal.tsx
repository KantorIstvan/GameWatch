import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
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
import { useTranslation } from 'react-i18next'
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

export default function MoodPromptModal({
  open,
  onClose,
  sessionHistoryId,
  required = false,
}: MoodPromptModalProps) {
  const theme = useTheme()
  const { t } = useTranslation()
  const [moodRating, setMoodRating] = useState<number>(3)
  const [submitting, setSubmitting] = useState(false)

  const moodLabels = [
    t('mood.veryBad'),
    t('mood.bad'),
    t('mood.neutral'),
    t('mood.good'),
    t('mood.excellent'),
  ]

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await healthApi.submitMood({
        sessionHistoryId: sessionHistoryId || null,
        moodRating,
      })
      onClose()
      setMoodRating(3)
    } catch (error) {
      // Error handled silently
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = () => {
    if (!required) {
      onClose()
      setMoodRating(3)
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
          {t('mood.prompt')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('mood.rateSession')}
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
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!required && (
          <Button 
            onClick={handleSkip} 
            disabled={submitting}
            sx={{ mr: 1 }}
          >
            {t('mood.skip')}
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
          {submitting ? t('mood.submitting') : t('mood.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
