import { useState } from 'react'
import { Frown, Meh, Smile, Laugh, Angry } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import healthApi from '../services/healthApi'

interface MoodPromptModalProps {
  open: boolean
  onClose: () => void
  sessionHistoryId?: number | null
  required?: boolean
}

const moodIcons = [
  <Angry key="1" className="size-16" />,
  <Frown key="2" className="size-16" />,
  <Meh key="3" className="size-16" />,
  <Smile key="4" className="size-16" />,
  <Laugh key="5" className="size-16" />,
]

const moodColors = ['#ef5350', '#ff9800', '#9e9e9e', '#66bb6a', '#4caf50']

export default function MoodPromptModal({
  open,
  onClose,
  sessionHistoryId,
  required = false,
}: MoodPromptModalProps) {
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && required) return
        if (!next) handleSkip()
      }}
    >
      <DialogContent showCloseButton={!required} className="rounded-xl bg-surface/95">
        <DialogTitle className="text-h4 font-semibold">{t('mood.prompt')}</DialogTitle>
        <p className="-mt-2 text-body-sm text-text-secondary">{t('mood.rateSession')}</p>

        <div className="pb-2 pt-2">
          <div className="mb-6 flex justify-center">
            <div className="transition-all duration-300" style={{ color: moodColors[moodRating - 1] }}>
              {moodIcons[moodRating - 1]}
            </div>
          </div>

          <p className="mb-6 text-center text-h3 font-semibold">
            {moodLabels[moodRating - 1]}
          </p>

          <Slider
            value={[moodRating]}
            onValueChange={([value]) => setMoodRating(value)}
            min={1}
            max={5}
            step={1}
          />
          <div className="mt-2 flex justify-between text-caption text-text-tertiary">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {!required && (
            <Button variant="ghost" onClick={handleSkip} disabled={submitting} className="h-12 w-full">
              {t('mood.skip')}
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={submitting} className="h-12 w-full">
            {submitting ? t('mood.submitting') : t('mood.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
