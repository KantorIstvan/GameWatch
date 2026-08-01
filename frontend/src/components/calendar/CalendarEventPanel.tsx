import { useNavigate } from 'react-router-dom'
import { CircleCheck, CircleX, Play, Gamepad2, Clock, CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Playthrough } from '../../types'
import { formatPlaythroughType, getPlaythroughTypeColor } from '../../utils/playthroughUtils'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  backgroundColor: string
  borderColor: string
  extendedProps: {
    gameId: number
    playthroughType: string
    isCompleted: boolean
    isDropped: boolean
    durationSeconds: number
    originalId?: number
  }
}

interface CalendarEventPanelProps {
  event: CalendarEvent | null
  playthrough?: Playthrough
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatEventDate(dateString: string, locale: string) {
  return new Date(dateString).toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function CalendarEventPanel({ event, playthrough, open, onOpenChange }: CalendarEventPanelProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  if (!event) return null

  const { isCompleted, isDropped, durationSeconds, originalId } = event.extendedProps
  const playthroughId = originalId ?? Number(event.id)
  const bannerUrl = playthrough?.gameBannerImageUrl || playthrough?.bannerImageUrl
  const gradient = playthrough?.dominantColor1 && playthrough?.dominantColor2
    ? `linear-gradient(135deg, ${playthrough.dominantColor1} 0%, ${playthrough.dominantColor2} 100%)`
    : 'linear-gradient(135deg, var(--color-brand-start) 0%, var(--color-brand-end) 100%)'

  const statusLabel = isCompleted ? t('calendar.completed') : isDropped ? t('calendar.dropped') : t('calendar.started')
  const StatusIcon = isCompleted ? CircleCheck : isDropped ? CircleX : Play

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-sm">
        <div
          className="relative flex h-40 shrink-0 items-end overflow-hidden"
          style={{ background: gradient }}
        >
          {bannerUrl && (
            <img src={bannerUrl} alt={event.title} className="absolute inset-0 size-full object-cover" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          <SheetHeader className="relative z-10 w-full text-left">
            <Badge
              className="mb-2 w-fit gap-1 text-white"
              style={{ backgroundColor: event.borderColor }}
            >
              <StatusIcon className="size-3.5" />
              {statusLabel}
            </Badge>
            <SheetTitle className="text-h4 text-white">{event.title}</SheetTitle>
          </SheetHeader>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3">
            <CalendarDays className="size-5 shrink-0 text-accent" />
            <div>
              <p className="text-caption text-text-secondary">{event.title}</p>
              <p className="text-body-sm font-semibold text-text-primary">
                {formatEventDate(event.start, i18n.language)}
                {event.end && ` – ${formatEventDate(event.end, i18n.language)}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-surface/60 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-text-secondary">
                <Clock className="size-4" />
                <p className="text-caption">{t('calendar.duration')}</p>
              </div>
              <p className="text-body-sm font-semibold text-text-primary">{formatDuration(durationSeconds)}</p>
            </div>

            {playthrough && (
              <div className="rounded-lg border border-border bg-surface/60 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-text-secondary">
                  <Play className="size-4" />
                  <p className="text-caption">{t('playthrough.sessions')}</p>
                </div>
                <p className="text-body-sm font-semibold text-text-primary">{playthrough.sessionCount}</p>
              </div>
            )}

            {playthrough?.platform && (
              <div className="rounded-lg border border-border bg-surface/60 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-text-secondary">
                  <Gamepad2 className="size-4" />
                  <p className="text-caption">{t('playthrough.platform')}</p>
                </div>
                <p className="text-body-sm font-semibold text-text-primary">{playthrough.platform}</p>
              </div>
            )}

            <div className="rounded-lg border border-border bg-surface/60 p-3">
              <p className="mb-1 text-caption text-text-secondary">{t('playthrough.type')}</p>
              <Badge
                variant="outline"
                className="font-medium"
                style={{
                  color: getPlaythroughTypeColor(event.extendedProps.playthroughType),
                  borderColor: `${getPlaythroughTypeColor(event.extendedProps.playthroughType)}40`,
                }}
              >
                {formatPlaythroughType(event.extendedProps.playthroughType)}
              </Badge>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button onClick={() => navigate(`/playthrough/${playthroughId}`)} className="w-full">
            {t('calendar.viewFullDetails')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
