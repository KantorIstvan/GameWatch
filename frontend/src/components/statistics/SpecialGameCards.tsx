import { TrendingUp, CalendarDays, Timer, Hourglass } from 'lucide-react'
import GameRankingCard from '../GameRankingCard'

interface SpecialGame {
  gameId: number
  gameName: string
  playtimeSeconds: number
  daysToComplete?: number
  bannerImageUrl?: string
}

interface SpecialGameCardsProps {
  favoriteGame?: SpecialGame
  longestSessionSeconds?: number
  longestToComplete?: SpecialGame
  fastestToComplete?: SpecialGame
  formatDuration: (seconds: number) => string
  t: any
}

function SpecialGameCards({ favoriteGame, longestSessionSeconds, longestToComplete, fastestToComplete, formatDuration, t }: SpecialGameCardsProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {favoriteGame && (
        <div className="h-full rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center">
            <TrendingUp className="mr-2 size-5 text-accent" />
            <p className="text-h4 font-bold">{t('statistics.userStats.favoriteGame')}</p>
          </div>
          <GameRankingCard game={favoriteGame} rank={1} showDaysToComplete={false} t={t} />
        </div>
      )}

      {!!longestSessionSeconds && (
        <div className="h-full rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center">
            <Hourglass className="mr-2 size-5 text-success" />
            <p className="text-h4 font-bold">{t('statistics.userStats.longestSession')}</p>
          </div>
          <p className="text-h2 font-bold text-text-primary">{formatDuration(longestSessionSeconds)}</p>
        </div>
      )}

      {longestToComplete && (
        <div className="h-full rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center">
            <CalendarDays className="mr-2 size-5 text-warning" />
            <p className="text-h4 font-bold">{t('statistics.userStats.longestToComplete')}</p>
          </div>
          <GameRankingCard game={longestToComplete} rank={1} showDaysToComplete t={t} />
        </div>
      )}

      {fastestToComplete && (
        <div className="h-full rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center">
            <Timer className="mr-2 size-5 text-success" />
            <p className="text-h4 font-bold">{t('statistics.userStats.fastestCompletion')}</p>
          </div>
          <GameRankingCard game={fastestToComplete} rank={1} showDaysToComplete t={t} />
        </div>
      )}
    </div>
  )
}

export default SpecialGameCards
