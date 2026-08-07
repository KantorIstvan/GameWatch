import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { adminApi } from '../services/api'
import { resolveAssetUrl } from '@/lib/asset-url'
import { formatDateTime } from '../utils/formatters'
import Loading from '../components/Loading'
import type { AdminUserDetail as AdminUserDetailType } from '../types'

/** Read-only this stage - Stage 3 adds moderation actions, Stage 4 adds editing. */
function AdminUserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [user, setUser] = useState<AdminUserDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    adminApi
      .getUser(Number(id))
      .then((response) => setUser(response.data))
      // Every failed admin GET is treated as "not found" regardless of status code - see
      // the plan's note on this codebase's pre-existing RuntimeException-to-500 convention.
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <Loading />
  }

  if (notFound || !user) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="size-4" />
          {t('admin.users.backToDirectory')}
        </Button>
        <p className="mt-4 text-destructive">{t('admin.users.notFound')}</p>
      </div>
    )
  }

  const fields: Array<[string, string]> = [
    [t('admin.users.detail.id'), String(user.id)],
    [t('admin.users.detail.auth0UserId'), user.auth0UserId],
    [t('admin.users.detail.username'), user.username],
    [t('admin.users.detail.bio'), user.bio ?? t('admin.users.detail.empty')],
    [t('admin.users.detail.age'), user.age != null ? String(user.age) : t('admin.users.detail.empty')],
    [t('admin.users.detail.timezone'), user.timezone ?? t('admin.users.detail.empty')],
    [t('admin.users.detail.createdAt'), formatDateTime(user.createdAt)],
    [t('admin.users.detail.updatedAt'), formatDateTime(user.updatedAt)],
  ]

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-6">
        <ArrowLeft className="size-4" />
        {t('admin.users.backToDirectory')}
      </Button>

      <div className="mb-6 flex items-center gap-4">
        <Avatar className="size-14 shrink-0">
          <AvatarImage src={resolveAssetUrl(user.profilePictureUrl ?? undefined)} alt="" />
          <AvatarFallback>
            {(user.displayName ?? user.handle ?? user.username ?? '?').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-h2 font-bold">{user.displayName ?? user.username}</h1>
          <p className="truncate text-body-sm text-text-secondary">
            {user.handle ? (
              <Link to={`/u/${user.handle}`} className="hover:text-accent">
                @{user.handle}
              </Link>
            ) : (
              t('admin.users.noHandle')
            )}
            {' · '}
            {user.email}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-6">
        <div>
          <p className="mb-2 text-body-sm font-medium text-text-secondary">
            {t('admin.users.detail.visibility')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t('admin.users.detail.profile')}: {user.profileVisibility}</Badge>
            <Badge variant="outline">{t('admin.users.detail.library')}: {user.libraryVisibility}</Badge>
            <Badge variant="outline">{t('admin.users.detail.wishlist')}: {user.wishlistVisibility}</Badge>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-body-sm font-medium text-text-secondary">{label}</dt>
              <dd className="mt-0.5 break-words text-body-sm text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

export default AdminUserDetail
