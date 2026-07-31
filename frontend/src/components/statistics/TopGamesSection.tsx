import { TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatTime } from '../../utils/formatters'

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
  const getChipColor = (rank: number) => {
    if (rank === 1) return '#FFD700'
    if (rank === 2) return '#C0C0C0'
    if (rank === 3) return '#CD7F32'
    return '#424242'
  }

  if (games.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
      <div className="mb-6 flex items-center">
        <TrendingUp className="mr-3 size-7 text-accent" />
        <p className="text-h3 font-bold">{title}</p>
      </div>
      <div className="flex justify-start gap-4 overflow-x-auto pb-2 md:justify-center">
        {games.map((game, index) => {
          const rank = index + 1

          return (
            <div
              key={game.gameId}
              className="relative w-50 max-w-50 shrink-0 overflow-hidden rounded-md bg-surface"
            >
              <div className="relative">
                <img
                  src={game.bannerImageUrl || '/placeholder-game.png'}
                  alt={game.gameName}
                  className="h-28 w-full object-cover"
                />
                <Badge
                  className="absolute left-2 top-2 font-bold"
                  style={{
                    backgroundColor: getChipColor(rank),
                    color: rank === 4 || rank === 5 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.87)',
                  }}
                >
                  {rank}#
                </Badge>
              </div>
              <div className="px-4 py-3">
                <p className="line-clamp-2 min-h-10.5 text-body font-bold leading-tight">
                  {game.gameName}
                </p>
                <p className="mt-1 block text-caption text-text-secondary">
                  {formatTime(game.playtimeSeconds)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TopGamesSection
