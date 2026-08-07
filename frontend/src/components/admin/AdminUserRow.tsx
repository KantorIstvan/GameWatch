import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { MoreHorizontal, ShieldOff, ShieldCheck } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableRow, TableCell } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { adminApi } from '../../services/api'
import { resolveAssetUrl } from '@/lib/asset-url'
import { formatDate } from '../../utils/formatters'
import type { AdminUserSummary } from '../../types'

interface AdminUserRowProps {
  user: AdminUserSummary
  onBlockedChange: (id: number, blocked: boolean) => void
}

/**
 * One row of the admin directory. Block/unblock is reversible, so it gets the lighter
 * AlertDialog confirm here; delete is irreversible and stays on the detail page's danger
 * zone rather than a row-level quick action, where a misclick is one row-hover away.
 */
function AdminUserRow({ user, onBlockedChange }: AdminUserRowProps) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const blocked = user.blocked ?? false

  const handleToggleBlocked = async () => {
    setWorking(true)
    try {
      if (blocked) {
        await adminApi.unblockUser(user.id)
        toast.success(t('admin.users.unblockSuccess', { name: user.displayName ?? user.username }))
      } else {
        await adminApi.blockUser(user.id)
        toast.success(t('admin.users.blockSuccess', { name: user.displayName ?? user.username }))
      }
      onBlockedChange(user.id, !blocked)
    } catch {
      toast.error(blocked ? t('admin.users.unblockFailed') : t('admin.users.blockFailed'))
    } finally {
      setWorking(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <Link to={`/admin/users/${user.id}`} className="flex items-center gap-3">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={resolveAssetUrl(user.profilePictureUrl)} alt="" />
              <AvatarFallback>
                {(user.displayName ?? user.handle ?? user.username ?? '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-body-sm font-medium text-text-primary">
              {user.displayName ?? user.username}
            </span>
            {blocked && (
              <Badge variant="destructive">{t('admin.users.blockedBadge')}</Badge>
            )}
          </Link>
        </TableCell>
        <TableCell className="text-body-sm text-text-secondary">{user.email}</TableCell>
        <TableCell className="text-body-sm text-text-secondary">
          {user.handle ? `@${user.handle}` : t('admin.users.noHandle')}
        </TableCell>
        <TableCell className="text-body-sm text-text-secondary">{formatDate(user.createdAt)}</TableCell>
        <TableCell className="w-12 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('admin.users.rowActions')}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/admin/users/${user.id}`}>{t('admin.users.viewDetails')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
                {blocked ? (
                  <>
                    <ShieldCheck className="size-4" />
                    {t('admin.users.unblock')}
                  </>
                ) : (
                  <>
                    <ShieldOff className="size-4" />
                    {t('admin.users.block')}
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <AlertDialog open={confirmOpen} onOpenChange={(next) => !working && setConfirmOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blocked ? t('admin.users.unblockConfirmTitle') : t('admin.users.blockConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blocked
                ? t('admin.users.unblockConfirmMessage', { name: user.displayName ?? user.username })
                : t('admin.users.blockConfirmMessage', { name: user.displayName ?? user.username })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleBlocked} disabled={working}>
              {blocked ? t('admin.users.unblock') : t('admin.users.block')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default AdminUserRow
