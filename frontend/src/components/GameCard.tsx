import { Trash2, Clock, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Game } from '../types'

interface GameCardProps {
  game: Game
  cardScale: number
  onDelete: (id: number) => void
  onClick?: (id: number) => void
}

function GameCard({ game, cardScale, onDelete, onClick }: GameCardProps) {
  const { t } = useTranslation()

  const formatPlaytime = (seconds: number | undefined): string => {
    if (!seconds) return '00:00:00'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const getStatusInfo = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'destructive' | 'secondary', label: string }> = {
      active: { variant: 'default', label: t('games.statusActive') },
      completed: { variant: 'default', label: t('games.statusCompleted') },
      dropped: { variant: 'destructive', label: t('games.statusDropped') },
      started: { variant: 'secondary', label: t('games.statusStarted') },
    }
    return statusConfig[status] || null
  }

  const statusInfo = game.status ? getStatusInfo(game.status) : null

  return (
    <div
      onClick={() => onClick?.(game.id)}
      className={cn(
        'group relative flex h-full flex-row overflow-hidden rounded-xl bg-surface shadow-2 transition-all duration-300 ease-standard hover:-translate-y-1 hover:shadow-3',
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
      style={{ minHeight: 132 * cardScale }}
    >
      {game.bannerImageUrl && (
        <div className="relative w-2/5 shrink-0 self-stretch overflow-hidden">
          <img
            src={game.bannerImageUrl}
            alt={game.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {statusInfo && (
            <Badge
              variant={statusInfo.variant}
              className="absolute font-semibold"
              style={{ top: 6 * cardScale, left: 6 * cardScale, fontSize: `${0.7 * cardScale}rem` }}
            >
              {statusInfo.label}
            </Badge>
          )}
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        aria-label={t('common.delete', 'Delete')}
        onClick={(e) => {
          e.stopPropagation()
          onDelete(game.id)
        }}
        className="absolute bg-black/70 text-white opacity-0 backdrop-blur-xs transition-all duration-200 hover:scale-110 hover:bg-destructive hover:text-white group-hover:opacity-100"
        style={{ top: 8 * cardScale, right: 8 * cardScale }}
      >
        <Trash2 className="size-4" />
      </Button>

      <div
        className="flex min-w-0 grow flex-col justify-between bg-linear-to-b from-white/5 to-transparent"
        style={{ paddingTop: 12 * cardScale, paddingBottom: 12 * cardScale, paddingLeft: 16 * cardScale, paddingRight: 16 * cardScale }}
      >
        <div>
          {!game.bannerImageUrl && statusInfo && (
            <Badge
              variant={statusInfo.variant}
              className="mb-2 font-semibold"
              style={{ fontSize: `${0.7 * cardScale}rem` }}
            >
              {statusInfo.label}
            </Badge>
          )}

          <p
            className="line-clamp-2 font-bold leading-tight tracking-wide"
            style={{ fontSize: `${1 * cardScale}rem`, marginBottom: 6 * cardScale }}
          >
            {game.name}
          </p>

          <div className="mb-1 flex flex-col gap-1">
            {game.totalPlaytimeSeconds != null && game.totalPlaytimeSeconds > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="shrink-0 text-accent/70" style={{ width: `${0.9 * cardScale}rem`, height: `${0.9 * cardScale}rem` }} />
                <span
                  className="truncate font-semibold tracking-wide text-text-secondary"
                  style={{ fontSize: `${0.75 * cardScale}rem` }}
                >
                  {formatPlaytime(game.totalPlaytimeSeconds)}
                </span>
              </div>
            )}

            {(game.sessionCount ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <Play className="shrink-0 text-text-tertiary/70" style={{ width: `${0.9 * cardScale}rem`, height: `${0.9 * cardScale}rem` }} />
                <span
                  className="truncate font-semibold tracking-wide text-text-secondary"
                  style={{ fontSize: `${0.75 * cardScale}rem` }}
                >
                  {game.sessionCount} {game.sessionCount === 1 ? t('games.session') : t('games.sessions')}
                </span>
              </div>
            )}
          </div>
        </div>

        {game.lastPlayedDate && (
          <div className="flex items-center gap-1">
            <span
              className="shrink-0 rounded-full bg-accent/70"
              style={{ width: 4 * cardScale, height: 4 * cardScale }}
            />
            <span
              className="truncate font-medium tracking-wide text-text-secondary"
              style={{ fontSize: `${0.75 * cardScale}rem` }}
            >
              {t('games.lastPlayed')}: {game.lastPlayedDate}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default GameCard
