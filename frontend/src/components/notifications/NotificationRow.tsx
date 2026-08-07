import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BellRing,
  Coffee,
  MessageSquare,
  ThumbsUp,
  TriangleAlert,
  UserPlus,
  UserRoundCheck,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { resolveAssetUrl } from '@/lib/asset-url'
import { cn } from '@/lib/utils'
import type { NotificationItem } from '../../hooks/useNotifications'

interface NotificationRowProps {
  item: NotificationItem
  /** Closes the dropdown when a row navigates away from underneath it. */
  onNavigate: () => void
}

/**
 * How long ago, in words.
 *
 * Uses the platform's own relative formatter rather than a date library, so it follows the
 * selected language for free and adds nothing to the bundle. Exact timestamps are not what
 * anyone reads a notification list for - "two hours ago" answers the question, and the
 * absolute time is on the page the row links to.
 */
function relativeTime(iso: string, language: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit)
    }
  }
  return formatter.format(Math.round(seconds), 'second')
}

const LOCAL_TONE_ICON: Record<string, ReactNode> = {
  reminder: <Coffee className="size-4" />,
  goal: <BellRing className="size-4" />,
  warning: <TriangleAlert className="size-4" />,
}

const SERVER_TYPE_ICON: Record<string, ReactNode> = {
  FOLLOW_REQUEST: <UserPlus className="size-4" />,
  FOLLOW_ACCEPTED: <UserRoundCheck className="size-4" />,
  NEW_FOLLOWER: <UserPlus className="size-4" />,
  REVIEW_REPLY: <MessageSquare className="size-4" />,
  REVIEW_HELPFUL: <ThumbsUp className="size-4" />,
}

/**
 * One entry in the bell.
 *
 * Renders both kinds the list carries: things that happened on the server while nobody was
 * looking, and reminders this browser raised on its own. They look alike on purpose - the
 * viewer is asking "what happened", not "which subsystem produced this".
 */
function NotificationRow({ item, onNavigate }: NotificationRowProps) {
  const { t, i18n } = useTranslation()

  const when = relativeTime(item.createdAt, i18n.language)

  if (item.source === 'local') {
    return (
      <li
        className={cn(
          'flex items-start gap-3 rounded-lg p-3',
          !item.read && 'bg-accent-subtle/60'
        )}
      >
        <span className="mt-0.5 shrink-0 text-text-secondary">
          {LOCAL_TONE_ICON[item.tone] ?? <BellRing className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm text-text-primary">{t(item.messageKey, item.values)}</p>
          <p className="mt-0.5 text-caption text-text-secondary">{when}</p>
        </div>
      </li>
    )
  }

  const who = item.actorDisplayName ?? item.actorHandle ?? t('notifications.someone')

  // The game page is addressed by IGDB id, and a profile by handle. Anything missing its
  // address renders as text rather than as a link that would dead-end.
  const href =
    item.type === 'REVIEW_REPLY' || item.type === 'REVIEW_HELPFUL'
      ? item.gameExternalId
        ? `/catalog/${item.gameExternalId}`
        : null
      : item.type === 'FOLLOW_REQUEST'
        ? '/profile'
        : item.actorHandle
          ? `/u/${item.actorHandle}`
          : null

  const message = t(`notifications.items.${item.type}`, {
    name: who,
    game: item.gameName ?? t('notifications.aGame'),
  })

  const body = (
    <>
      <Avatar className="mt-0.5 size-8 shrink-0">
        <AvatarImage src={resolveAssetUrl(item.actorPictureUrl)} alt="" />
        <AvatarFallback>{who.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="text-body-sm text-text-primary">{message}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-caption text-text-secondary">
          <span className="shrink-0">{SERVER_TYPE_ICON[item.type]}</span>
          {when}
        </p>
      </div>
    </>
  )

  const shared = cn(
    'flex w-full items-start gap-3 rounded-lg p-3 text-left',
    !item.read && 'bg-accent-subtle/60'
  )

  return (
    <li>
      {href ? (
        <Link
          to={href}
          onClick={onNavigate}
          className={cn(
            shared,
            'outline-none transition-colors duration-150 ease-standard hover:bg-border/30 focus-visible:ring-[3px] focus-visible:ring-ring/50'
          )}
        >
          {body}
        </Link>
      ) : (
        <div className={shared}>{body}</div>
      )}
    </li>
  )
}

export default NotificationRow
