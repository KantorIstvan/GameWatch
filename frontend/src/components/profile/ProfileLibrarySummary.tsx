import { useTranslation } from 'react-i18next'
import { Timer, Gamepad2, CircleCheck, CalendarDays, Lock } from 'lucide-react'
import StatCard from '../StatCard'
import { formatTime } from '../../utils/formatters'
import { statColors, statForegrounds } from '../../lib/statColors'
import type { ProfileLibrary } from '../../types'

interface ProfileLibrarySummaryProps {
  /** Null when the viewer may open the profile but not the library behind it. */
  library: ProfileLibrary | null
  /** Says why the library is missing, which reads differently on your own profile. */
  hiddenMessage: string
}

/**
 * What a profile has played, as far as the viewer is allowed to see it.
 *
 * A null library renders as "not shared" rather than as zeros: zeros are indistinguishable
 * from a genuinely empty library, which both misleads the viewer and quietly reveals that a
 * hidden one exists.
 */
function ProfileLibrarySummary({ library, hiddenMessage }: ProfileLibrarySummaryProps) {
  const { t } = useTranslation()

  if (!library) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
        <Lock className="size-5 shrink-0 text-text-secondary" />
        <p className="text-body-sm text-text-secondary">{hiddenMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:gap-5 md:mb-8 md:grid-cols-4">
        <StatCard
          title={t('profile.totalPlaytime')}
          value={formatTime(library.totalPlaytimeSeconds)}
          icon={<Timer className="size-5" />}
          color={statColors.blue}
          foreground={statForegrounds.blue}
        />
        <StatCard
          title={t('profile.gamesInLibrary')}
          value={library.gamesInLibrary}
          icon={<Gamepad2 className="size-5" />}
        />
        <StatCard
          title={t('profile.gamesCompleted')}
          value={library.gamesCompleted}
          icon={<CircleCheck className="size-5" />}
        />
        <StatCard
          title={t('profile.totalSessions')}
          value={library.totalSessions}
          icon={<CalendarDays className="size-5" />}
        />
      </div>

      {library.topGames.length > 0 && (
        <section>
          <p className="mb-3 text-body-lg font-bold sm:mb-4">{t('profile.topGames')}</p>
          <ul className="flex flex-col gap-3">
            {library.topGames.map((game) => (
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
  )
}

export default ProfileLibrarySummary
