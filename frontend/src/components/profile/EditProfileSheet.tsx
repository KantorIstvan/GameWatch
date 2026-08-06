import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, Lock, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SocialLinkIcon } from '@/components/ui/social-icons'
import { detectSocialPlatform, MAX_PROFILE_LINKS, normalizeProfileLink } from '@/lib/socialLinks'
import AvatarPicker from './AvatarPicker'
import { userApi } from '../../services/api'
import type { ProfileLink, ProfileSettings, Visibility } from '../../types'

const VISIBILITIES: Visibility[] = ['PRIVATE', 'FOLLOWERS', 'PUBLIC']

interface EditProfileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fires after anything is saved, so the profile behind the sheet stops being stale. */
  onSaved: () => void
}

/**
 * Everything about a profile that its owner controls, in one place.
 *
 * These fields used to live in settings, which put "how the app behaves for me" and "what
 * strangers see of me" in the same list. They are different questions, and only one of them
 * is answered by looking at the profile you are editing - so the form now opens over that
 * profile instead.
 *
 * `username` on the account comes from the Auth0 nickname claim - not chosen, not unique,
 * not editable - so it cannot address a profile. The handle claimed here is the addressable
 * identity, and everything defaults to private: sharing a play history is opt-in, and
 * nothing becomes visible because a feature shipped.
 */
function EditProfileSheet({ open, onOpenChange, onSaved }: EditProfileSheetProps) {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<ProfileSettings | null>(null)
  const [handleInput, setHandleInput] = useState('')
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)

  // Reloaded on every open rather than once: the sheet closes and reopens across a session,
  // and the second visit should not show what the first one started with.
  useEffect(() => {
    if (!open) return

    userApi
      .getProfileSettings()
      .then((response) => {
        setSettings(response.data)
        setHandleInput(response.data.handle ?? '')
      })
      .catch(() => setSettings(null))
  }, [open])

  // Debounced, because it fires per keystroke and the answer is advisory anyway - the claim
  // itself is what decides, since another account can take the handle in between.
  useEffect(() => {
    const trimmed = handleInput.trim().toLowerCase()
    if (!trimmed || trimmed === (settings?.handle ?? '')) {
      setHandleAvailable(null)
      return
    }

    setChecking(true)
    const timer = window.setTimeout(() => {
      userApi
        .isHandleAvailable(trimmed)
        .then((response) => setHandleAvailable(response.data.available))
        .catch(() => setHandleAvailable(null))
        .finally(() => setChecking(false))
    }, 400)

    return () => {
      window.clearTimeout(timer)
      setChecking(false)
    }
  }, [handleInput, settings?.handle])

  const update = useCallback((patch: Partial<ProfileSettings>) => {
    setSettings((current) => (current ? { ...current, ...patch } : current))
  }, [])

  // The picture is saved by the picker itself, so this only keeps the open form in step.
  const handlePictureChange = useCallback(
    (profilePictureUrl: string | null) => {
      update({ profilePictureUrl })
      onSaved()
    },
    [update, onSaved]
  )

  // Edited as raw text - normalizing and dropping anything unusable happens once, on
  // save, rather than fighting the person mid-keystroke over a URL they have not
  // finished typing yet.
  const updateLink = useCallback((index: number, url: string) => {
    setSettings((current) => {
      if (!current) return current
      const links = current.links.slice()
      links[index] = { url }
      return { ...current, links }
    })
  }, [])

  const addLink = useCallback(() => {
    setSettings((current) => {
      if (!current || current.links.length >= MAX_PROFILE_LINKS) return current
      return { ...current, links: [...current.links, { url: '' }] }
    })
  }, [])

  const removeLink = useCallback((index: number) => {
    setSettings((current) => {
      if (!current) return current
      return { ...current, links: current.links.filter((_, i) => i !== index) }
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!settings) return

    // Blank rows (an "Add link" click nobody filled in) are dropped silently - they were
    // never content to lose. A row with something in it that still fails to normalize is
    // different: that is the person's typing, so the save stops and says so instead of
    // quietly discarding it.
    const nonBlank = settings.links.map((link) => link.url.trim()).filter((url) => url.length > 0)
    const normalized = nonBlank.map((url) => normalizeProfileLink(url))
    if (normalized.some((url) => url === null)) {
      toast.error(t('settings.profile.links.invalid'))
      return
    }
    const links: ProfileLink[] = normalized
      .filter((url): url is string => url !== null)
      .map((url) => ({ url }))

    setSaving(true)
    try {
      const response = await userApi.updateProfileSettings({
        ...settings,
        handle: handleInput.trim() || null,
        links,
      })
      setSettings(response.data)
      setHandleInput(response.data.handle ?? '')
      toast.success(t('settings.profile.saved'))
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('settings.profile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [settings, handleInput, t, onSaved, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('settings.profile.title')}</SheetTitle>
          <SheetDescription>{t('settings.profile.description')}</SheetDescription>
        </SheetHeader>

        {settings && (
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4">
            <AvatarPicker
              value={settings.profilePictureUrl}
              fallback={(settings.handle ?? settings.displayName ?? '?').charAt(0).toUpperCase()}
              onChange={handlePictureChange}
            />

            <Separator />

            <div>
              <Label htmlFor="profile-handle" className="mb-1 block text-body-sm font-semibold">
                {t('settings.profile.handle')}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-body text-text-secondary">@</span>
                <Input
                  id="profile-handle"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  placeholder={t('settings.profile.handlePlaceholder')}
                  maxLength={30}
                  className="font-mono"
                  aria-describedby="profile-handle-hint"
                />
                {!checking && handleAvailable === true && (
                  <Check
                    className="size-5 shrink-0 text-success"
                    aria-label={t('settings.profile.handleAvailable')}
                  />
                )}
                {!checking && handleAvailable === false && (
                  <X
                    className="size-5 shrink-0 text-destructive"
                    aria-label={t('settings.profile.handleTaken')}
                  />
                )}
              </div>
              <p id="profile-handle-hint" className="mt-1 text-caption text-text-secondary">
                {t('settings.profile.handleHint')}
              </p>
            </div>

            <div>
              <Label htmlFor="profile-display-name" className="mb-1 block text-body-sm font-semibold">
                {t('settings.profile.displayName')}
              </Label>
              <Input
                id="profile-display-name"
                value={settings.displayName ?? ''}
                onChange={(e) => update({ displayName: e.target.value })}
                maxLength={50}
              />
            </div>

            <div>
              <Label htmlFor="profile-bio" className="mb-1 block text-body-sm font-semibold">
                {t('settings.profile.bio')}
              </Label>
              <Textarea
                id="profile-bio"
                value={settings.bio ?? ''}
                onChange={(e) => update({ bio: e.target.value })}
                maxLength={300}
                rows={4}
              />
              <p className="mt-1 text-caption text-text-secondary">
                {t('settings.profile.bioCount', { count: (settings.bio ?? '').length })}
              </p>
            </div>

            <div>
              <Label className="mb-1 block text-body-sm font-semibold">
                {t('settings.profile.links.title')}
              </Label>
              <p className="mb-2 text-caption text-text-secondary">
                {t('settings.profile.links.hint', { max: MAX_PROFILE_LINKS })}
              </p>
              <div className="flex flex-col gap-2">
                {settings.links.map((link, index) => {
                  const normalized = normalizeProfileLink(link.url)
                  const platform = normalized ? detectSocialPlatform(normalized) : 'website'
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-secondary">
                        <SocialLinkIcon platform={platform} className="size-4" />
                      </span>
                      <Input
                        value={link.url}
                        onChange={(e) => updateLink(index, e.target.value)}
                        placeholder={t('settings.profile.links.placeholder')}
                        maxLength={500}
                        aria-label={t('settings.profile.links.urlLabel', { index: index + 1 })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLink(index)}
                        aria-label={t('settings.profile.links.remove')}
                        className="size-11 shrink-0"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  )
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLink}
                  disabled={settings.links.length >= MAX_PROFILE_LINKS}
                  className="mt-1 min-h-11 w-fit"
                >
                  <Plus className="size-4" />
                  {t('settings.profile.links.add')}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor="profile-visibility" className="mb-1 block text-body-sm font-semibold">
                  {t('settings.profile.profileVisibility')}
                </Label>
                <Select
                  value={settings.profileVisibility}
                  onValueChange={(value) => update({ profileVisibility: value as Visibility })}
                >
                  <SelectTrigger id="profile-visibility" className="w-full">
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

              <div>
                <Label htmlFor="library-visibility" className="mb-1 block text-body-sm font-semibold">
                  {t('settings.profile.libraryVisibility')}
                </Label>
                <Select
                  value={settings.libraryVisibility}
                  onValueChange={(value) => update({ libraryVisibility: value as Visibility })}
                >
                  <SelectTrigger id="library-visibility" className="w-full">
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
                {/* The backend clamps this rather than allowing the contradiction, so say so
                    before the value silently changes under the user on save. */}
                <p className="mt-1 text-caption text-text-secondary">
                  {t('settings.profile.libraryClampHint')}
                </p>
              </div>

              <div>
                <Label htmlFor="wishlist-visibility" className="mb-1 block text-body-sm font-semibold">
                  {t('settings.profile.wishlistVisibility')}
                </Label>
                <Select
                  value={settings.wishlistVisibility}
                  onValueChange={(value) => update({ wishlistVisibility: value as Visibility })}
                >
                  <SelectTrigger id="wishlist-visibility" className="w-full">
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
                <p className="mt-1 text-caption text-text-secondary">
                  {t('settings.profile.wishlistClampHint')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-border bg-surface/60 p-3">
              <Lock className="mt-0.5 size-4 shrink-0 text-text-secondary" />
              <p className="text-caption text-text-secondary">
                {t('settings.profile.healthNeverShared')}
              </p>
            </div>
          </div>
        )}

        <SheetFooter>
          <Button onClick={handleSave} disabled={!settings || saving}>
            {saving ? t('settings.profile.saving') : t('settings.profile.save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default EditProfileSheet
