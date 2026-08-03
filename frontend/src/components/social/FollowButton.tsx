import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, UserCheck, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { followsApi } from '../../services/api'
import type { FollowState } from '../../types'

interface FollowButtonProps {
  state: FollowState
  onChange: (next: FollowState) => void
}

/**
 * Follow, unfollow, or withdraw a pending request.
 *
 * Three states rather than two, because following a followers-only profile does not take
 * effect until its owner accepts. Collapsing "requested" into "following" would tell people
 * they had access they do not have.
 */
function FollowButton({ state, onChange }: FollowButtonProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const toggle = useCallback(async () => {
    setBusy(true)
    try {
      const active = state.following || state.requestPending
      const response = active
        ? await followsApi.unfollow(state.handle)
        : await followsApi.follow(state.handle)
      onChange(response.data)
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('social.follow.failed'))
    } finally {
      setBusy(false)
    }
  }, [state, onChange, t])

  if (state.requestPending) {
    return (
      <Button variant="outline" onClick={toggle} disabled={busy}>
        <Clock className="size-4" />
        {t('social.follow.requested')}
      </Button>
    )
  }

  if (state.following) {
    return (
      <Button variant="outline" onClick={toggle} disabled={busy}>
        <UserCheck className="size-4" />
        {t('social.follow.following')}
      </Button>
    )
  }

  return (
    <Button onClick={toggle} disabled={busy}>
      <UserPlus className="size-4" />
      {t('social.follow.follow')}
    </Button>
  )
}

export default FollowButton
