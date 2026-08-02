import { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface GameBannerCardGame {
  gameName: string
  bannerImageUrl?: string
}

type GameBannerCardSize = 'hero' | 'large' | 'medium' | 'small'

interface GameBannerCardProps {
  game: GameBannerCardGame
  size: GameBannerCardSize
  rank?: number
  label?: string
  labelIcon?: ReactNode
  metric?: ReactNode
  badges?: string[]
  className?: string
}

const sizeStyles: Record<GameBannerCardSize, { root: string; name: string; metric: string }> = {
  hero: {
    root: 'min-h-72 p-6 sm:p-8',
    name: 'text-h2 font-bold',
    metric: 'text-body-lg font-semibold',
  },
  large: {
    root: 'min-h-40 p-5 sm:p-6',
    name: 'text-h3 font-bold',
    metric: 'text-body font-semibold',
  },
  medium: {
    root: 'min-h-56 p-5 sm:p-6',
    name: 'text-h4 font-bold',
    metric: 'text-body-sm font-semibold',
  },
  small: {
    root: 'min-h-32 p-3 sm:p-4',
    name: 'text-body-sm font-bold sm:text-body',
    metric: 'text-caption font-semibold',
  },
}

function GameBannerCard({ game, size, rank, label, labelIcon, metric, badges, className }: GameBannerCardProps) {
  const styles = sizeStyles[size]

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-border bg-surface-raised shadow-2', styles.root, className)}>
      <img
        src={game.bannerImageUrl || '/placeholder-game.png'}
        alt=""
        className="absolute inset-0 size-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-linear-to-t from-surface-raised via-surface-raised/55 to-transparent" />

      <div className="relative flex h-full flex-col justify-end">
        {rank !== undefined && (
          <Badge variant="secondary" className="absolute top-0 left-0 font-bold">
            {`#${rank}`}
          </Badge>
        )}

        {label && (
          <div className="mb-1 flex items-center gap-1.5 text-caption font-medium text-text-secondary">
            {labelIcon}
            <span>{label}</span>
          </div>
        )}

        <p className={cn('line-clamp-2 leading-tight text-text-primary', styles.name)}>
          {game.gameName}
        </p>

        {metric && (
          <p className={cn('mt-1 text-text-secondary', styles.metric)}>
            {metric}
          </p>
        )}

        {badges && badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <Badge key={badge} variant="outline" className="bg-surface-raised/80 text-caption font-medium">
                {badge}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default GameBannerCard
