import { Trash2, Clock, Play, Gamepad2, Star, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Game } from '../types'
import { formatTimeHMS } from '../utils/formatters'
import { statColors } from '../lib/statColors'

interface GameCardProps {
  game: Game
  /** Omitted on the Catalog page - deleting only makes sense from your own library. */
  onDelete?: (id: number) => void
  /**
   * Accessible name for the overlay action, when it does something other than delete the
   * game - the catalog's recently-viewed row removes a card from a list, and a screen
   * reader announcing "delete" there would describe a far more destructive act.
   */
  deleteLabel?: string
  /**
   * Keeps the overlay action on screen instead of revealing it on hover.
   *
   * For rows where removing a card is a normal, expected action rather than a rare and
   * destructive one - hover is not a gesture a touch device has, so an action people are
   * meant to use routinely cannot be hidden behind it.
   */
  alwaysShowDelete?: boolean
  onClick?: (id: number) => void
}

/**
 * Vertical library tile: IGDB cover art on top, title and tracked data underneath.
 * Deliberately not the horizontal StopwatchCard shape - covers are portrait (3:4),
 * so a vertical tile shows them uncropped instead of squeezing them into a side strip.
 * Size is driven purely by the grid column count on the Games page, which is why there
 * is no scale prop here - the tile just fills its cell.
 *
 * Doubles as the Catalog page's tile: when `onDelete` is absent the personal
 * playthrough stats below are absent too (the catalog DTO never populates them), so this
 * component naturally renders as a plain community tile without a separate variant prop -
 * only the community rating badge, present exclusively on catalog games, is added back.
 */
function GameCard({
  game,
  onDelete,
  deleteLabel,
  alwaysShowDelete = false,
  onClick,
}: GameCardProps) {
  const { t } = useTranslation()

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
  const hasPlaytime = game.totalPlaytimeSeconds != null && game.totalPlaytimeSeconds > 0
  const hasSessions = (game.sessionCount ?? 0) > 0

  return (
    <div
      onClick={() => onClick?.(game.id)}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl bg-surface shadow-2 transition-all duration-300 ease-standard hover:-translate-y-1 hover:shadow-3',
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      <div className="relative aspect-3/4 w-full shrink-0 overflow-hidden bg-surface-raised">
        {game.bannerImageUrl ? (
          <img
            src={game.bannerImageUrl}
            alt={game.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 ease-standard group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-text-tertiary">
            <Gamepad2 className="size-10" />
          </div>
        )}

        {statusInfo && (
          <Badge variant={statusInfo.variant} className="absolute left-2 top-2 font-semibold">
            {statusInfo.label}
          </Badge>
        )}

        {game.communityRatingScore != null && (
          <Badge
            className="absolute left-2 top-2 gap-1 border-0 font-semibold text-white"
            style={{ backgroundColor: statColors.yellow }}
          >
            <Star className="size-3 fill-current" />
            {game.communityRatingScore.toFixed(1)}
          </Badge>
        )}

        {onDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={deleteLabel ?? t('common.delete')}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(game.id)
            }}
            className={cn(
              'absolute right-2 top-2 bg-black/70 text-white backdrop-blur-xs transition-all duration-150 ease-standard hover:bg-destructive hover:text-white focus-visible:opacity-100',
              alwaysShowDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            {alwaysShowDelete ? <X className="size-4" /> : <Trash2 className="size-4" />}
          </Button>
        )}
      </div>

      <div className="flex min-w-0 grow flex-col gap-1 p-3">
        <p className="line-clamp-2 text-body-sm font-semibold leading-tight text-text-primary">
          {game.name}
        </p>

        {(hasPlaytime || hasSessions || game.lastPlayedDate) && (
          <div className="mt-auto flex flex-col gap-0.5 pt-1">
            {hasPlaytime && (
              <div className="flex items-center gap-1">
                <Clock className="size-3 shrink-0 text-accent" />
                <span className="truncate text-caption font-semibold text-text-secondary">
                  {formatTimeHMS(game.totalPlaytimeSeconds ?? 0)}
                </span>
              </div>
            )}

            {hasSessions && (
              <div className="flex items-center gap-1">
                <Play className="size-3 shrink-0 text-text-tertiary" />
                <span className="truncate text-caption font-medium text-text-secondary">
                  {game.sessionCount} {game.sessionCount === 1 ? t('games.session') : t('games.sessions')}
                </span>
              </div>
            )}

            {game.lastPlayedDate && (
              <span className="truncate text-caption text-text-secondary">
                {t('games.lastPlayed')}: {game.lastPlayedDate}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default GameCard
