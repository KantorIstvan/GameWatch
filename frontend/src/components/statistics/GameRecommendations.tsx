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

/**
 * Companies to credit under a recommendation, developers first. The backend already
 * removes duplicates within each list and never repeats a studio as both developer and
 * publisher, but a game can still legitimately have several of each - and four badges
 * under a one-line title reads as noise, so the row is capped.
 */
const MAX_COMPANY_BADGES = 3

function companyBadges(game: GameRecommendation) {
  const developers = game.matchingDevelopers ?? []
  const publishers = (game.matchingPublishers ?? []).filter(p => !developers.includes(p))

  return [
    ...developers.map(name => ({ name, isDeveloper: true })),
    ...publishers.map(name => ({ name, isDeveloper: false })),
  ].slice(0, MAX_COMPANY_BADGES)
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
                  {companyBadges(game).map(({ name, isDeveloper }) => (
                    <Badge
                      key={name}
                      className={cn(
                        'h-4.5 px-1.5 text-caption',
                        isDeveloper ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'
                      )}
                    >
                      {name}
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
