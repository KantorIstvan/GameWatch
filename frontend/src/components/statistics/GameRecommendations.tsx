import { Gamepad2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { GameRecommendation } from '../../types'

interface GameRecommendationsProps {
  recommendations: GameRecommendation[]
  title: string
  noDataMessage: string
  className?: string
}

function GameRecommendations({ recommendations, title, noDataMessage, className }: GameRecommendationsProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col justify-center rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl sm:p-6',
        className
      )}
    >
      <div className="mb-2 flex items-center">
        <Gamepad2 className="mr-2 size-5 text-accent" />
        <p className="text-h4 font-bold">{title}</p>
      </div>
      {recommendations.length > 0 ? (
        <div className="flex flex-col gap-3">
          {recommendations.map((game, index) => (
            <div
              key={game.externalId || index}
              className="flex items-center gap-3 rounded-md border border-accent/10 bg-accent/5 p-3 transition-all duration-200 hover:translate-x-1 hover:bg-accent/10"
            >
              <p className="min-w-7 text-h4 font-bold text-accent">#{index + 1}</p>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-semibold">{game.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {game.matchingDevelopers?.slice(0, 2).map((developer, idx) => (
                    <Badge
                      key={`dev-${idx}`}
                      className="h-4.5 bg-success/20 px-1.5 text-caption text-success"
                    >
                      {developer}
                    </Badge>
                  ))}
                  {game.matchingPublishers?.slice(0, 2).map((publisher, idx) => (
                    <Badge
                      key={`pub-${idx}`}
                      className="h-4.5 bg-accent/20 px-1.5 text-caption text-accent"
                    >
                      {publisher}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-65 items-center justify-center text-text-secondary">
          <p className="text-body-sm">{noDataMessage}</p>
        </div>
      )}
    </div>
  )
}

export default GameRecommendations
