import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Game } from '../types'

interface GameDetailsProps {
  game: Game
  t: any
}

function GameDetails({ game, t }: GameDetailsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        {game.releaseDate && (
          <div className="mb-4">
            <p className="text-body-sm font-semibold text-text-secondary">{t('game.released')}</p>
            <p className="text-body">{game.releaseDate}</p>
          </div>
        )}

        {game.rating && (
          <div className="mb-4">
            <p className="text-body-sm font-semibold text-text-secondary">{t('game.rating')}</p>
            <p className="text-body">
              {game.rating}/5 ⭐
              {(game.ratingsCount ?? 0) > 0 && ` - ${game.ratingsCount?.toLocaleString()} ${t('game.ratings')}`}
            </p>
          </div>
        )}

        {game.esrbRating && (
          <div className="mb-4">
            <p className="text-body-sm font-semibold text-text-secondary">{t('game.esrbRating')}</p>
            <p className="text-body">{game.esrbRating}</p>
          </div>
        )}

        {game.genres && (
          <div className="mb-4">
            <p className="mb-1 text-body-sm font-semibold text-text-secondary">{t('game.genres')}</p>
            <div className="flex flex-row flex-wrap gap-1.5">
              {game.genres.split(', ').filter((g: string) => g).map((genre: string, idx: number) => (
                <Badge key={idx} variant="outline">{genre}</Badge>
              ))}
            </div>
          </div>
        )}

        {game.tags && (
          <div className="mb-4">
            <p className="mb-1 text-body-sm font-semibold text-text-secondary">{t('game.tags')}</p>
            <div className="flex flex-row flex-wrap gap-1.5">
              {game.tags.split(', ').filter((t: string) => t).slice(0, 10).map((tag: string, idx: number) => (
                <Badge key={idx} variant="outline" className="border-accent/40 text-accent">{tag}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        {game.platforms && (
          <div className="mb-4">
            <p className="text-body-sm font-semibold text-text-secondary">{t('game.platforms')}</p>
            <p className="text-body">{game.platforms}</p>
          </div>
        )}

        {game.developers && (
          <div className="mb-4">
            <p className="text-body-sm font-semibold text-text-secondary">{t('game.developers')}</p>
            <p className="text-body">{game.developers}</p>
          </div>
        )}

        {game.publishers && (
          <div className="mb-4">
            <p className="text-body-sm font-semibold text-text-secondary">{t('game.publishers')}</p>
            <p className="text-body">{game.publishers}</p>
          </div>
        )}

        {game.website && (
          <div className="mb-4">
            <p className="text-body-sm font-semibold text-text-secondary">{t('game.officialWebsite')}</p>
            <p className="text-body">
              <a href={game.website} target="_blank" rel="noopener noreferrer" className="text-inherit underline">
                {t('game.visitWebsite')}
              </a>
            </p>
          </div>
        )}
      </div>

      {game.alternativeNames && (
        <div className="col-span-full">
          <Separator className="my-4" />
          <div className="mb-4">
            <p className="text-body-sm font-semibold text-text-secondary">{t('game.alsoKnownAs')}</p>
            <p className="text-body-sm text-text-secondary">{game.alternativeNames}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameDetails
