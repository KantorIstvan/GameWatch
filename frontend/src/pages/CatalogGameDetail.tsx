import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { gamesApi } from '../services/api'
import Loading from '../components/Loading'
import GameRatingPanel from '../components/ratings/GameRatingPanel'
import GameReviewsPanel from '../components/ratings/GameReviewsPanel'
import GameCommunityPanel from '../components/ratings/GameCommunityPanel'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import type { Game } from '../types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * A game's own community page: what everyone who plays it, not just the caller, thinks
 * of it. This is what used to live at the bottom of GameStatistics (the personal
 * session/timer page for a library entry) - it moved here so it reads the same way
 * whether or not the viewer has the game in their own library, and so the library page
 * stays about the viewer's own play.
 */
function CatalogGameDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthReady && id) {
      fetchGame()
    }
  }, [isAuthReady, id])

  const fetchGame = async () => {
    try {
      setLoading(true)
      const response = await gamesApi.getCatalogById(Number(id))
      setGame(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.message || t('catalog.failedToLoadGame'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading />

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (!game) return null

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
        <div>
          <h1 className="text-h2 font-bold">{game.name}</h1>
          <p className="mt-1 text-body-sm text-text-secondary">{t('catalog.gamePageSubtitle')}</p>
        </div>
      </div>

      {(tags.length > 0 || game.releaseDate) && (
        <div className="mb-6 flex flex-wrap items-center gap-2 md:mb-8">
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

      {game.description && (
        <p className="mb-6 max-w-3xl text-body text-text-secondary md:mb-8">{game.description}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4 sm:gap-5">
          <GameRatingPanel gameId={game.id} />
          <GameCommunityPanel gameId={game.id} />
        </div>
        <GameReviewsPanel gameId={game.id} />
      </div>
    </div>
  )
}

export default CatalogGameDetail
