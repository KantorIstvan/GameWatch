import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import { timeToBeatApi } from '../../services/api'
import { formatDurationWords } from '../../utils/formatters'
import type { GameTimeToBeat, TimeToBeatCategory } from '../../types'

interface GameTimeToBeatSectionProps {
  /** Null for a game nobody here has played yet - see {@link useCatalogGame}. */
  gameId: number | null
}

const EMPTY_CATEGORY: TimeToBeatCategory = {
  averageSeconds: null,
  sampleSize: 0,
  playerCount: 0,
  hasEnoughData: false,
  minimumPlayersRequired: 5,
}

/**
 * The community's own measured time to beat, broken out by Story / 100% / Speedrun.
 *
 * This replaces IGDB's single self-reported average with the mean of this app's own
 * users' measured playthroughs of each type - the one claim here that a site quoting a
 * single crowd-sourced estimate cannot make. Each category withholds its average until
 * enough distinct players have logged one, the same anonymity floor the community panel
 * below uses for its own aggregates.
 */
function GameTimeToBeatSection({ gameId }: GameTimeToBeatSectionProps) {
  const { t } = useTranslation()
  const [stats, setStats] = useState<GameTimeToBeat | null>(null)

  useEffect(() => {
    if (gameId === null) {
      setStats(null)
      return
    }
    timeToBeatApi
      .getTimeToBeat(gameId)
      .then((response) => setStats(response.data))
      .catch(() => setStats(null))
  }, [gameId])

  const categories: { key: string; label: string; category: TimeToBeatCategory }[] = [
    { key: 'story', label: t('playthrough.typeStory'), category: stats?.story ?? EMPTY_CATEGORY },
    { key: 'hundredPercent', label: t('playthrough.type100'), category: stats?.hundredPercent ?? EMPTY_CATEGORY },
    { key: 'speedrun', label: t('playthrough.typeSpeedrun'), category: stats?.speedrun ?? EMPTY_CATEGORY },
  ]

  return (
    <div className="mt-4">
      <p className="mb-1 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-text-secondary">
        <Clock className="size-3.5" />
        {t('timeToBeat.title')}
      </p>
      <p className="mb-2 text-caption text-text-tertiary">{t('timeToBeat.subtitle')}</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {categories.map(({ key, label, category }) => (
          <div key={key} className="rounded-lg border border-border bg-surface p-3">
            <p className="text-caption font-medium text-text-secondary">{label}</p>
            {category.hasEnoughData && category.averageSeconds != null ? (
              <>
                <p className="text-body-sm font-semibold text-text-primary">
                  {formatDurationWords(category.averageSeconds, t)}
                </p>
                <p className="text-caption text-text-tertiary">
                  {t('timeToBeat.sampleSize', { count: category.sampleSize })}
                </p>
              </>
            ) : (
              <p className="text-caption text-text-secondary">
                {category.sampleSize > 0
                  ? t('timeToBeat.notEnoughPlayers', { count: category.minimumPlayersRequired })
                  : t('timeToBeat.noneLogged')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default GameTimeToBeatSection
