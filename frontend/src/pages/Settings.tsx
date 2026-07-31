import { useTranslation } from 'react-i18next'
import { useTimeFormat } from '../contexts/TimeFormatContext'
import { useWeekStart } from '../contexts/WeekStartContext'
import TypedConfirmDialog from '../components/TypedConfirmDialog'
import { Languages, Clock, Trash2, Heart, ChevronDown, ChevronUp, Globe, HardDriveUpload, Upload, CalendarDays, ChevronsUpDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { userApi } from '../services/api'
import healthApi, { HealthSettings as HealthSettingsType } from '../services/healthApi'
import backupApi, { BackupData } from '../services/backupApi'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { toast } from 'react-toastify'
import { User } from '../types'
import { COMMON_TIMEZONES } from '../utils/timezones'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

const LANGUAGES: { code: string; flag: string; key: string }[] = [
  { code: 'af', flag: '🇿🇦', key: 'afrikaans' }, { code: 'ar', flag: '🇸🇦', key: 'arabic' },
  { code: 'bn', flag: '🇧🇩', key: 'bengali' }, { code: 'bg', flag: '🇧🇬', key: 'bulgarian' },
  { code: 'zh', flag: '🇨🇳', key: 'chinese' }, { code: 'hr', flag: '🇭🇷', key: 'croatian' },
  { code: 'cs', flag: '🇨🇿', key: 'czech' }, { code: 'da', flag: '🇩🇰', key: 'danish' },
  { code: 'nl', flag: '🇳🇱', key: 'dutch' }, { code: 'en', flag: '🇬🇧', key: 'english' },
  { code: 'et', flag: '🇪🇪', key: 'estonian' }, { code: 'fi', flag: '🇫🇮', key: 'finnish' },
  { code: 'fr', flag: '🇫🇷', key: 'french' }, { code: 'de', flag: '🇩🇪', key: 'german' },
  { code: 'el', flag: '🇬🇷', key: 'greek' }, { code: 'hu', flag: '🇭🇺', key: 'hungarian' },
  { code: 'hi', flag: '🇮🇳', key: 'hindi' }, { code: 'is', flag: '🇮🇸', key: 'icelandic' },
  { code: 'id', flag: '🇮🇩', key: 'indonesian' }, { code: 'it', flag: '🇮🇹', key: 'italian' },
  { code: 'ja', flag: '🇯🇵', key: 'japanese' }, { code: 'ko', flag: '🇰🇷', key: 'korean' },
  { code: 'lv', flag: '🇱🇻', key: 'latvian' }, { code: 'lt', flag: '🇱🇹', key: 'lithuanian' },
  { code: 'ml', flag: '🇮🇳', key: 'malayalam' }, { code: 'no', flag: '🇳🇴', key: 'norwegian' },
  { code: 'fa', flag: '🇮🇷', key: 'persian' }, { code: 'pl', flag: '🇵🇱', key: 'polish' },
  { code: 'pt', flag: '🇵🇹', key: 'portuguese' }, { code: 'ro', flag: '🇷🇴', key: 'romanian' },
  { code: 'ru', flag: '🇷🇺', key: 'russian' }, { code: 'sr', flag: '🇷🇸', key: 'serbian' },
  { code: 'sk', flag: '🇸🇰', key: 'slovak' }, { code: 'sl', flag: '🇸🇮', key: 'slovenian' },
  { code: 'es', flag: '🇪🇸', key: 'spanish' }, { code: 'sv', flag: '🇸🇪', key: 'swedish' },
  { code: 'th', flag: '🇹🇭', key: 'thai' }, { code: 'tr', flag: '🇹🇷', key: 'turkish' },
  { code: 'uk', flag: '🇺🇦', key: 'ukrainian' }, { code: 'ur', flag: '🇵🇰', key: 'urdu' },
  { code: 'vi', flag: '🇻🇳', key: 'vietnamese' },
]

function SectionHeader({ icon, title, color }: { icon: React.ReactNode; title: string; color?: string }) {
  return (
    <div className="mb-2 flex items-center">
      <span className="mr-3" style={{ color: color ?? 'var(--color-accent)' }}>{icon}</span>
      <p className="text-h4 font-medium" style={{ color: color }}>{title}</p>
    </div>
  )
}

function Settings() {
  const { t, i18n } = useTranslation()
  const { timeFormat, setTimeFormat: setTimeFormatContext, timezone: contextTimezone, setTimezone: setTimezoneContext } = useTimeFormat()
  const { weekStart, setWeekStart: setWeekStartContext } = useWeekStart()
  const { logout, isAuthReady, isAuthenticated } = useAuthContext()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [age, setAge] = useState<number | ''>('')
  const [timezone, setTimezone] = useState<string>('')
  const [timezonePickerOpen, setTimezonePickerOpen] = useState(false)
  const [healthSettings, setHealthSettings] = useState<HealthSettingsType | null>(null)
  const [healthExpanded, setHealthExpanded] = useState(false)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [savingHealth, setSavingHealth] = useState(false)
  const [exportingBackup, setExportingBackup] = useState(false)
  const [importingBackup, setImportingBackup] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAuthReady && isAuthenticated) {
      loadHealthSettings()
      loadUserAge()
    }
  }, [isAuthReady, isAuthenticated])

  useEffect(() => {
    if (contextTimezone && !timezone) {
      setTimezone(contextTimezone)
    }
  }, [contextTimezone])

  const loadHealthSettings = async () => {
    try {
      const response = await healthApi.getHealthSettings()
      setHealthSettings(response.data)
    } catch (error) {
      // Silently fail
    } finally {
      setLoadingHealth(false)
    }
  }

  const loadUserAge = async () => {
    try {
      const response = await userApi.getCurrentUser()
      const userData = response.data as User
      if (userData.age) {
        setAge(userData.age)
      }
      if (userData.timezone) {
        setTimezone(userData.timezone)
      }
    } catch (error) {
      // Silently fail
    }
  }

  const handleSaveAge = async () => {
    try {
      await healthApi.updateUserAge(age === '' ? null : Number(age))
      toast.success(t('settings.ageUpdated'))
    } catch (error) {
      toast.error(t('settings.ageUpdateFailed'))
    }
  }

  const handleSaveTimezone = async () => {
    try {
      await userApi.updateTimezone(timezone)
      setTimezoneContext(timezone)
      toast.success(t('settings.timezoneUpdated'))
    } catch (error) {
      toast.error(t('settings.timezoneUpdateFailed'))
    }
  }

  const handleSaveHealthSettings = async () => {
    if (!healthSettings) return

    try {
      setSavingHealth(true)
      await healthApi.updateHealthSettings(healthSettings)
      toast.success(t('settings.healthSettingsSaved'))
    } catch (error) {
      toast.error(t('settings.healthSettingsFailed'))
    } finally {
      setSavingHealth(false)
    }
  }

  const handleHealthSettingChange = (key: keyof HealthSettingsType, value: any) => {
    if (!healthSettings) return
    setHealthSettings({ ...healthSettings, [key]: value })
  }

  const handleWeekStartChange = async (newWeekStart: string) => {
    try {
      await userApi.updateFirstDayOfWeek(newWeekStart as 'MONDAY' | 'SUNDAY')
      setWeekStartContext(newWeekStart as 'MONDAY' | 'SUNDAY')
      toast.success(t('settings.firstDayUpdated'))
    } catch (error) {
      toast.error(t('settings.firstDayUpdateFailed'))
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true)
      setDeleteError(null)
      await userApi.deleteAccount()
      logout()
      navigate('/')
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account. Please try again.')
      setDeleting(false)
    }
  }

  const handleExportBackup = async () => {
    try {
      setExportingBackup(true)
      const response = await backupApi.exportBackup()
      const backup = response.data

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      const timestamp = new Date(backup.timestamp).toISOString().replace(/[:.]/g, '-').slice(0, -5)
      link.href = url
      link.download = `backup_${timestamp}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(t('settings.backupExported'))
    } catch (error: any) {
      console.error('Export backup error:', error)
      toast.error(t('settings.backupExportFailed'))
    } finally {
      setExportingBackup(false)
    }
  }

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImportingBackup(true)

      const text = await file.text()
      const backup: BackupData = JSON.parse(text)

      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup file format')
      }

      await backupApi.importBackup(backup)

      toast.success(t('settings.backupImported'))

      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      console.error('Import backup error:', error)
      if (error.message === 'Invalid backup file format') {
        toast.error(t('settings.invalidBackupFormat'))
      } else if (error.response?.status === 400) {
        toast.error(t('settings.incompatibleBackup'))
      } else {
        toast.error(t('settings.backupImportFailed'))
      }
    } finally {
      setImportingBackup(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="my-8">
        <h1 className="mb-8 text-h2 font-medium text-text-primary">{t('settings.title')}</h1>

        <div className="rounded-xl border border-border bg-surface/90 p-8 backdrop-blur-xl">
          <div className="mb-8">
            <SectionHeader icon={<Languages className="size-5" />} title={t('settings.language')} />
            <p className="mb-4 text-body-sm text-text-secondary">{t('settings.languageDescription')}</p>
            <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('settings.language')} />
              </SelectTrigger>
              <SelectContent className="max-h-62.5">
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.flag} {t(`settings.${lang.key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-8" />

          <div className="mb-8">
            <SectionHeader icon={<Clock className="size-5" />} title={t('settings.timeFormat')} />
            <p className="mb-4 text-body-sm text-text-secondary">{t('settings.timeFormatDescription')}</p>
            <Select value={timeFormat} onValueChange={(v) => setTimeFormatContext(v as '12h' | '24h')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('settings.timeFormat')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">{t('settings.format24h')}</SelectItem>
                <SelectItem value="12h">{t('settings.format12h')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-8" />

          <div className="mb-8">
            <SectionHeader icon={<CalendarDays className="size-5" />} title={t('settings.firstDayOfWeek')} />
            <p className="mb-4 text-body-sm text-text-secondary">{t('settings.firstDayOfWeekDescription')}</p>
            <Select value={weekStart} onValueChange={handleWeekStartChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('settings.firstDayOfWeek')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONDAY">{t('settings.monday')}</SelectItem>
                <SelectItem value="SUNDAY">{t('settings.sunday')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-8" />

          <div className="mb-8">
            <SectionHeader icon={<Globe className="size-5" />} title={t('settings.timezone')} />
            <p className="mb-4 text-body-sm text-text-secondary">{t('settings.timezoneDescription')}</p>
            <div className="flex items-start gap-2">
              <Popover open={timezonePickerOpen} onOpenChange={setTimezonePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="h-14 flex-1 justify-between font-normal">
                    <span className={cn(!timezone && 'text-muted-foreground')}>
                      {timezone || t('settings.selectTimezone')}
                    </span>
                    <ChevronsUpDown className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('settings.selectTimezone')} />
                    <CommandList className="max-h-75">
                      <CommandEmpty>No timezone found.</CommandEmpty>
                      <CommandGroup>
                        {COMMON_TIMEZONES.map((tz) => (
                          <CommandItem
                            key={tz}
                            value={tz}
                            onSelect={() => {
                              setTimezone(tz)
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
              <Button onClick={handleSaveTimezone} disabled={!timezone} className="h-14 whitespace-nowrap px-6">
                {t('settings.save')}
              </Button>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="mb-8">
            <button
              type="button"
              onClick={() => setHealthExpanded(!healthExpanded)}
              className="mb-2 flex w-full items-center text-left hover:opacity-80"
            >
              <Heart className="mr-3 size-5 text-pink-500" />
              <p className="flex-1 text-h4 font-medium">{t('settings.healthWellness')}</p>
              {healthExpanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
            </button>

            <p className="mb-4 text-body-sm text-text-secondary">{t('settings.healthDescription')}</p>

            <Collapsible open={healthExpanded}>
              <CollapsibleContent>
                <div className="mt-4">
                  <div className="mb-6">
                    <p className="mb-1 text-body-sm font-semibold">{t('settings.yourAge')}</p>
                    <p className="mb-3 text-body-sm text-text-secondary">{t('settings.ageDescription')}</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={150}
                        value={age}
                        onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={t('settings.enterAge')}
                        className="w-37.5"
                      />
                      <Button variant="outline" size="sm" onClick={handleSaveAge}>
                        {t('settings.saveAge')}
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {healthSettings && (
                    <>
                      <div className="mb-6">
                        <p className="mb-3 text-body-sm font-semibold">{t('settings.notificationsReminders')}</p>

                        <label className="mb-2 flex items-center gap-3">
                          <Switch
                            checked={healthSettings.notificationsEnabled}
                            onCheckedChange={(checked) => handleHealthSettingChange('notificationsEnabled', checked)}
                          />
                          <span className="text-body-sm">{t('settings.enableNotifications')}</span>
                        </label>

                        <label className="mb-2 ml-6 flex items-center gap-3">
                          <Switch
                            checked={healthSettings.soundsEnabled}
                            onCheckedChange={(checked) => handleHealthSettingChange('soundsEnabled', checked)}
                            disabled={!healthSettings.notificationsEnabled}
                          />
                          <span className="text-body-sm">{t('settings.enableSounds')}</span>
                        </label>

                        <Separator className="my-4" />

                        <label className="mb-2 flex items-center gap-3">
                          <Switch
                            checked={healthSettings.breakReminderEnabled}
                            onCheckedChange={(checked) => handleHealthSettingChange('breakReminderEnabled', checked)}
                            disabled={!healthSettings.notificationsEnabled}
                          />
                          <span className="text-body-sm">{t('settings.breakReminder', { minutes: healthSettings.breakIntervalMinutes })}</span>
                        </label>

                        <label className="mb-2 flex items-center gap-3">
                          <Switch
                            checked={healthSettings.hydrationReminderEnabled}
                            onCheckedChange={(checked) => handleHealthSettingChange('hydrationReminderEnabled', checked)}
                            disabled={!healthSettings.notificationsEnabled}
                          />
                          <span className="text-body-sm">{t('settings.hydrationReminder', { minutes: healthSettings.hydrationIntervalMinutes })}</span>
                        </label>

                        <label className="flex items-center gap-3">
                          <Switch
                            checked={healthSettings.standReminderEnabled}
                            onCheckedChange={(checked) => handleHealthSettingChange('standReminderEnabled', checked)}
                            disabled={!healthSettings.notificationsEnabled}
                          />
                          <span className="text-body-sm">{t('settings.standReminder', { minutes: healthSettings.standIntervalMinutes })}</span>
                        </label>
                      </div>

                      <Separator className="my-6" />

                      <div className="mb-6">
                        <p className="mb-3 text-body-sm font-semibold">{t('settings.gamingGoals')}</p>

                        <label className="mb-3 flex items-center gap-3">
                          <Switch
                            checked={healthSettings.goalsEnabled}
                            onCheckedChange={(checked) => handleHealthSettingChange('goalsEnabled', checked)}
                          />
                          <span className="text-body-sm">{t('settings.enableGoals')}</span>
                        </label>

                        {healthSettings.goalsEnabled && (
                          <div className="ml-6">
                            <div className="mb-3 flex items-center gap-3">
                              <label className="flex items-center gap-3">
                                <Switch
                                  checked={healthSettings.maxHoursPerDayEnabled}
                                  onCheckedChange={(checked) => handleHealthSettingChange('maxHoursPerDayEnabled', checked)}
                                />
                                <span className="text-body-sm">{t('settings.maxHoursPerDay')}</span>
                              </label>
                              {healthSettings.maxHoursPerDayEnabled && (
                                <Input
                                  type="number"
                                  min={0.5}
                                  max={24}
                                  step={0.5}
                                  value={healthSettings.maxHoursPerDay || ''}
                                  onChange={(e) => handleHealthSettingChange('maxHoursPerDay', Number(e.target.value))}
                                  className="w-25"
                                />
                              )}
                            </div>

                            <div className="mb-3 flex items-center gap-3">
                              <label className="flex items-center gap-3">
                                <Switch
                                  checked={healthSettings.maxSessionsPerDayEnabled}
                                  onCheckedChange={(checked) => handleHealthSettingChange('maxSessionsPerDayEnabled', checked)}
                                />
                                <span className="text-body-sm">{t('settings.maxSessionsPerDay')}</span>
                              </label>
                              {healthSettings.maxSessionsPerDayEnabled && (
                                <Input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={healthSettings.maxSessionsPerDay || ''}
                                  onChange={(e) => handleHealthSettingChange('maxSessionsPerDay', Number(e.target.value))}
                                  className="w-25"
                                />
                              )}
                            </div>

                            <div className="mb-3 flex items-center gap-3">
                              <label className="flex items-center gap-3">
                                <Switch
                                  checked={healthSettings.maxHoursPerWeekEnabled}
                                  onCheckedChange={(checked) => handleHealthSettingChange('maxHoursPerWeekEnabled', checked)}
                                />
                                <span className="text-body-sm">{t('settings.maxHoursPerWeek')}</span>
                              </label>
                              {healthSettings.maxHoursPerWeekEnabled && (
                                <Input
                                  type="number"
                                  min={1}
                                  max={168}
                                  step={1}
                                  value={healthSettings.maxHoursPerWeek || ''}
                                  onChange={(e) => handleHealthSettingChange('maxHoursPerWeek', Number(e.target.value))}
                                  className="w-25"
                                />
                              )}
                            </div>

                            <label className="flex items-center gap-3">
                              <Switch
                                checked={healthSettings.goalNotificationsEnabled}
                                onCheckedChange={(checked) => handleHealthSettingChange('goalNotificationsEnabled', checked)}
                              />
                              <span className="text-body-sm">{t('settings.showGoalNotifications')}</span>
                            </label>
                          </div>
                        )}
                      </div>

                      <Separator className="my-6" />

                      <div className="mb-6">
                        <p className="mb-3 text-body-sm font-semibold">{t('settings.moodTracking')}</p>

                        <label className="mb-2 flex items-center gap-3">
                          <Switch
                            checked={healthSettings.moodPromptEnabled}
                            onCheckedChange={(checked) => handleHealthSettingChange('moodPromptEnabled', checked)}
                          />
                          <span className="text-body-sm">{t('settings.promptMoodAfterSession')}</span>
                        </label>

                        {healthSettings.moodPromptEnabled && (
                          <label className="ml-6 flex items-center gap-3">
                            <Switch
                              checked={healthSettings.moodPromptRequired}
                              onCheckedChange={(checked) => handleHealthSettingChange('moodPromptRequired', checked)}
                            />
                            <span className="text-body-sm">{t('settings.moodRequired')}</span>
                          </label>
                        )}
                      </div>

                      <Button onClick={handleSaveHealthSettings} disabled={savingHealth} className="px-8">
                        {savingHealth ? t('settings.savingHealthSettings') : t('settings.saveHealthSettings')}
                      </Button>
                    </>
                  )}

                  {loadingHealth && (
                    <p className="py-6 text-center text-text-secondary">{t('settings.loadingHealthSettings')}</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <Separator className="my-8" />

          <div className="mb-8">
            <SectionHeader icon={<HardDriveUpload className="size-5" />} title={t('settings.dataBackup')} />
            <p className="mb-6 text-body-sm text-text-secondary">{t('settings.backupDescription')}</p>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleExportBackup}
                disabled={exportingBackup}
                className="bg-linear-to-br from-[#667eea] to-[#764ba2] px-6 hover:from-[#5568d3] hover:to-[#663a8e]"
              >
                <HardDriveUpload className="size-4" />
                {exportingBackup ? t('settings.exportingBackup') : t('settings.saveBackup')}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />

              <Button
                variant="outline"
                onClick={handleImportClick}
                disabled={importingBackup}
                className="border-accent px-6 text-accent hover:bg-accent/8"
              >
                <Upload className="size-4" />
                {importingBackup ? t('settings.importingBackup') : t('settings.importBackup')}
              </Button>
            </div>

            <div className="mt-4 rounded-md bg-accent/8 p-4">
              <p className="mb-1 text-body-sm font-semibold">{t('settings.backupIncludesTitle')}</p>
              <p className="text-body-sm text-text-secondary">
                {t('settings.backupIncludesGames')}<br />
                {t('settings.backupIncludesPlaythroughs')}<br />
                {t('settings.backupIncludesSessions')}<br />
                {t('settings.backupIncludesMood')}<br />
                {t('settings.backupIncludesTimers')}
              </p>
            </div>
          </div>

          <Separator className="my-8" />

          <div>
            <SectionHeader icon={<Trash2 className="size-5" />} title={t('settings.dangerZone')} color="var(--color-danger)" />
            <p className="mb-4 text-body-sm text-text-secondary">{t('settings.dangerZoneDescription')}</p>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="border-destructive text-destructive hover:bg-destructive/8"
            >
              <Trash2 className="size-4" />
              {t('settings.deleteAccount')}
            </Button>
          </div>
        </div>

        <TypedConfirmDialog
          open={deleteDialogOpen}
          onClose={() => !deleting && setDeleteDialogOpen(false)}
          onConfirm={handleDeleteAccount}
          title={t('settings.deleteAccountTitle')}
          message={
            <div className="text-left">
              <p className="mb-2 font-semibold text-accent">{t('settings.deleteAccountTip')}</p>
              <p className="mb-2">{t('settings.deleteAccountBackupTip')}</p>
              <p>{t('settings.deleteAccountConfirm')}</p>
              <ul className="mt-2 list-disc pl-5">
                <li className="text-body-sm text-text-secondary">{t('settings.deleteAccountGames')}</li>
                <li className="text-body-sm text-text-secondary">{t('settings.deleteAccountPlaythroughs')}</li>
                <li className="text-body-sm text-text-secondary">{t('settings.deleteAccountStats')}</li>
              </ul>
              <p className="mt-2 font-bold text-destructive">{t('settings.deleteAccountWarning')}</p>
              {deleteError && <p className="mt-2 text-destructive">{deleteError}</p>}
            </div>
          }
          confirmText={t('settings.deleteAccount')}
          requiredText={t('settings.deleteAccountRequired')}
          destructive
        />
      </div>
    </div>
  )
}

export default Settings
