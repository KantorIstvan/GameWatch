import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Playthrough, getPlatformColor } from '../types'
import { formatTimeHMS, formatDate, formatPlaythroughType, getPlaythroughTypeColor } from '../utils/formatters'
import { useSessionTimer } from '../contexts/SessionTimerContext'

interface StopwatchCardProps {
  playthrough: Playthrough
  /**
   * Renders the wide, single-column layout used by the Timers page for playthroughs with
   * an open session. A running session needs two stacked readouts (session + total), which
   * makes the card taller than its neighbours - inside the grid that stretched the whole
   * row and distorted every cover in it. Pulled out above the grid instead, it can be as
   * tall as it needs to be without dragging the other cards with it.
   */
  featured?: boolean
  onUpdate?: () => void
  onDelete?: (id: number) => void
}

function StopwatchCard({ playthrough, featured = false }: StopwatchCardProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const sessionTimer = useSessionTimer()
  const [localPlaythrough, setLocalPlaythrough] = useState<Playthrough>(playthrough)
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const hasOpenSession = Boolean(localPlaythrough.isActive || localPlaythrough.isPaused)

  const currentSessionTime = hasOpenSession && localPlaythrough.sessionStartTime
    ? sessionTimer.getSessionTime(
        localPlaythrough.id,
        (localPlaythrough.durationSeconds || 0) - (localPlaythrough.sessionStartDurationSeconds || 0),
        localPlaythrough.startedAt || null,
        localPlaythrough.isActive
      )
    : 0

  useEffect(() => {
    setLocalPlaythrough(playthrough)
    setElapsedTime(playthrough.durationSeconds || 0)
  }, [playthrough])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (localPlaythrough.isActive) {
      intervalRef.current = setInterval(() => {
        setLocalPlaythrough(prev => ({ ...prev }))
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [localPlaythrough.isActive, localPlaythrough.id])

  const handleCardClick = useCallback(() => {
    navigate(`/playthrough/${localPlaythrough.id}`)
  }, [navigate, localPlaythrough.id])

  const playthroughColor = useMemo(
    () => getPlaythroughTypeColor(localPlaythrough.playthroughType),
    [localPlaythrough.playthroughType]
  )

  const formattedTime = useMemo(() => formatTimeHMS(elapsedTime), [elapsedTime])
  const formattedDate = useMemo(() => formatDate(localPlaythrough.startDate), [localPlaythrough.startDate])
  const formattedType = useMemo(() => formatPlaythroughType(localPlaythrough.playthroughType), [localPlaythrough.playthroughType])

  const dates = (formattedDate || localPlaythrough.endDate) ? (
    <div className={cn(featured ? 'text-left' : 'mt-3 text-center')}>
      {formattedDate && (
        <p className="block text-caption text-text-secondary opacity-70">
          {t('playthrough.started')}: {formattedDate}
        </p>
      )}
      {localPlaythrough.endDate && (
        <p className="block text-caption text-text-secondary opacity-70">
          {localPlaythrough.isDropped ? t('playthrough.dropped') : t('playthrough.ended')}: {formatDate(localPlaythrough.endDate)}
        </p>
      )}
    </div>
  ) : null

  const details = (
    <div className="min-w-0 flex-1">
      <p className={cn('mb-1 truncate font-semibold text-text-primary', featured ? 'text-h3' : 'text-h4')}>
        {localPlaythrough.gameName}
      </p>

      {localPlaythrough.title && (
        <p className="mb-3 truncate text-body-sm italic text-text-secondary">
          {localPlaythrough.title}
        </p>
      )}

      <div className={cn('flex flex-row flex-wrap gap-2', featured ? 'mb-3' : 'mb-4')}>
        <Badge className="h-6 text-caption font-semibold text-white" style={{ backgroundColor: playthroughColor }}>
          {formattedType}
        </Badge>
        {localPlaythrough.platform && (
          <Badge className="h-6 text-caption font-semibold text-white" style={{ backgroundColor: getPlatformColor(localPlaythrough.platform) }}>
            {localPlaythrough.platform}
          </Badge>
        )}
        {localPlaythrough.isCompleted && (
          <Badge className="h-6 bg-text-primary text-caption font-semibold text-bg">
            {t('playthrough.completed')}
          </Badge>
        )}
        {localPlaythrough.isDropped && (
          <Badge variant="destructive" className="h-6 text-caption font-semibold">
            {t('playthrough.dropped')}
          </Badge>
        )}
        {localPlaythrough.isActive && (
          <Badge className="h-6 gap-1.5 bg-text-primary/10 text-caption font-semibold text-text-primary">
            <span className="size-2 animate-pulse rounded-full bg-current" />
            {t('playthrough.active')}
          </Badge>
        )}
        {localPlaythrough.isPaused && (
          <Badge className="h-6 bg-text-secondary/15 text-caption font-semibold text-text-secondary">
            {t('playthrough.paused')}
          </Badge>
        )}
      </div>

      {featured && dates}
    </div>
  )

  const timer = (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border p-4',
        featured ? 'w-full shrink-0 sm:w-72' : 'mt-auto'
      )}
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${playthroughColor} 5%, transparent) 0%, color-mix(in srgb, ${playthroughColor} 2%, transparent) 100%)`,
        borderColor: `color-mix(in srgb, ${playthroughColor} 10%, transparent)`,
      }}
    >
      {hasOpenSession ? (
        <div className="flex flex-col gap-2">
          <div>
            <p className="mb-1 text-center text-caption uppercase tracking-wide opacity-70">
              {t('playthrough.currentSession')}
            </p>
            <p
              className={cn('truncate text-center font-mono font-bold tracking-wide', featured ? 'text-h2' : 'text-h3')}
              style={{ color: playthroughColor }}
            >
              {formatTimeHMS(currentSessionTime)}
            </p>
          </div>

          <div className="opacity-60">
            <p className="mb-0.5 text-center text-caption uppercase tracking-wide">
              {t('playthrough.total')}
            </p>
            <p className="truncate text-center font-mono text-body-sm font-semibold tracking-wide">
              {formatTimeHMS(elapsedTime)}
            </p>
          </div>
        </div>
      ) : (
        <p
          className="truncate text-center font-mono text-h3 font-bold tracking-wide"
          style={{ color: playthroughColor }}
        >
          {formattedTime}
        </p>
      )}

      {localPlaythrough.isActive && (
        <div
          className="animate-progress-slide absolute inset-x-0 bottom-0 h-0.5"
          style={{ background: playthroughColor }}
        />
      )}
    </div>
  )

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'group relative flex cursor-pointer overflow-hidden rounded-xl border border-border/10 bg-surface transition-all duration-300 ease-standard hover:shadow-3',
        featured
          ? 'flex-col hover:-translate-y-1 sm:flex-row'
          : 'h-full flex-row hover:-translate-y-2'
      )}
    >
      <div
        className="absolute inset-x-0 top-0 z-10 h-1"
        style={{ background: `linear-gradient(90deg, ${playthroughColor} 0%, color-mix(in srgb, ${playthroughColor} 60%, transparent) 100%)` }}
      />

      {localPlaythrough.gameBannerImageUrl && (
        <div
          className={cn(
            'relative shrink-0 overflow-hidden',
            featured ? 'h-36 w-full sm:h-auto sm:w-56' : 'w-28 self-stretch sm:w-36'
          )}
        >
          <img
            src={localPlaythrough.gameBannerImageUrl}
            alt={localPlaythrough.gameName}
            className="size-full object-cover transition-transform duration-300 ease-standard group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
        </div>
      )}

      <div
        className={cn(
          'flex min-w-0 grow',
          featured
            ? 'flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6'
            : 'flex-col p-4 sm:p-5'
        )}
      >
        {details}
        {timer}
        {!featured && dates}
      </div>
    </div>
  )
}

export default memo(StopwatchCard)
