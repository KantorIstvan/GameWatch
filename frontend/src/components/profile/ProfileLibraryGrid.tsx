import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Gamepad2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import GameCard from '../GameCard'
import { profilesApi } from '../../services/api'
import type { Game } from '../../types'

interface ProfileLibraryGridProps {
  handle: string
}

/**
 * Every game in a profile's library, not just the "Most Played" five the overview tab
 * summarizes.
 *
 * Loads on mount rather than with the profile, same reasoning as {@link FollowListPanel}:
 * most visits never open this tab, so the full list should not be part of the initial
 * profile fetch. Read-only - no delete action, and tiles open the catalog page rather than
 * the owner-only statistics page, since a viewer has no playthroughs of their own to see
 * there.
 */
function ProfileLibraryGrid({ handle }: ProfileLibraryGridProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true

    setLoading(true)
    setFailed(false)
    profilesApi
      .getLibrary(handle)
      .then((response) => {
        if (active) setGames(response.data)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [handle])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="aspect-3/4 rounded-xl bg-border" />
        ))}
      </div>
    )
  }

  if (failed) {
    return <p className="text-body-sm text-text-secondary">{t('profile.listUnavailable')}</p>
  }

  if (games.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
        <Gamepad2 className="mt-0.5 size-5 shrink-0 text-text-secondary" />
        <p className="text-body-sm text-text-secondary">{t('profile.libraryEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          onClick={game.externalId ? () => navigate(`/catalog/${game.externalId}`) : undefined}
        />
      ))}
    </div>
  )
}

export default ProfileLibraryGrid
