import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Playthrough, getPlatformColor } from '../types'
import { formatTimeHMS, formatDate, formatPlaythroughType, getPlaythroughTypeColor } from '../utils/formatters'
import { useSessionTimer } from '../contexts/SessionTimerContext'

interface StopwatchCardProps {
  playthrough: Playthrough
  onUpdate?: () => void
  onDelete?: (id: number) => void
}

function StopwatchCard({ playthrough }: StopwatchCardProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const sessionTimer = useSessionTimer()
  const [localPlaythrough, setLocalPlaythrough] = useState<Playthrough>(playthrough)
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const currentSessionTime = (localPlaythrough.isActive || localPlaythrough.isPaused) && localPlaythrough.sessionStartTime
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

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border/10 bg-surface transition-all duration-300 ease-standard hover:-translate-y-2 hover:shadow-3"
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${playthroughColor} 0%, color-mix(in srgb, ${playthroughColor} 60%, transparent) 100%)` }}
      />

      {localPlaythrough.gameBannerImageUrl && (
        <div className="relative h-35 overflow-hidden">
          <img
            src={localPlaythrough.gameBannerImageUrl}
            alt={localPlaythrough.gameName}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/0 to-black/70" />
        </div>
      )}

      <div className="flex grow flex-col p-6">
        <p className="mb-1 truncate text-h4 font-semibold text-text-primary">
          {localPlaythrough.gameName}
        </p>

        {localPlaythrough.title && (
          <p className="mb-4 truncate text-body-sm italic text-text-secondary">
            {localPlaythrough.title}
          </p>
        )}

        <div className="mb-6 flex flex-row flex-wrap gap-2">
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

        <div
          className="relative mt-auto overflow-hidden rounded-md border p-5"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${playthroughColor} 5%, transparent) 0%, color-mix(in srgb, ${playthroughColor} 2%, transparent) 100%)`,
            borderColor: `color-mix(in srgb, ${playthroughColor} 10%, transparent)`,
          }}
        >
          {localPlaythrough.isActive || localPlaythrough.isPaused ? (
            <div className="flex flex-col gap-2">
              <div>
                <p className="mb-1 text-center text-[0.65rem] uppercase tracking-wide opacity-70">
                  Current Session
                </p>
                <p
                  className="text-center font-mono text-h2 font-bold tracking-wide"
                  style={{ color: playthroughColor }}
                >
                  {formatTimeHMS(currentSessionTime)}
                </p>
              </div>

              <div className="opacity-60">
                <p className="mb-0.5 text-center text-[0.6rem] uppercase tracking-wide">
                  Total
                </p>
                <p className="text-center font-mono text-body-sm font-semibold tracking-wide">
                  {formatTimeHMS(elapsedTime)}
                </p>
              </div>
            </div>
          ) : (
            <p
              className="text-center font-mono text-h2 font-bold tracking-wide"
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

        {(formattedDate || localPlaythrough.endDate) && (
          <div className="mt-4 text-center">
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
        )}
      </div>
    </div>
  )
}

export default memo(StopwatchCard)
