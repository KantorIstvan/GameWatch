import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const AVATAR_SIZES = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-11',
} as const

interface UserLinkProps {
  /** Null for a row whose author has since been removed - see the fallback below. */
  handle: string | null | undefined
  displayName?: string | null
  pictureUrl?: string | null
  /**
   * `row` is the full avatar-plus-name block used in lists; `name` and `avatar` are the
   * halves of it, for places where the two sit at different points in a sentence.
   */
  variant?: 'row' | 'name' | 'avatar'
  size?: keyof typeof AVATAR_SIZES
  /** Second line under the name - "@handle · 12 followers", review metadata, and so on. */
  subtitle?: ReactNode
  className?: string
}

/**
 * A person, rendered as a link to their profile.
 *
 * Anywhere someone's name or avatar appears - a review, the activity feed, a group
 * standing, a follow request - it should be a way to go and look at who they are. Having
 * one component for it means a new surface gets that for free instead of quietly shipping
 * as plain text, and means the avatar-plus-name pairing looks the same in all of them.
 *
 * Falls back to unlinked text when there is no handle: nothing in the app can address a
 * profile without one, so a link would 404. That is a legacy shape rather than an expected
 * one - accounts are assigned a handle when they are created.
 */
function UserLink({
  handle,
  displayName,
  pictureUrl,
  variant = 'row',
  size = 'md',
  subtitle,
  className,
}: UserLinkProps) {
  const name = displayName ?? handle ?? ''
  const initial = (displayName ?? handle ?? '?').charAt(0).toUpperCase()

  const avatar = (
    <Avatar className={cn(AVATAR_SIZES[size], 'shrink-0')}>
      <AvatarImage src={pictureUrl ?? undefined} alt="" />
      <AvatarFallback>{initial}</AvatarFallback>
    </Avatar>
  )

  // Focus ring rather than an outline, to match how every other interactive element in
  // the app announces focus.
  const interactive =
    'rounded-md outline-none transition-colors duration-150 ease-standard focus-visible:ring-[3px] focus-visible:ring-ring/50'

  if (variant === 'avatar') {
    if (!handle) {
      return <span className={className}>{avatar}</span>
    }
    return (
      <Link
        to={`/u/${handle}`}
        aria-label={name}
        className={cn(interactive, 'shrink-0 rounded-full hover:opacity-80', className)}
      >
        {avatar}
      </Link>
    )
  }

  if (variant === 'name') {
    if (!handle) {
      return <span className={cn('font-medium text-text-primary', className)}>{name}</span>
    }
    return (
      <Link
        to={`/u/${handle}`}
        className={cn(interactive, 'font-medium text-text-primary hover:underline', className)}
      >
        {name}
      </Link>
    )
  }

  const body = (
    <>
      {avatar}
      <span className="min-w-0">
        {/* Only the name underlines on hover - dragging the subtitle along with it reads
            as the whole block being one long link label. */}
        <span className="block truncate text-body-sm font-medium text-text-primary group-hover:underline">
          {name}
        </span>
        {subtitle && (
          <span
            className={cn(
              'block text-caption text-text-secondary',
              // A plain string is one line and should clip; anything richer is a caller's
              // own layout (a wrapping row of badges, say) and truncating would eat it.
              typeof subtitle === 'string' && 'truncate'
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </>
  )

  if (!handle) {
    return <span className={cn('flex min-w-0 items-center gap-3', className)}>{body}</span>
  }

  return (
    <Link
      to={`/u/${handle}`}
      className={cn(interactive, 'group flex min-w-0 items-center gap-3', className)}
    >
      {body}
    </Link>
  )
}

export default UserLink
