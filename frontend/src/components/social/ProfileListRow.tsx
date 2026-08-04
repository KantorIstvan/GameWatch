import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import FollowButton from './FollowButton'
import type { FollowState, ProfileSummary } from '../../types'

interface ProfileListRowProps {
  person: ProfileSummary
  onFollowChange: (handle: string, next: FollowState) => void
}

/**
 * One person in a list of people.
 *
 * The same row for search results, followers and following, because they are the same thing
 * - a face, a name and the viewer's relationship to it. Three near-identical row layouts is
 * how three lists end up disagreeing about avatar size the first time one of them is
 * touched.
 */
function ProfileListRow({ person, onFollowChange }: ProfileListRowProps) {
  const { t } = useTranslation()

  const identity = (
    <>
      <Avatar className="size-11 shrink-0">
        <AvatarImage src={person.profilePictureUrl ?? undefined} alt="" />
        <AvatarFallback>
          {(person.handle ?? person.displayName ?? '?').charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate text-body-sm font-medium text-text-primary">
          {person.displayName ?? person.handle}
        </span>
        <span className="block truncate text-caption text-text-secondary">
          {person.handle
            ? `@${person.handle} · ${t('profile.followers', { count: person.followerCount })}`
            : t('profile.followers', { count: person.followerCount })}
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
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md transition-opacity duration-150 ease-standard hover:opacity-80"
        >
          {identity}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
      )}

      {/* Nothing to offer on your own row either: following yourself is rejected anyway. */}
      {person.handle && !person.isOwnProfile && (
        <FollowButton
          state={{
            handle: person.handle,
            following: person.viewerIsFollowing,
            requestPending: person.viewerRequestPending,
            followerCount: person.followerCount,
            followingCount: person.followingCount,
          }}
          onChange={(next) => onFollowChange(person.handle as string, next)}
        />
      )}
    </li>
  )
}

export default ProfileListRow
