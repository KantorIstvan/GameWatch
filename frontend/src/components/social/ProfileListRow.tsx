import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { resolveAssetUrl } from '@/lib/asset-url'
import FollowButton from './FollowButton'
import type { FollowState, ProfileSummary } from '../../types'

/**
 * What a row needs to render a face and a name.
 *
 * A live search result or follow-list entry carries the full `ProfileSummary` - relationship
 * state included - but a remembered recent search only ever kept the identity fields (see
 * `useRecentPeopleSearches`), since follower counts and the viewer's own follow state go
 * stale the moment they're cached. The relationship fields are optional here so the same row
 * renders either kind without inventing placeholder numbers for the ones it doesn't have.
 */
type ProfileRowPerson = Pick<ProfileSummary, 'handle' | 'displayName' | 'profilePictureUrl'> &
  Partial<
    Pick<
      ProfileSummary,
      'followerCount' | 'followingCount' | 'viewerIsFollowing' | 'viewerRequestPending' | 'ownProfile'
    >
  >

interface ProfileListRowProps {
  person: ProfileRowPerson
  onFollowChange?: (handle: string, next: FollowState) => void
  /** Fired when the row is opened, e.g. to record it in a recent-searches list. */
  onSelect?: (person: ProfileRowPerson) => void
  /** Present only on a recent-searches row, where removing an entry is a normal action. */
  onRemove?: (handle: string) => void
  removeLabel?: string
}

/**
 * One person in a list of people.
 *
 * The same row for search results, followers, following and recent searches, because they
 * are the same thing - a face, a name and (where it's known) the viewer's relationship to
 * it. Four near-identical row layouts is how four lists end up disagreeing about avatar size
 * the first time one of them is touched.
 */
function ProfileListRow({ person, onFollowChange, onSelect, onRemove, removeLabel }: ProfileListRowProps) {
  const { t } = useTranslation()

  const hasFollowState = person.followerCount !== undefined

  const identity = (
    <>
      <Avatar className="size-11 shrink-0">
        <AvatarImage src={resolveAssetUrl(person.profilePictureUrl)} alt="" />
        <AvatarFallback>
          {(person.handle ?? person.displayName ?? '?').charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate text-body-sm font-medium text-text-primary">
          {person.displayName ?? person.handle}
        </span>
        <span className="block truncate text-caption text-text-secondary">
          {person.handle && hasFollowState
            ? `@${person.handle} · ${t('profile.followers', { count: person.followerCount })}`
            : hasFollowState
              ? t('profile.followers', { count: person.followerCount })
              : person.handle
                ? `@${person.handle}`
                : null}
        </span>
      </span>
    </>
  )

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-xl sm:p-4">
      {/* Someone who has never claimed a handle has no profile to open and no key the follow
          endpoints can address, so the row shows them without pretending either exists.
          rounded-md on the link, not lg: the row is rounded-xl (24px) with 12px of padding,
          and a child that keeps its parent's radius stops looking concentric with it. */}
      {person.handle ? (
        <Link
          to={`/u/${person.handle}`}
          onClick={() => onSelect?.(person)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md transition-opacity duration-150 ease-standard hover:opacity-80"
        >
          {identity}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
      )}

      {/* Nothing to offer on your own row either: following yourself is rejected anyway. Only
          shown once relationship data is actually known - a recent search never has it. */}
      {person.handle && !person.ownProfile && hasFollowState && onFollowChange && (
        <FollowButton
          state={{
            handle: person.handle,
            following: person.viewerIsFollowing as boolean,
            requestPending: person.viewerRequestPending as boolean,
            followerCount: person.followerCount as number,
            followingCount: person.followingCount as number,
          }}
          onChange={(next) => onFollowChange(person.handle as string, next)}
        />
      )}

      {person.handle && onRemove && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={removeLabel ?? t('common.delete')}
          onClick={(e) => {
            e.preventDefault()
            onRemove(person.handle as string)
          }}
          className="shrink-0 text-text-secondary hover:text-destructive"
        >
          <X className="size-4" />
        </Button>
      )}
    </li>
  )
}

export default ProfileListRow
