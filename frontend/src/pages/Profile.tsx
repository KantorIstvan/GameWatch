import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Timer, Gamepad2, CircleCheck, CalendarDays, Lock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import StatCard from '../components/StatCard'
import FollowButton from '../components/social/FollowButton'
import { profilesApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import { formatTime } from '../utils/formatters'
import { statColors, statForegrounds } from '../lib/statColors'
import type { PublicProfile, FollowState } from '../types'

/**
 * Someone else's profile.
 *
 * A profile the viewer may not see comes back from the API as "not found", and this page
 * renders that as not found too - distinguishing the two here would give away exactly what
 * the backend is careful not to say.
 */
function Profile() {
  const { handle } = useParams<{ handle: string }>()
  const { t } = useTranslation()
  const { isAuthReady } = useAuthContext()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!isAuthReady || !handle) return

    setLoading(true)
    setNotFound(false)
    profilesApi
      .getProfile(handle)
      .then((response) => setProfile(response.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [handle, isAuthReady])

  const handleFollowChange = useCallback((next: FollowState) => {
    setProfile((current) =>
      current
        ? {
            ...current,
            viewerIsFollowing: next.following,
            viewerRequestPending: next.requestPending,
            followerCount: next.followerCount,
          }
        : current
    )
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-30 w-full bg-border" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 bg-border" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <Alert variant="info">
        <AlertDescription>{t('profile.notFound')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="size-20 shrink-0">
            <AvatarImage src={profile.profilePictureUrl ?? undefined} alt="" />
            <AvatarFallback>{profile.handle.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <h1 className="text-h2 font-bold">{profile.displayName ?? profile.handle}</h1>
            <p className="text-body-sm text-text-secondary">@{profile.handle}</p>

            {profile.bio && <p className="mt-2 max-w-prose text-body-sm">{profile.bio}</p>}

            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-secondary">
              <span>{t('profile.followers', { count: profile.followerCount })}</span>
              <span>{t('profile.following', { count: profile.followingCount })}</span>
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                {t('profile.joined', { date: new Date(profile.joinedDate).toLocaleDateString() })}
              </span>
            </p>
          </div>
        </div>

        {!profile.isOwnProfile && (
          <FollowButton
            state={{
              handle: profile.handle,
              following: profile.viewerIsFollowing,
              requestPending: profile.viewerRequestPending,
              followerCount: profile.followerCount,
              followingCount: profile.followingCount,
            }}
            onChange={handleFollowChange}
          />
        )}
      </header>

      {profile.library ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:gap-5 md:mb-8 md:grid-cols-4">
            <StatCard
              title={t('profile.totalPlaytime')}
              value={formatTime(profile.library.totalPlaytimeSeconds)}
              icon={<Timer className="size-5" />}
              color={statColors.blue}
              foreground={statForegrounds.blue}
            />
            <StatCard
              title={t('profile.gamesInLibrary')}
              value={profile.library.gamesInLibrary}
              icon={<Gamepad2 className="size-5" />}
            />
            <StatCard
              title={t('profile.gamesCompleted')}
              value={profile.library.gamesCompleted}
              icon={<CircleCheck className="size-5" />}
            />
            <StatCard
              title={t('profile.totalSessions')}
              value={profile.library.totalSessions}
              icon={<CalendarDays className="size-5" />}
            />
          </div>

          {profile.library.topGames.length > 0 && (
            <section>
              <p className="mb-3 text-body-lg font-bold sm:mb-4">{t('profile.topGames')}</p>
              <ul className="flex flex-col gap-3">
                {profile.library.topGames.map((game) => (
                  <li
                    key={game.gameId}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-xl"
                  >
                    {game.bannerImageUrl && (
                      <img
                        src={game.bannerImageUrl}
                        alt=""
                        className="h-12 w-20 shrink-0 rounded-md object-cover"
                        loading="lazy"
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                      {game.gameName}
                    </span>
                    <span className="shrink-0 text-body-sm text-text-secondary">
                      {formatTime(game.playtimeSeconds)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
          <Lock className="size-5 shrink-0 text-text-secondary" />
          <p className="text-body-sm text-text-secondary">{t('profile.libraryHidden')}</p>
        </div>
      )}
    </div>
  )
}

export default Profile
