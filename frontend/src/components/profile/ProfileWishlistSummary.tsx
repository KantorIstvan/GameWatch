import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Gamepad2, Lock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { WishlistEntry } from '../../types'

interface ProfileWishlistSummaryProps {
  /** Null when the viewer may open the profile but not the wishlist behind it. */
  wishlist: WishlistEntry[] | null
  /** Says why the wishlist is missing, which reads differently on your own profile. */
  hiddenMessage: string
}

/**
 * What a profile wants to play, as far as the viewer is allowed to see it.
 *
 * Mirrors {@link ProfileLibrarySummary}'s null-means-hidden convention: an owner who has
 * not shared their wishlist gets the same locked message a hidden library gets, rather
 * than an empty list that would look identical to "shared, but nothing on it".
 */
function ProfileWishlistSummary({ wishlist, hiddenMessage }: ProfileWishlistSummaryProps) {
  const { t } = useTranslation()

  if (!wishlist) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
        <Lock className="size-5 shrink-0 text-text-secondary" />
        <p className="text-body-sm text-text-secondary">{hiddenMessage}</p>
      </div>
    )
  }

  if (wishlist.length === 0) {
    return (
      <p className="text-body-sm text-text-secondary">{t('profile.wishlistEmpty')}</p>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {wishlist.map((entry) => (
        <li key={entry.gameId}>
          <Link
            to={`/catalog/${entry.externalId}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3 outline-none backdrop-blur-xl transition-colors duration-150 ease-standard hover:border-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Avatar className="size-12 shrink-0 rounded-sm">
              <AvatarImage src={entry.bannerImageUrl} alt="" className="object-cover" />
              <AvatarFallback className="rounded-sm bg-surface-raised text-text-tertiary">
                <Gamepad2 className="size-5" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-medium text-text-primary">{entry.gameName}</p>
              <p className="mt-1 text-caption text-text-secondary">
                {t('profile.wishlistAddedOn', { date: new Date(entry.addedAt).toLocaleDateString() })}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default ProfileWishlistSummary
