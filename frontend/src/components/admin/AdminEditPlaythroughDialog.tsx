import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { adminApi } from '../../services/api'
import { formatDuration } from '../../utils/formatters'
import type { Playthrough } from '../../types'

interface AdminEditPlaythroughDialogProps {
  userId: number
  /** Null closes the dialog - the same "no separate open flag" pattern as the row it's opened from. */
  playthrough: Playthrough | null
  onClose: () => void
  onSaved: () => void
}

type PlaythroughStatus = 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED'

interface FormState {
  title: string
  platform: string
  durationSeconds: string
  status: PlaythroughStatus
  startDate: string
  endDate: string
}

const statusOf = (playthrough: Playthrough): PlaythroughStatus => {
  if (playthrough.isCompleted) return 'COMPLETED'
  if (playthrough.isDropped) return 'DROPPED'
  return 'IN_PROGRESS'
}

const toFormState = (playthrough: Playthrough): FormState => ({
  title: playthrough.title ?? '',
  platform: playthrough.platform ?? '',
  durationSeconds: String(playthrough.durationSeconds ?? 0),
  status: statusOf(playthrough),
  startDate: playthrough.startDate ?? '',
  endDate: playthrough.endDate ?? '',
})

/**
 * An admin override, not the same form the owning user gets: none of the normal guards
 * (no shrinking duration, no editing while active) apply here, because fixing a stuck or
 * runaway playthrough is exactly the reason this exists. Status is deliberately a 3-way
 * choice rather than exposing isActive/isPaused directly - those are live-timer states
 * with bookkeeping (startedAt, sessionStartTime, pauseCount...) that only the owning
 * user's actual start/pause/resume actions keep consistent.
 */
function AdminEditPlaythroughDialog({ userId, playthrough, onClose, onSaved }: AdminEditPlaythroughDialogProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(playthrough ? toFormState(playthrough) : null)
  }, [playthrough])

  const availablePlatforms = playthrough?.gamePlatforms
    ? playthrough.gamePlatforms.split(',').map((p) => p.trim()).filter(Boolean)
    : []

  const handleSave = async () => {
    if (!playthrough || !form) return
    const durationSeconds = Number(form.durationSeconds)
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      toast.error(t('admin.users.playthroughs.invalidDuration'))
      return
    }

    setSaving(true)
    try {
      await adminApi.updatePlaythrough(userId, playthrough.id, {
        title: form.title.trim(),
        platform: form.platform,
        durationSeconds,
        isCompleted: form.status === 'COMPLETED',
        isDropped: form.status === 'DROPPED',
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      })
      toast.success(t('admin.users.playthroughs.saveSuccess'))
      onSaved()
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('admin.users.playthroughs.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={playthrough !== null} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.users.playthroughs.editTitle', { game: playthrough?.gameName ?? '' })}</DialogTitle>
        </DialogHeader>

        {form && (
          <div className="flex flex-col gap-4">
            {playthrough?.isActive && (
              <Alert variant="info">
                <TriangleAlert />
                <AlertDescription>{t('admin.users.playthroughs.activeWarning')}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="pt-title" className="mb-1 block text-body-sm font-semibold">
                {t('admin.users.playthroughs.fieldTitle')}
              </Label>
              <Input
                id="pt-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="pt-platform" className="mb-1 block text-body-sm font-semibold">
                {t('admin.users.playthroughs.fieldPlatform')}
              </Label>
              <Select
                value={form.platform}
                onValueChange={(value) => setForm({ ...form, platform: value })}
                disabled={availablePlatforms.length === 0}
              >
                <SelectTrigger id="pt-platform" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePlatforms.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availablePlatforms.length === 0 && (
                <p className="mt-1 text-caption text-text-secondary">
                  {t('admin.users.playthroughs.noPlatformsAvailable')}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="pt-duration" className="mb-1 block text-body-sm font-semibold">
                {t('admin.users.playthroughs.fieldDuration')}
              </Label>
              <Input
                id="pt-duration"
                type="number"
                min={0}
                value={form.durationSeconds}
                onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })}
              />
              <p className="mt-1 text-caption text-text-secondary">
                {formatDuration(Number(form.durationSeconds) || 0)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pt-start-date" className="mb-1 block text-body-sm font-semibold">
                  {t('admin.users.playthroughs.fieldStartDate')}
                </Label>
                <Input
                  id="pt-start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pt-end-date" className="mb-1 block text-body-sm font-semibold">
                  {t('admin.users.playthroughs.fieldEndDate')}
                </Label>
                <Input
                  id="pt-end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pt-status" className="mb-1 block text-body-sm font-semibold">
                {t('admin.users.playthroughs.fieldStatus')}
              </Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm({ ...form, status: value as PlaythroughStatus })}
              >
                <SelectTrigger id="pt-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_PROGRESS">{t('admin.users.playthroughs.statusInProgress')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('admin.users.playthroughs.statusCompleted')}</SelectItem>
                  <SelectItem value="DROPPED">{t('admin.users.playthroughs.statusDropped')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || !form}>
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AdminEditPlaythroughDialog
