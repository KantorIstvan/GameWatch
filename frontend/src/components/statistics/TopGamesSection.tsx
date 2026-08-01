import { TrendingUp } from 'lucide-react'
import { formatTime } from '../../utils/formatters'
import GameBannerCard from './GameBannerCard'

interface TopGame {
  gameId: number
  gameName: string
  playtimeSeconds: number
  bannerImageUrl?: string
}

interface TopGamesSectionProps {
  games: TopGame[]
  title: string
}

function TopGamesSection({ games, title }: TopGamesSectionProps) {
  if (games.length === 0) return null

  const [first, second, ...rest] = games

  return (
    <div className="rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
      <div className="mb-6 flex items-center">
        <TrendingUp className="mr-3 size-7 text-accent" />
        <p className="text-h3 font-bold">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-6">
        <GameBannerCard
          game={first}
          rank={1}
          size="hero"
          className="col-span-2 row-span-2 md:col-span-3"
          metric={formatTime(first.playtimeSeconds)}
        />
        {second && (
          <GameBannerCard
            game={second}
            rank={2}
            size="large"
            className="col-span-2 md:col-span-3"
          />
        )}
        {rest.map((game, index) => (
          <GameBannerCard
            key={game.gameId}
            game={game}
            rank={index + 3}
            size="small"
          />
        ))}
      </div>
    </div>
  )
}

export default TopGamesSection
