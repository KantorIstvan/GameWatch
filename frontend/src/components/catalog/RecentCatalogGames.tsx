import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import GameCard from '../GameCard'
import { useRecentCatalogGames } from '../../hooks/useRecentCatalogGames'

/**
 * The games the viewer last opened from the catalog.
 *
 * Covers rather than the text rows the search results use, and deliberately so: a search
 * result is being told apart from other games with similar names, which a title, year and
 * developer do better than artwork - but a game you opened yesterday is being recognised,
 * and nothing is faster to recognise than its cover.
 *
 * Each card can be removed. The list is a record of what someone was curious about, which
 * includes games they would rather not be reminded of, so leaving no way to take one down
 * would make opening a game page a small commitment.
 */
function RecentCatalogGames() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { games, forget, clear } = useRecentCatalogGames()

  if (games.length === 0) {
    return null
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-body font-semibold text-text-primary">{t('catalog.recent.title')}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={clear}
          className="text-text-secondary hover:text-accent"
        >
          {t('catalog.recent.clearAll')}
        </Button>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {games.map((game) => (
          <li key={game.externalId}>
            <GameCard
              // The catalog is addressed by IGDB id, which is the only id most of these
              // games have - nobody here has necessarily added them.
              game={{
                id: game.externalId,
                name: game.name,
                bannerImageUrl: game.bannerImageUrl,
                releaseDate: game.releaseDate,
              }}
              onClick={(externalId) => navigate(`/catalog/${externalId}`)}
              onDelete={forget}
              deleteLabel={t('catalog.recent.remove', { game: game.name })}
              alwaysShowDelete
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RecentCatalogGames
