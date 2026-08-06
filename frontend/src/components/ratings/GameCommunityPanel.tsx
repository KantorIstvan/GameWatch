import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, Trophy, Gauge, CircleSlash, Lock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { communityApi } from '../../services/api'
import { formatTime } from '../../utils/formatters'
import { statColors } from '../../lib/statColors'
import type { GameCommunity } from '../../types'

interface GameCommunityPanelProps {
  /** Null for a game nobody here has played yet - see {@link useCatalogGame}. */
  gameId: number | null
}

/** In flight, resolved, or asked for and not answered. */
type CommunityStatus = 'loading' | 'ready' | 'unavailable'

/** Shared by the two states that stand in for figures, so the card keeps one shape. */
const PLACEHOLDER_BOX =
  'mt-3 flex min-h-32 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center'

/**
 * What this app's users have actually done with a game.
 *
 * The completion figures come from measured session time rather than self-reported
 * estimates, which is the one claim here that a site like HowLongToBeat cannot make.
 *
 * Read-only, so unlike the rating and review panels it never claims a catalog row. It
 * still renders for a game that has no row, no players or no answer from the server:
 * whether anyone here has played a game is itself the answer the reader came for, and a
 * card that disappears instead of saying so reads as the page being broken - and leaves
 * the rating card it is paired with orphaned in half a row.
 */
function GameCommunityPanel({ gameId }: GameCommunityPanelProps) {
  const { t } = useTranslation()
  const [stats, setStats] = useState<GameCommunity | null>(null)
  const [status, setStatus] = useState<CommunityStatus>(gameId === null ? 'ready' : 'loading')

  useEffect(() => {
    // No catalog row means no sessions behind it, so there is nothing to ask for - that is
    // an answered question, not a pending one.
    if (gameId === null) {
      setStats(null)
      setStatus('ready')
      return
    }

    let active = true
    setStatus('loading')
    communityApi
      .getCommunityStats(gameId)
      .then((response) => {
        if (!active) return
        setStats(response.data)
        setStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setStats(null)
        setStatus('unavailable')
      })

    return () => {
      active = false
    }
  }, [gameId])

  const rows = !stats
    ? []
    : ([
        stats.medianCompletionSeconds !== null && {
          icon: <Gauge className="size-4" />,
          label: t('community.medianCompletion'),
          value: formatTime(stats.medianCompletionSeconds),
        },
        stats.fastestCompletionSeconds !== null && {
          icon: <Trophy className="size-4" />,
          label: t('community.range'),
          value: `${formatTime(stats.fastestCompletionSeconds)} – ${formatTime(
            stats.slowestCompletionSeconds ?? 0
          )}`,
        },
        stats.dropRatePercentage !== null && {
          icon: <CircleSlash className="size-4" />,
          label: t('community.dropRate'),
          value: `${Math.round(stats.dropRatePercentage)}%`,
        },
        stats.medianSecondsBeforeDropping !== null && {
          icon: <CircleSlash className="size-4" />,
          label: t('community.medianBeforeDropping'),
          value: formatTime(stats.medianSecondsBeforeDropping),
        },
      ].filter(Boolean) as { icon: JSX.Element; label: string; value: string }[])

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4 sm:p-6">
      <p className="mb-1 text-body-sm font-bold sm:text-body-lg">{t('community.title')}</p>

      {status === 'loading' ? (
        <div className="mt-3 flex min-h-32 flex-1 flex-col gap-3" aria-busy="true">
          <Skeleton className="h-4 w-40 bg-border" />
          <Skeleton className="h-4 w-full bg-border" />
          <Skeleton className="h-4 w-full bg-border" />
          <Skeleton className="h-4 w-2/3 bg-border" />
        </div>
      ) : status === 'unavailable' ? (
        <div className={PLACEHOLDER_BOX}>
          <CircleSlash className="size-5 text-text-secondary" />
          <p className="text-caption text-text-secondary">{t('community.unavailable')}</p>
        </div>
      ) : !stats || stats.playerCount === 0 ? (
        /* Nobody here has started it yet, which is worth saying out loud - the reader came
           to find out exactly that. */
        <div className={PLACEHOLDER_BOX}>
          <Users className="size-5 text-text-secondary" />
          <p className="text-caption text-text-secondary">{t('community.noPlayersYet')}</p>
        </div>
      ) : (
        <>
          <p className="mb-4 flex items-center gap-2 text-caption text-text-secondary">
            <Users className="size-3" />
            {t('community.playerCount', { count: stats.playerCount })}
            {stats.finisherCount > 0 &&
              ` · ${t('community.finisherCount', { count: stats.finisherCount })}`}
          </p>

          {stats.hasEnoughDataToAggregate ? (
            <>
              <ul className="mb-4 flex flex-col gap-2">
                {rows.map((row) => (
                  <li key={row.label} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-body-sm text-text-secondary">
                      {row.icon}
                      {row.label}
                    </span>
                    <span className="text-body-sm font-semibold text-text-primary">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>

              {stats.typicalCompletionSeconds !== null &&
                stats.medianCompletionSeconds !== null && (
                  <p
                    className="rounded-lg p-3 text-caption"
                    style={{
                      color: statColors.aqua,
                      backgroundColor: `color-mix(in srgb, ${statColors.aqua} 10%, transparent)`,
                    }}
                  >
                    {t('community.vsTypical', {
                      measured: formatTime(stats.medianCompletionSeconds),
                      typical: formatTime(stats.typicalCompletionSeconds),
                    })}
                  </p>
                )}
            </>
          ) : (
            /* Below the threshold an "average" would just be one person's playtime with a
               label on it, readable by anyone who knows they own the game. */
            <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3">
              <Lock className="mt-0.5 size-4 shrink-0 text-text-secondary" />
              <p className="text-caption text-text-secondary">
                {t('community.notEnoughPlayers', { count: stats.minimumPlayersRequired })}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default GameCommunityPanel
