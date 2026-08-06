import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SocialLinkIcon } from '@/components/ui/social-icons'
import { detectSocialPlatform, normalizeProfileLink } from '@/lib/socialLinks'
import type { PublicProfile } from '../../types'

interface ProfileIdentityProps {
  profile: PublicProfile
  /** Follow, edit - whatever this particular profile page offers. */
  actions?: ReactNode
  onShowFollowers?: () => void
  onShowFollowing?: () => void
}

/**
 * The top of a profile: who this is, and how many people are on either side of them.
 *
 * Shared by your own profile and everyone else's, so the two cannot drift into looking like
 * different products - which is exactly what would happen the first time one of them was
 * adjusted on its own.
 */
function ProfileIdentity({
  profile,
  actions,
  onShowFollowers,
  onShowFollowing,
}: ProfileIdentityProps) {
  const { t } = useTranslation()

  const countClasses =
    'flex min-h-11 items-center rounded-md px-3 text-body-sm transition-colors duration-150 ease-standard hover:bg-accent-subtle hover:text-accent'

  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:mb-8">
      <div className="flex min-w-0 items-start gap-4">
        <Avatar className="size-20 shrink-0 border border-border">
          <AvatarImage src={profile.profilePictureUrl ?? undefined} alt="" />
          <AvatarFallback className="text-h3">
            {(profile.handle ?? profile.displayName ?? '?').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <h1 className="truncate text-h2 font-bold">{profile.displayName ?? profile.handle}</h1>
          {/* An account that has not claimed a handle has nothing to show here yet, and the
              edit sheet is where it gets claimed. */}
          {profile.handle && (
            <p className="text-body-sm text-text-secondary">@{profile.handle}</p>
          )}

          {profile.bio && <p className="mt-2 max-w-prose whitespace-pre-wrap text-body-sm">{profile.bio}</p>}

          {profile.links.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {profile.links.map((link, index) => {
                // Re-validated on the way out, not just the way in: a link already
                // passed the backend's http(s)-only check when it was saved, but this is
                // the last line of defense before it becomes a clickable anchor, so it
                // stays defensive rather than trusting the stored value outright.
                const safeUrl = normalizeProfileLink(link.url)
                if (!safeUrl) {
                  return null
                }
                const platform = detectSocialPlatform(safeUrl)
                return (
                  <a
                    key={`${link.url}-${index}`}
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('profile.links.visit', {
                      platform: t(`profile.links.platforms.${platform}`),
                    })}
                    className="flex size-11 shrink-0 items-center justify-center rounded-md text-text-secondary outline-none transition-colors duration-150 ease-standard hover:bg-accent-subtle hover:text-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <SocialLinkIcon platform={platform} className="size-5" />
                  </a>
                )
              })}
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-text-secondary">
            {/* Buttons rather than inline text: these navigate, and a target you are meant
                to hit with a thumb has to be big enough to hit. */}
            <button
              type="button"
              onClick={onShowFollowers}
              disabled={!profile.handle || !onShowFollowers}
              className={countClasses}
            >
              <span className="font-semibold text-text-primary">{profile.followerCount}</span>
              {/* The number is rendered separately, but the count still has to reach the
                  label - "1 followers" is the kind of thing plural forms exist to prevent. */}
              <span className="ml-1">
                {t('profile.followersLabel', { count: profile.followerCount })}
              </span>
            </button>
            <button
              type="button"
              onClick={onShowFollowing}
              disabled={!profile.handle || !onShowFollowing}
              className={countClasses}
            >
              <span className="font-semibold text-text-primary">{profile.followingCount}</span>
              <span className="ml-1">
                {t('profile.followingLabel', { count: profile.followingCount })}
              </span>
            </button>
            <span className="flex min-h-11 items-center gap-1 px-3 text-caption">
              <CalendarDays className="size-3" />
              {t('profile.joined', { date: new Date(profile.joinedDate).toLocaleDateString() })}
            </span>
          </div>
        </div>
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export default ProfileIdentity
