import React from 'react'
import { Timer, CalendarDays } from 'lucide-react'
import { formatTime } from '../utils/formatters'
import { GameRanking } from '../types'

interface GameRankingCardProps {
  game: GameRanking
  rank: number
  showDaysToComplete?: boolean
  t?: (key: string, params?: any) => string
}

const GameRankingCard = React.memo(({ game, showDaysToComplete = false, t }: GameRankingCardProps) => {
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-accent/20 bg-linear-to-br from-accent/5 to-accent-hover/5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-3">
      <div className="relative h-45">
        <img
          src={game.bannerImageUrl || '/placeholder-game.png'}
          alt={game.gameName}
          className="size-full object-cover brightness-90"
        />
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-surface-raised/95 to-transparent p-4">
          <h3 className="line-clamp-2 text-h4 font-bold leading-tight">
            {game.gameName}
          </h3>
        </div>
      </div>
      <div className="px-5 pb-5 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-md border border-accent/20 bg-accent/10 px-3 py-1.5">
            <Timer className="size-4.5 text-accent" />
            <span className="text-body-sm font-semibold text-accent">
              {formatTime(game.playtimeSeconds)}
            </span>
          </div>
          {showDaysToComplete && game.daysToComplete !== undefined && t && (
            <div className="flex items-center gap-1.5 rounded-md border border-text-tertiary/20 bg-text-tertiary/10 px-3 py-1.5">
              <CalendarDays className="size-4.5 text-text-secondary" />
              <span className="text-body-sm font-semibold text-text-secondary">
                {t('statistics.userStats.daysToComplete', { days: game.daysToComplete })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

GameRankingCard.displayName = 'GameRankingCard'

export default GameRankingCard
