import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import GameEntryRow from './GameEntryRow'
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
 *
 * Renders with the same {@link GameEntryRow} the Ratings tab uses - a wishlisted game has
 * no score and no "rated on" date, and the row already treats both as optional rather than
 * assuming every entry has them, so no separate wishlist-shaped row was needed.
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
    return <p className="text-body-sm text-text-secondary">{t('profile.wishlistEmpty')}</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {wishlist.map((entry, index) => (
        <GameEntryRow key={entry.gameId} index={index + 1} entry={entry} />
      ))}
    </ul>
  )
}

export default ProfileWishlistSummary
