import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAdminContext } from '../contexts/AdminContext'

/**
 * Stage 1 placeholder - proves the RBAC gate works end-to-end (route, nav, and the
 * permissions this account's JWT actually carries). Stage 2 replaces this content with
 * the real user directory; the route and file stay the same.
 */
function AdminUsers() {
  const { t } = useTranslation()
  const { permissions } = useAdminContext()

  return (
    <div>
      <h1 className="mb-2 text-h2 font-bold">{t('admin.title')}</h1>
      <p className="mb-6 text-body-sm text-text-secondary">{t('admin.subtitle')}</p>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 text-text-secondary">
          <ShieldCheck className="size-4" />
          <p className="text-body-sm font-medium">{t('admin.permissionsLabel')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.map((permission) => (
            <Badge key={permission} variant="outline">
              {permission}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminUsers
