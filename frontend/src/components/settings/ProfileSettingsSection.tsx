import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, Lock, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import SettingsSection from './SettingsSection'
import { userApi } from '../../services/api'
import type { ProfileSettings, Visibility } from '../../types'

const VISIBILITIES: Visibility[] = ['PRIVATE', 'FOLLOWERS', 'PUBLIC']

/**
 * Identity and visibility.
 *
 * `username` on the account comes from the Auth0 nickname claim - not chosen, not unique,
 * not editable - so it cannot be used to address a profile. The handle claimed here is the
 * addressable identity, and everything defaults to private: sharing a play history is
 * opt-in, and nothing becomes visible because a feature shipped.
 */
function ProfileSettingsSection() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<ProfileSettings | null>(null)
  const [handleInput, setHandleInput] = useState('')
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    userApi
      .getProfileSettings()
      .then((response) => {
        setSettings(response.data)
        setHandleInput(response.data.handle ?? '')
      })
      .catch(() => setSettings(null))
  }, [])

  // Debounced, because it fires per keystroke and the answer is advisory anyway - the
  // claim itself is what decides, since another account can take the handle in between.
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

  const handleSave = useCallback(async () => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await userApi.updateProfileSettings({
        ...settings,
        handle: handleInput.trim() || null,
      })
      setSettings(response.data)
      setHandleInput(response.data.handle ?? '')
      toast.success(t('settings.profile.saved'))
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('settings.profile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [settings, handleInput, t])

  if (!settings) {
    return null
  }

  return (
    <SettingsSection
      icon={<UserRound className="size-5" />}
      title={t('settings.profile.title')}
      description={t('settings.profile.description')}
    >
      <div className="flex flex-col gap-4">
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
              <Check className="size-5 shrink-0 text-success" aria-label={t('settings.profile.handleAvailable')} />
            )}
            {!checking && handleAvailable === false && (
              <X className="size-5 shrink-0 text-destructive" aria-label={t('settings.profile.handleTaken')} />
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
            rows={3}
          />
          <p className="mt-1 text-caption text-text-secondary">
            {t('settings.profile.bioCount', { count: (settings.bio ?? '').length })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="profile-visibility" className="mb-1 block text-body-sm font-semibold">
              {t('settings.profile.profileVisibility')}
            </Label>
            <Select
              value={settings.profileVisibility}
              onValueChange={(value) => update({ profileVisibility: value as Visibility })}
            >
              <SelectTrigger id="profile-visibility">
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
              <SelectTrigger id="library-visibility">
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
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface/60 p-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-text-secondary" />
          <p className="text-caption text-text-secondary">
            {t('settings.profile.healthNeverShared')}
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="self-start">
          {saving ? t('settings.profile.saving') : t('settings.profile.save')}
        </Button>
      </div>
    </SettingsSection>
  )
}

export default ProfileSettingsSection
