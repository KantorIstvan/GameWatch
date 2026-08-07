import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowLeft, KeyRound, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import TypedConfirmDialog from '../components/TypedConfirmDialog'
import { adminApi } from '../services/api'
import { resolveAssetUrl } from '@/lib/asset-url'
import { formatDateTime } from '../utils/formatters'
import Loading from '../components/Loading'
import type { AdminAuditLogEntry, AdminUserDetail as AdminUserDetailType, PagedResponse } from '../types'

const AUDIT_LOG_PAGE_SIZE = 10

/** Read-only info plus moderation actions this stage - Stage 4 adds field editing. */
function AdminUserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [user, setUser] = useState<AdminUserDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [auditLog, setAuditLog] = useState<PagedResponse<AdminAuditLogEntry> | null>(null)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [working, setWorking] = useState(false)

  const fetchUser = useCallback(() => {
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

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!id) return
    adminApi
      .getAuditLog(Number(id), 0, AUDIT_LOG_PAGE_SIZE)
      .then((response) => setAuditLog(response.data))
      .catch(() => setAuditLog(null))
  }, [id])

  const handleToggleBlocked = async () => {
    if (!user) return
    setWorking(true)
    try {
      if (user.blocked) {
        await adminApi.unblockUser(user.id)
        toast.success(t('admin.users.unblockSuccess', { name: user.displayName ?? user.username }))
      } else {
        await adminApi.blockUser(user.id)
        toast.success(t('admin.users.blockSuccess', { name: user.displayName ?? user.username }))
      }
      fetchUser()
    } catch {
      toast.error(user.blocked ? t('admin.users.unblockFailed') : t('admin.users.blockFailed'))
    } finally {
      setWorking(false)
      setBlockDialogOpen(false)
    }
  }

  const handleSendPasswordReset = async () => {
    if (!user) return
    setWorking(true)
    try {
      await adminApi.sendPasswordReset(user.id)
      toast.success(t('admin.users.passwordResetSuccess', { email: user.email }))
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('admin.users.passwordResetFailed'))
    } finally {
      setWorking(false)
    }
  }

  const handleDelete = async () => {
    if (!user) return
    try {
      await adminApi.deleteUser(user.id)
      toast.success(t('admin.users.deleteSuccess', { email: user.email }))
      navigate('/admin')
    } catch {
      toast.error(t('admin.users.deleteFailed'))
      setDeleteDialogOpen(false)
    }
  }

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

  const deleteConfirmText = user.handle ?? user.email

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
          <div className="flex items-center gap-2">
            <h1 className="truncate text-h2 font-bold">{user.displayName ?? user.username}</h1>
            {user.blocked && <Badge variant="destructive">{t('admin.users.blockedBadge')}</Badge>}
          </div>
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

      <div className="flex flex-col gap-8 rounded-xl border border-border bg-surface/90 p-4 backdrop-blur-xl sm:p-6">
        <section>
          <p className="mb-2 text-body-sm font-medium text-text-secondary">
            {t('admin.users.detail.visibility')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t('admin.users.detail.profile')}: {user.profileVisibility}</Badge>
            <Badge variant="outline">{t('admin.users.detail.library')}: {user.libraryVisibility}</Badge>
            <Badge variant="outline">{t('admin.users.detail.wishlist')}: {user.wishlistVisibility}</Badge>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-body-sm font-medium text-text-secondary">{label}</dt>
                <dd className="mt-0.5 wrap-break-word text-body-sm text-text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-border pt-8">
          <p className="mb-1 text-h4 font-medium">{t('admin.users.moderation.title')}</p>
          <p className="mb-4 text-body-sm text-text-secondary">{t('admin.users.moderation.description')}</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setBlockDialogOpen(true)} disabled={working}>
              {user.blocked ? <ShieldCheck className="size-4" /> : <ShieldOff className="size-4" />}
              {user.blocked ? t('admin.users.unblock') : t('admin.users.block')}
            </Button>
            <Button variant="outline" onClick={handleSendPasswordReset} disabled={working}>
              <KeyRound className="size-4" />
              {t('admin.users.sendPasswordReset')}
            </Button>
          </div>
        </section>

        <section className="border-t border-border pt-8">
          <p className="mb-4 text-h4 font-medium">{t('admin.users.auditLog.title')}</p>
          {!auditLog || auditLog.content.length === 0 ? (
            <p className="text-body-sm text-text-secondary">{t('admin.users.auditLog.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {auditLog.content.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-border p-3 text-body-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text-primary">
                      {t(`admin.users.auditLog.actions.${entry.action}`)}
                    </span>
                    <span className="shrink-0 text-caption text-text-secondary">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-text-secondary">
                    {t('admin.users.auditLog.by', { email: entry.adminEmail })}
                  </p>
                  {entry.details && <p className="mt-1 text-text-secondary">{entry.details}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-t border-border pt-8">
          <p className="mb-1 text-h4 font-medium text-destructive">{t('admin.users.dangerZone.title')}</p>
          <p className="mb-4 text-body-sm text-text-secondary">{t('admin.users.dangerZone.description')}</p>
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/8"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="size-4" />
            {t('admin.users.deleteAccount')}
          </Button>
        </section>
      </div>

      <AlertDialog open={blockDialogOpen} onOpenChange={(next) => !working && setBlockDialogOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.blocked ? t('admin.users.unblockConfirmTitle') : t('admin.users.blockConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.blocked
                ? t('admin.users.unblockConfirmMessage', { name: user.displayName ?? user.username })
                : t('admin.users.blockConfirmMessage', { name: user.displayName ?? user.username })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleBlocked} disabled={working}>
              {user.blocked ? t('admin.users.unblock') : t('admin.users.block')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TypedConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t('admin.users.deleteConfirmTitle')}
        message={t('admin.users.deleteConfirmMessage', { email: user.email })}
        confirmText={t('admin.users.deleteAccount')}
        requiredText={deleteConfirmText}
      />
    </div>
  )
}

export default AdminUserDetail
