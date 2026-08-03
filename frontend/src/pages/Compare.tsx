import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trophy } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { profilesApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import { formatTime } from '../utils/formatters'
import { statColors } from '../lib/statColors'
import type { ProfileComparison } from '../types'

/**
 * Two libraries side by side.
 *
 * Adds no access of its own - it is gated on exactly the visibility a profile is, and
 * rearranges what that profile already shows into a form readable against your own.
 */
function Compare() {
  const { handle } = useParams<{ handle: string }>()
  const { t } = useTranslation()
  const { isAuthReady } = useAuthContext()
  const [comparison, setComparison] = useState<ProfileComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (!isAuthReady || !handle) return

    setLoading(true)
    setUnavailable(false)
    profilesApi
      .compare(handle)
      .then((response) => setComparison(response.data))
      .catch(() => setUnavailable(true))
      .finally(() => setLoading(false))
  }, [handle, isAuthReady])

  if (loading) {
    return <Skeleton className="h-60 w-full bg-border" />
  }

  if (unavailable || !comparison) {
    return (
      <Alert variant="info">
        <AlertDescription>{t('compare.unavailable')}</AlertDescription>
      </Alert>
    )
  }

  const rows: { label: string; you: string; them: string; youLead: boolean }[] = [
    {
      label: t('compare.totalPlaytime'),
      you: formatTime(comparison.you.totalPlaytimeSeconds),
      them: formatTime(comparison.them.totalPlaytimeSeconds),
      youLead: comparison.you.totalPlaytimeSeconds >= comparison.them.totalPlaytimeSeconds,
    },
    {
      label: t('compare.gamesInLibrary'),
      you: String(comparison.you.gamesInLibrary),
      them: String(comparison.them.gamesInLibrary),
      youLead: comparison.you.gamesInLibrary >= comparison.them.gamesInLibrary,
    },
    {
      label: t('compare.gamesCompleted'),
      you: String(comparison.you.gamesCompleted),
      them: String(comparison.them.gamesCompleted),
      youLead: comparison.you.gamesCompleted >= comparison.them.gamesCompleted,
    },
    {
      label: t('compare.totalSessions'),
      you: String(comparison.you.totalSessions),
      them: String(comparison.them.totalSessions),
      youLead: comparison.you.totalSessions >= comparison.them.totalSessions,
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-h2 font-bold">{t('compare.title')}</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:gap-5">
        {[comparison.you, comparison.them].map((side, index) => (
          <div
            key={side.handle ?? index}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl"
          >
            <Avatar className="size-12 shrink-0">
              <AvatarImage src={side.profilePictureUrl ?? undefined} alt="" />
              <AvatarFallback>{(side.handle ?? '?').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-body-sm font-semibold">
                {index === 0 ? t('compare.you') : side.displayName ?? side.handle}
              </p>
              <p className="truncate text-caption text-text-secondary">@{side.handle}</p>
            </div>
          </div>
        ))}
      </div>

      <ul className="mb-8 flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.label} className="rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-xl">
            <p className="mb-1 text-caption text-text-secondary">{row.label}</p>
            <div className="grid grid-cols-2 gap-4">
              <span
                className="text-body-sm font-semibold"
                style={{ color: row.youLead ? statColors.green : undefined }}
              >
                {row.you}
              </span>
              <span
                className="text-body-sm font-semibold"
                style={{ color: !row.youLead ? statColors.green : undefined }}
              >
                {row.them}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mb-3 text-body-lg font-bold">
        {t('compare.sharedGames', { count: comparison.sharedGameCount })}
      </p>

      {comparison.sharedGames.length === 0 ? (
        <p className="text-body-sm text-text-secondary">{t('compare.noSharedGames')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comparison.sharedGames.map((game) => {
            const total = Math.max(1, game.yourSeconds + game.theirSeconds)
            return (
              <li
                key={game.gameId}
                className="rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-xl"
              >
                <div className="mb-2 flex items-center gap-3">
                  {game.bannerImageUrl && (
                    <img
                      src={game.bannerImageUrl}
                      alt=""
                      className="h-10 w-16 shrink-0 rounded-md object-cover"
                      loading="lazy"
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                    {game.gameName}
                  </span>
                </div>

                {/* One bar split between the two, so the ratio reads without arithmetic. */}
                <div className="mb-1 flex h-2 w-full overflow-hidden rounded-full bg-border/30">
                  <div
                    className="h-full"
                    style={{
                      width: `${(game.yourSeconds / total) * 100}%`,
                      backgroundColor: statColors.blue,
                    }}
                  />
                  <div
                    className="h-full"
                    style={{
                      width: `${(game.theirSeconds / total) * 100}%`,
                      backgroundColor: statColors.orange,
                    }}
                  />
                </div>

                <div className="flex justify-between text-caption text-text-secondary">
                  <span className="flex items-center gap-1">
                    {formatTime(game.yourSeconds)}
                    {game.youFinished && <Trophy className="size-3" />}
                  </span>
                  <span className="flex items-center gap-1">
                    {game.theyFinished && <Trophy className="size-3" />}
                    {formatTime(game.theirSeconds)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Compare
