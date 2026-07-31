import { TrendingUp, CalendarDays, Timer } from 'lucide-react'
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
  longestToComplete?: SpecialGame
  fastestToComplete?: SpecialGame
  t: any
}

function SpecialGameCards({ favoriteGame, longestToComplete, fastestToComplete, t }: SpecialGameCardsProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
      {favoriteGame && (
        <div className="h-full rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center">
            <TrendingUp className="mr-2 size-5 text-amber-500" />
            <p className="text-h4 font-bold">{t('statistics.userStats.favoriteGame')}</p>
          </div>
          <GameRankingCard game={favoriteGame} rank={1} showDaysToComplete={false} t={t} />
        </div>
      )}

      {longestToComplete && (
        <div className="h-full rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center">
            <CalendarDays className="mr-2 size-5 text-blue-500" />
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
