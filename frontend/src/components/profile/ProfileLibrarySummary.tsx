import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Timer, Gamepad2, CircleCheck, CalendarDays, Star, Lock } from 'lucide-react'
import StatCard from '../StatCard'
import RecentReviews from './RecentReviews'
import { formatTime } from '../../utils/formatters'
import { statColors, statForegrounds } from '../../lib/statColors'
import { cn } from '@/lib/utils'
import type { ProfileLibrary } from '../../types'

interface ProfileLibrarySummaryProps {
  /** Null when the viewer may open the profile but not the library behind it. */
  library: ProfileLibrary | null
  /** Says why the library is missing, which reads differently on your own profile. */
  hiddenMessage: string
}

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * What a profile has played, as far as the viewer is allowed to see it.
 *
 * A null library renders as "not shared" rather than as zeros: zeros are indistinguishable
 * from a genuinely empty library, which both misleads the viewer and quietly reveals that a
 * hidden one exists.
 */
function ProfileLibrarySummary({ library, hiddenMessage }: ProfileLibrarySummaryProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!library) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
        <Lock className="size-5 shrink-0 text-text-secondary" />
        <p className="text-body-sm text-text-secondary">{hiddenMessage}</p>
      </div>
    )
  }

  const ratingPeak = Math.max(1, ...Object.values(library.ratingDistribution))

  // Both panels below are conditional, and a profile that has played but not written - or
  // written but has no playtime to rank - would otherwise leave the survivor sitting in one
  // half of a two-column row. Whichever one is alone takes the whole row instead.
  const panelsShown =
    (library.topGames.length > 0 ? 1 : 0) + (library.recentReviews.length > 0 ? 1 : 0)
  const panelSpan = panelsShown === 1 ? 'md:col-span-2' : undefined

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:gap-5 md:mb-8 md:grid-cols-4">
        {/* Five equal tiles never tile a two- or four-column row, so the grid used to end on a
            half-empty row on mobile and a three-quarters-empty one from md up. Playtime is the
            headline number on a profile anyway, so it takes the hero size and the remaining
            four fill the rows beside it exactly: 2 + 2 x 2 on mobile, 4 + 4 from md. Same
            shape the Statistics overview uses, for the same reason. */}
        <StatCard
          hero
          className="col-span-2 md:row-span-2"
          title={t('profile.totalPlaytime')}
          value={formatTime(library.totalPlaytimeSeconds)}
          icon={<Timer className="size-6" />}
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
        <StatCard
          title={t('profile.ratingsGiven')}
          value={library.ratingsGiven}
          icon={<Star className="size-5" />}
        />
      </div>

      {library.ratingsGiven > 0 && (
        <section className="mb-6 md:mb-8">
          <p className="mb-3 text-body-lg font-bold sm:mb-4">{t('profile.ratingDistributionTitle')}</p>
          <div
            className="flex h-24 gap-1 rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl sm:p-6"
            role="img"
            aria-label={t('profile.ratingDistributionLabel')}
          >
            {SCORES.map((score) => {
              const count = library.ratingDistribution[score] ?? 0
              return (
                <div key={score} className="flex flex-1 flex-col items-center gap-1">
                  {/* The track carries the definite height the bar's percentage resolves
                      against - a content-sized parent would collapse the bar to nothing. */}
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={cn(
                        'w-full transition-all duration-150 ease-standard',
                        // Two neutral steps rather than an accent hue: the distribution is
                        // context, not a mark competing with the stat cards above it. An
                        // unrated score keeps a baseline tick so the axis still reads as a
                        // chart when only one or two scores have votes.
                        count > 0 ? 'bg-text-secondary' : 'h-0.5 bg-border'
                      )}
                      style={count > 0 ? { height: `${Math.max(8, (count / ratingPeak) * 100)}%` } : undefined}
                      title={t('profile.ratingDistributionCount', { score, count })}
                    />
                  </div>
                  <span className="text-caption text-text-secondary">{score}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {(library.topGames.length > 0 || library.recentReviews.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
          {library.topGames.length > 0 && (
            <section className={panelSpan}>
              <p className="mb-3 text-body-lg font-bold sm:mb-4">{t('profile.topGames')}</p>
              <ul className="flex flex-col gap-3">
                {library.topGames.map((game) => (
                  <li
                    key={game.gameId}
                    onClick={game.externalId ? () => navigate(`/catalog/${game.externalId}`) : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-xl',
                      game.externalId &&
                        'cursor-pointer transition-colors duration-150 ease-standard hover:bg-surface'
                    )}
                  >
                    {game.bannerImageUrl && (
                      <img
                        src={game.bannerImageUrl}
                        alt=""
                        className="h-24 w-16 shrink-0 rounded-md object-cover"
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

          {library.recentReviews.length > 0 && (
            <RecentReviews reviews={library.recentReviews} className={panelSpan} />
          )}
        </div>
      )}
    </>
  )
}

export default ProfileLibrarySummary
