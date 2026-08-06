import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import Loading from '../components/Loading'
import GameDetails from '../components/GameDetails'
import GameRatingPanel from '../components/ratings/GameRatingPanel'
import GameReviewsPanel from '../components/ratings/GameReviewsPanel'
import GameCommunityPanel from '../components/ratings/GameCommunityPanel'
import WishlistButton from '../components/wishlist/WishlistButton'
import { useCatalogGame } from '../hooks/useCatalogGame'
import { rememberCatalogGame } from '../hooks/useRecentCatalogGames'
import { useWishlist } from '../hooks/useWishlist'
import { useTranslation } from 'react-i18next'
import { formatTime } from '../utils/formatters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * A game's own page: everything known about it, plus what everyone here thinks of it.
 *
 * Addressed by IGDB id rather than a row id, because the catalog searches all of IGDB and
 * most games reached from it have never been added by anyone. Those still get a full page
 * - the metadata comes from IGDB either way - and only the community panels are empty,
 * until the first person rates or reviews it and the row gets created.
 */
function CatalogGameDetail() {
  const { externalId } = useParams<{ externalId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { game, loading, error, gameId, ensureGameId } = useCatalogGame(Number(externalId))
  const { isWishlisted, toggle: toggleWishlist } = useWishlist()

  // Recorded once the game has actually loaded, so a mistyped or dead id never lands in the
  // catalog's recently-viewed row as a card nobody can open.
  useEffect(() => {
    if (!game) return
    rememberCatalogGame({
      externalId: game.externalId,
      name: game.name,
      bannerImageUrl: game.bannerImageUrl,
      releaseDate: game.releaseDate,
    })
  }, [game])

  if (loading) return <Loading />

  if (error || !game) {
    return (
      <div className="p-6">
        <p className="text-destructive">{t('catalog.failedToLoadGame')}</p>
      </div>
    )
  }

  const tags = [
    ...(game.genres?.split(',').map((g) => g.trim()).filter(Boolean) ?? []),
    ...(game.platforms?.split(',').map((p) => p.trim()).filter(Boolean) ?? []),
  ]

  return (
    <div className="mx-auto max-w-8xl">
      <div className="mb-6 flex flex-wrap items-center gap-4 md:mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/catalog')} className="mr-1">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-h2 font-bold">{game.name}</h1>
          <p className="mt-1 text-body-sm text-text-secondary">{t('catalog.gamePageSubtitle')}</p>
        </div>

        <WishlistButton
          wishlisted={isWishlisted(game.externalId)}
          onToggle={() => toggleWishlist(game.externalId)}
          size="icon"
        />
      </div>

      {/* The cover leads, with the facts beside it - this is the one place in the app
          showing a single game, so it can afford the artwork the search results cannot. */}
      <div className="mb-6 flex flex-col gap-6 md:mb-8 md:flex-row">
        {game.bannerImageUrl && (
          <img
            src={game.bannerImageUrl}
            alt={game.name}
            className="w-full shrink-0 rounded-xl border border-border object-cover shadow-2 md:w-64"
          />
        )}

        <div className="min-w-0 flex-1">
          {(tags.length > 0 || game.releaseDate) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {game.releaseDate && (
                <Badge variant="outline" className="font-medium">
                  {game.releaseDate.split('-')[0]}
                </Badge>
              )}
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="font-medium">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {game.averageCompletionSeconds != null && (
            <p className="mb-4 flex items-center gap-2 text-body-sm text-text-secondary">
              <Clock className="size-4 shrink-0" />
              {t('catalog.averageCompletion', {
                time: formatTime(game.averageCompletionSeconds),
              })}
            </p>
          )}

          {game.description && (
            <p className="max-w-3xl text-body text-text-secondary">{game.description}</p>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-surface p-4 sm:p-6 md:mb-8">
        <p className="mb-4 text-body-sm font-bold sm:text-body-lg">{t('game.aboutThisGame')}</p>
        <GameDetails game={game} t={t} />
      </div>

      {/* Rating and community stats are both short, fixed-height cards, so they pair up
          side by side on wider screens instead of wasting the row's width. Reviews grow
          without bound as a game accumulates them, so that panel gets its own full-width
          row below rather than being forced into the same grid. */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:gap-5 md:mb-8 lg:grid-cols-2">
        <GameRatingPanel gameId={gameId} ensureGameId={ensureGameId} />
        <GameCommunityPanel gameId={gameId} />
      </div>

      <GameReviewsPanel gameId={gameId} ensureGameId={ensureGameId} />
    </div>
  )
}

export default CatalogGameDetail
