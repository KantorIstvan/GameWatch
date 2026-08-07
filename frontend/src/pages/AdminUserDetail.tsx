import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowLeft, ChevronsUpDown, KeyRound, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
import AdminPlaythroughsTable from '../components/admin/AdminPlaythroughsTable'
import { adminApi } from '../services/api'
import { resolveAssetUrl } from '@/lib/asset-url'
import { cn } from '@/lib/utils'
import { formatDateTime } from '../utils/formatters'
import { COMMON_TIMEZONES } from '../utils/timezones'
import Loading from '../components/Loading'
import type { AdminAuditLogEntry, AdminUserDetail as AdminUserDetailType, PagedResponse, Visibility } from '../types'

const AUDIT_LOG_PAGE_SIZE = 10
const VISIBILITIES: Visibility[] = ['PRIVATE', 'FOLLOWERS', 'PUBLIC']

interface ProfileFormState {
  displayName: string
  handle: string
  bio: string
  age: string
  timezone: string
  firstDayOfWeek: 'MONDAY' | 'SUNDAY'
  profileVisibility: Visibility
  libraryVisibility: Visibility
  wishlistVisibility: Visibility
}

/** A readable identifier for a user with no email on file (some OAuth connections never put one on the access token). */
const identify = (user: AdminUserDetailType): string =>
  user.handle ? `@${user.handle}` : user.email || `user #${user.id}`

const toFormState = (user: AdminUserDetailType): ProfileFormState => ({
  displayName: user.displayName ?? '',
  handle: user.handle ?? '',
  bio: user.bio ?? '',
  age: user.age != null ? String(user.age) : '',
  timezone: user.timezone ?? '',
  firstDayOfWeek: user.firstDayOfWeek ?? 'MONDAY',
  profileVisibility: user.profileVisibility,
  libraryVisibility: user.libraryVisibility,
  wishlistVisibility: user.wishlistVisibility,
})

