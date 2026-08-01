import { TrendingUp, CalendarDays, Timer, Hourglass } from 'lucide-react'
import GameBannerCard from './GameBannerCard'
import StatCard from '../StatCard'
import { statColors, statForegrounds } from '../../lib/statColors'
import { formatTime } from '../../utils/formatters'

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
    <div className="mb-8 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
      {favoriteGame && (
        <GameBannerCard
          game={favoriteGame}
          size="medium"
          label={t('statistics.userStats.favoriteGame')}
          labelIcon={<TrendingUp className="size-4" />}
          metric={formatTime(favoriteGame.playtimeSeconds)}
        />
      )}

      {!!longestSessionSeconds && (
        <StatCard
          title={t('statistics.userStats.longestSession')}
          value={formatDuration(longestSessionSeconds)}
          icon={<Hourglass className="size-5" />}
          color={statColors.aqua}
          foreground={statForegrounds.aqua}
          className="min-h-56"
        />
      )}

      {longestToComplete && (
        <GameBannerCard
          game={longestToComplete}
          size="medium"
          label={t('statistics.userStats.longestToComplete')}
          labelIcon={<CalendarDays className="size-4" />}
          metric={longestToComplete.daysToComplete !== undefined
            ? t('statistics.userStats.daysToComplete', { days: longestToComplete.daysToComplete })
            : undefined}
        />
      )}

      {fastestToComplete && (
        <GameBannerCard
          game={fastestToComplete}
          size="medium"
          label={t('statistics.userStats.fastestCompletion')}
          labelIcon={<Timer className="size-4" />}
          metric={fastestToComplete.daysToComplete !== undefined
            ? t('statistics.userStats.daysToComplete', { days: fastestToComplete.daysToComplete })
            : undefined}
        />
      )}
    </div>
  )
}

export default SpecialGameCards
