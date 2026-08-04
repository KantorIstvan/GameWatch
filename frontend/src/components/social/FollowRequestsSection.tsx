import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { followsApi } from '../../services/api'
import type { FollowPerson } from '../../types'

interface FollowRequestsSectionProps {
  /** Fires on an accept, since that is a follower the count above has not counted yet. */
  onAccepted?: () => void
}

/**
 * Pending follow requests, with the accept/reject decision that makes followers-only
 * visibility mean anything.
 *
 * Sits above your own follower list rather than in settings, which is where the question
 * "who follows me" is actually being asked. Only rendered when there is something to answer:
 * a permanently empty panel is noise for the many users who will never receive a request.
 */
function FollowRequestsSection({ onAccepted }: FollowRequestsSectionProps) {
  const { t } = useTranslation()
  const [requests, setRequests] = useState<FollowPerson[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(() => {
    followsApi
      .getPendingRequests()
      .then((response) => setRequests(response.data))
      .catch(() => setRequests([]))
  }, [])

  useEffect(load, [load])

  const respond = useCallback(
    async (followId: number, accept: boolean) => {
      setBusyId(followId)
      try {
        if (accept) {
          await followsApi.accept(followId)
        } else {
          await followsApi.reject(followId)
        }
        setRequests((current) => current.filter((request) => request.followId !== followId))
        toast.success(accept ? t('social.requests.accepted') : t('social.requests.rejected'))
        if (accept) onAccepted?.()
      } catch {
        toast.error(t('social.requests.failed'))
      } finally {
        setBusyId(null)
      }
    },
    [t, onAccepted]
  )

  if (requests.length === 0) {
    return null
  }

  return (
    <section className="mb-6 rounded-xl border border-accent/30 bg-accent-subtle/40 p-4 sm:p-6">
      <div className="mb-1 flex items-center gap-3">
        <UserPlus className="size-5 text-accent" />
        <p className="text-h4 font-medium">{t('social.requests.title')}</p>
      </div>
      <p className="mb-4 text-body-sm text-text-secondary">{t('social.requests.description')}</p>

      <ul className="flex flex-col gap-3">
        {requests.map((request) => (
          <li key={request.followId} className="flex items-center gap-3">
            <Avatar className="size-11 shrink-0">
              <AvatarImage src={request.profilePictureUrl ?? undefined} alt="" />
              <AvatarFallback>{(request.handle ?? '?').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-sm font-medium text-text-primary">
                {request.displayName ?? request.handle}
              </span>
              <span className="block truncate text-caption text-text-secondary">
                @{request.handle}
              </span>
            </span>

            <Button
              size="sm"
              variant="outline"
              disabled={busyId === request.followId}
              onClick={() => respond(request.followId, false)}
              aria-label={t('social.requests.reject')}
            >
              <X className="size-4" />
            </Button>
            <Button
              size="sm"
              disabled={busyId === request.followId}
              onClick={() => respond(request.followId, true)}
              aria-label={t('social.requests.accept')}
            >
              <Check className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default FollowRequestsSection