/** Profile editing, playthrough/timer overrides, moderation, and the danger zone. */
function AdminUserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [user, setUser] = useState<AdminUserDetailType | null>(null)
  const [form, setForm] = useState<ProfileFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [auditLog, setAuditLog] = useState<PagedResponse<AdminAuditLogEntry> | null>(null)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [timezonePickerOpen, setTimezonePickerOpen] = useState(false)

  const fetchUser = useCallback(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    adminApi
      .getUser(Number(id))
      .then((response) => {
        setUser(response.data)
        setForm(toFormState(response.data))
      })
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

  const handleSaveProfile = async () => {
    if (!user || !form) return
    const trimmedAge = form.age.trim()
    const age = trimmedAge ? Number(trimmedAge) : null
    if (trimmedAge && (!Number.isFinite(age) || (age as number) < 0 || (age as number) > 150)) {
      toast.error(t('admin.users.profile.invalidAge'))
      return
    }

    setSaving(true)
    try {
      await adminApi.updateProfile(user.id, {
        handle: form.handle.trim() || null,
        displayName: form.displayName.trim() || null,
        bio: form.bio.trim() || null,
        profileVisibility: form.profileVisibility,
        libraryVisibility: form.libraryVisibility,
        wishlistVisibility: form.wishlistVisibility,
      })
      await adminApi.updateAge(user.id, age as number)
      await adminApi.updateTimezone(user.id, form.timezone.trim())
      await adminApi.updateFirstDayOfWeek(user.id, form.firstDayOfWeek)
      toast.success(t('admin.users.profile.saveSuccess'))
      fetchUser()
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('admin.users.profile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

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
      toast.success(t('admin.users.deleteSuccess', { identity: identify(user) }))
      navigate('/admin')
    } catch {
      toast.error(t('admin.users.deleteFailed'))
      setDeleteDialogOpen(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  if (notFound || !user || !form) {
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

  const deleteConfirmText = identify(user)

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
            {user.email || t('admin.users.noEmail')}
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t('admin.users.tabs.profile')}</TabsTrigger>
          <TabsTrigger value="playthroughs">{t('admin.users.tabs.playthroughs')}</TabsTrigger>
          <TabsTrigger value="danger">{t('admin.users.tabs.danger')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface/90 p-4 backdrop-blur-xl sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="admin-display-name" className="mb-1 block text-body-sm font-semibold">
                  {t('admin.users.profile.displayName')}
                </Label>
                <Input
                  id="admin-display-name"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="admin-handle" className="mb-1 block text-body-sm font-semibold">
                  {t('admin.users.profile.handle')}
                </Label>
                <Input
                  id="admin-handle"
                  value={form.handle}
                  onChange={(e) => setForm({ ...form, handle: e.target.value })}
                  maxLength={30}
                  className="font-mono"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="admin-bio" className="mb-1 block text-body-sm font-semibold">
                {t('admin.users.profile.bio')}
              </Label>
              <Textarea
                id="admin-bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                maxLength={300}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="admin-age" className="mb-1 block text-body-sm font-semibold">
                  {t('admin.users.detail.age')}
                </Label>
                <Input
                  id="admin-age"
                  type="number"
                  min={0}
                  max={150}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="admin-timezone" className="mb-1 block text-body-sm font-semibold">
                  {t('admin.users.detail.timezone')}
                </Label>
                <Popover open={timezonePickerOpen} onOpenChange={setTimezonePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="admin-timezone"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      <span className={cn(!form.timezone && 'text-muted-foreground')}>
                        {form.timezone || t('settings.selectTimezone')}
                      </span>
                      <ChevronsUpDown className="size-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t('settings.selectTimezone')} />
                      <CommandList className="max-h-75">
                        <CommandEmpty>{t('settings.noTimezoneFound')}</CommandEmpty>
                        <CommandGroup>
                          {COMMON_TIMEZONES.map((tz) => (
                            <CommandItem
                              key={tz}
                              value={tz}
                              onSelect={() => {
                                setForm({ ...form, timezone: tz })
                                setTimezonePickerOpen(false)
                              }}
                            >
                              {tz}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="admin-first-day" className="mb-1 block text-body-sm font-semibold">
                  {t('admin.users.profile.firstDayOfWeek')}
                </Label>
                <Select
                  value={form.firstDayOfWeek}
                  onValueChange={(value) => setForm({ ...form, firstDayOfWeek: value as 'MONDAY' | 'SUNDAY' })}
                >
                  <SelectTrigger id="admin-first-day" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONDAY">{t('settings.monday')}</SelectItem>
                    <SelectItem value="SUNDAY">{t('settings.sunday')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {(
                [
                  ['profileVisibility', t('admin.users.detail.profile')],
                  ['libraryVisibility', t('admin.users.detail.library')],
                  ['wishlistVisibility', t('admin.users.detail.wishlist')],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <Label htmlFor={`admin-${field}`} className="mb-1 block text-body-sm font-semibold">
                    {label}
                  </Label>
                  <Select
                    value={form[field]}
                    onValueChange={(value) => setForm({ ...form, [field]: value as Visibility })}
                  >
                    <SelectTrigger id={`admin-${field}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIBILITIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`settings.profile.visibility.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-border pt-6 sm:grid-cols-2">
              {[
                [t('admin.users.detail.id'), String(user.id)],
                [t('admin.users.detail.auth0UserId'), user.auth0UserId],
                [t('admin.users.detail.createdAt'), formatDateTime(user.createdAt)],
                [t('admin.users.detail.updatedAt'), formatDateTime(user.updatedAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-body-sm font-medium text-text-secondary">{label}</dt>
                  <dd className="mt-0.5 wrap-break-word text-body-sm text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="playthroughs">
          <AdminPlaythroughsTable userId={user.id} />
        </TabsContent>

        <TabsContent value="danger">
          <div className="flex flex-col gap-8 rounded-xl border border-border bg-surface/90 p-4 backdrop-blur-xl sm:p-6">
            <section>
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
        </TabsContent>
      </Tabs>

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
        message={t('admin.users.deleteConfirmMessage', { identity: identify(user) })}
        confirmText={t('admin.users.deleteAccount')}
        requiredText={deleteConfirmText}
      />
    </div>
  )
}

export default AdminUserDetail
