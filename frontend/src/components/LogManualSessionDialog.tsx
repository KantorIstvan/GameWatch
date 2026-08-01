import { useState } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import DateTimePicker from './DateTimePicker'

interface LogManualSessionDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (startedAt: string, endedAt: string) => void
  playthroughStartDate?: string | null
  isCompleted?: boolean
  isDropped?: boolean
  submitting?: boolean
}

function LogManualSessionDialog({ open, onClose, onSubmit, playthroughStartDate, isCompleted, isDropped, submitting }: LogManualSessionDialogProps) {
  const { t } = useTranslation()
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

  const duration = (() => {
    if (!startDateTime || !endDateTime || error) return null
    const start = new Date(startDateTime)
    const end = new Date(endDateTime)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return null
    const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)
    const hours = Math.floor(durationSeconds / 3600)
    const minutes = Math.floor((durationSeconds % 3600) / 60)
    const seconds = durationSeconds % 60
    return `${hours}h ${minutes}m ${seconds}s`
  })()

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="rounded-xl">
        <DialogTitle className="pb-1 text-h4 font-semibold">
          {t('playthrough.logManualSession')}
        </DialogTitle>

        <p className="-mt-2 mb-1 text-body-sm text-text-secondary">
          Log a play session that you forgot to track. Enter the exact start and end times.
        </p>

        <div className="flex flex-col gap-6">
          <DateTimePicker
            label="Start Date & Time"
            value={startDateTime}
            onChange={setStartDateTime}
            maxDateTime={dayjs()}
          />

          <DateTimePicker
            label="End Date & Time"
            value={endDateTime}
            onChange={setEndDateTime}
            maxDateTime={dayjs()}
          />

          {error && <p className="text-body-sm text-destructive">{error}</p>}

          {duration && (
            <p className="rounded-md bg-accent/10 p-4 text-body-sm font-semibold text-accent">
              Duration: {duration}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleClose} variant="outline" className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!startDateTime || !endDateTime || submitting} className="flex-1">
            {t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LogManualSessionDialog
