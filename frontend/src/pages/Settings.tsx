import { Container, Paper, Typography, Box, FormControl, InputLabel, Select, MenuItem, Divider, Button, TextField, Switch, FormControlLabel, Collapse, Autocomplete } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { useTimeFormat } from '../contexts/TimeFormatContext'
import { useWeekStart } from '../contexts/WeekStartContext'
import TypedConfirmDialog from '../components/TypedConfirmDialog'
import { Language, Schedule, DeleteForever, Favorite, ExpandMore, ExpandLess, Public, Backup, Upload, CalendarToday } from '@mui/icons-material'
import { useState, useEffect, useRef } from 'react'
import { userApi } from '../services/api'
import healthApi, { HealthSettings as HealthSettingsType } from '../services/healthApi'
import backupApi, { BackupData } from '../services/backupApi'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { toast } from 'react-toastify'
import { User } from '../types'
import { COMMON_TIMEZONES } from '../utils/timezones'

function Settings() {
  const { t, i18n } = useTranslation()
  const { mode } = useTheme()
  const { timeFormat, setTimeFormat: setTimeFormatContext, timezone: contextTimezone, setTimezone: setTimezoneContext } = useTimeFormat()
  const { weekStart, setWeekStart: setWeekStartContext } = useWeekStart()
  const { logout, isAuthReady, isAuthenticated } = useAuthContext()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Health settings state
  const [age, setAge] = useState<number | ''>('')
  const [timezone, setTimezone] = useState<string>('')
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

  // Initialize timezone from context
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
      setTimezoneContext(timezone) // Update context with new timezone
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

  const handleLanguageChange = (event: any) => {
    i18n.changeLanguage(event.target.value)
  }

  const handleTimeFormatChange = (event: any) => {
    setTimeFormatContext(event.target.value)
  }

  const handleWeekStartChange = async (event: any) => {
    const newWeekStart = event.target.value as 'MONDAY' | 'SUNDAY'
    try {
      await userApi.updateFirstDayOfWeek(newWeekStart)
      setWeekStartContext(newWeekStart)
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

      // Create a blob and download
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      // Generate filename with timestamp
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
      
      // Read the file
      const text = await file.text()
      const backup: BackupData = JSON.parse(text)

      // Validate backup structure
      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup file format')
      }

      // Import the backup
      await backupApi.importBackup(backup)
      
      toast.success(t('settings.backupImported'))
      
      // Refresh the page after a short delay to show all imported data
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
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{
            fontWeight: 500,
            mb: 4,
            color: mode === 'light' ? '#212529' : '#ffffff'
          }}
        >
          {t('settings.title')}
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            backgroundColor: mode === 'light' 
              ? 'rgba(255, 255, 255, 0.9)' 
              : 'rgba(33, 37, 41, 0.5)',
            border: '1px solid',
            borderColor: mode === 'light' 
              ? 'rgba(0, 0, 0, 0.08)' 
              : 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Language Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Language sx={{ mr: 1.5, color: '#667eea' }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 500,
                  color: mode === 'light' ? '#212529' : '#ffffff'
                }}
              >
                {t('settings.language')}
              </Typography>
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 2,
                color: mode === 'light' ? '#6c757d' : '#a0a0a0'
              }}
            >
              {t('settings.languageDescription')}
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="language-select-label">{t('settings.language')}</InputLabel>
              <Select
                labelId="language-select-label"
                id="language-select"
                value={i18n.language}
                label={t('settings.language')}
                onChange={handleLanguageChange}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 48 * 5 + 8,
                    },
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: mode === 'light' 
                      ? 'rgba(0, 0, 0, 0.12)' 
                      : 'rgba(255, 255, 255, 0.12)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: mode === 'light' 
                      ? 'rgba(102, 126, 234, 0.5)' 
                      : 'rgba(139, 154, 247, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#667eea',
                  },
                }}
              >
                <MenuItem value="af">🇿🇦 {t('settings.afrikaans')}</MenuItem>
                <MenuItem value="ar">🇸🇦 {t('settings.arabic')}</MenuItem>
                <MenuItem value="bn">🇧🇩 {t('settings.bengali')}</MenuItem>
                <MenuItem value="bg">🇧🇬 {t('settings.bulgarian')}</MenuItem>
                <MenuItem value="zh">🇨🇳 {t('settings.chinese')}</MenuItem>
                <MenuItem value="hr">🇭🇷 {t('settings.croatian')}</MenuItem>
                <MenuItem value="cs">🇨🇿 {t('settings.czech')}</MenuItem>
                <MenuItem value="da">🇩🇰 {t('settings.danish')}</MenuItem>
                <MenuItem value="nl">🇳🇱 {t('settings.dutch')}</MenuItem>
                <MenuItem value="en">🇬🇧 {t('settings.english')}</MenuItem>
                <MenuItem value="et">🇪🇪 {t('settings.estonian')}</MenuItem>
                <MenuItem value="fi">🇫🇮 {t('settings.finnish')}</MenuItem>
                <MenuItem value="fr">🇫🇷 {t('settings.french')}</MenuItem>
                <MenuItem value="de">🇩🇪 {t('settings.german')}</MenuItem>
                <MenuItem value="el">🇬🇷 {t('settings.greek')}</MenuItem>
                <MenuItem value="hu">🇭🇺 {t('settings.hungarian')}</MenuItem>
                <MenuItem value="hi">🇮🇳 {t('settings.hindi')}</MenuItem>
                <MenuItem value="is">🇮🇸 {t('settings.icelandic')}</MenuItem>
                <MenuItem value="id">🇮🇩 {t('settings.indonesian')}</MenuItem>
                <MenuItem value="it">🇮🇹 {t('settings.italian')}</MenuItem>
                <MenuItem value="ja">🇯🇵 {t('settings.japanese')}</MenuItem>
                <MenuItem value="ko">🇰🇷 {t('settings.korean')}</MenuItem>
                <MenuItem value="lv">🇱🇻 {t('settings.latvian')}</MenuItem>
                <MenuItem value="lt">🇱🇹 {t('settings.lithuanian')}</MenuItem>
                <MenuItem value="ml">🇮🇳 {t('settings.malayalam')}</MenuItem>
                <MenuItem value="no">🇳🇴 {t('settings.norwegian')}</MenuItem>
                <MenuItem value="fa">🇮🇷 {t('settings.persian')}</MenuItem>
                <MenuItem value="pl">🇵🇱 {t('settings.polish')}</MenuItem>
                <MenuItem value="pt">🇵🇹 {t('settings.portuguese')}</MenuItem>
                <MenuItem value="ro">🇷🇴 {t('settings.romanian')}</MenuItem>
                <MenuItem value="ru">🇷🇺 {t('settings.russian')}</MenuItem>
                <MenuItem value="sr">🇷🇸 {t('settings.serbian')}</MenuItem>
                <MenuItem value="sk">🇸🇰 {t('settings.slovak')}</MenuItem>
                <MenuItem value="sl">🇸🇮 {t('settings.slovenian')}</MenuItem>
                <MenuItem value="es">🇪🇸 {t('settings.spanish')}</MenuItem>
                <MenuItem value="sv">🇸🇪 {t('settings.swedish')}</MenuItem>
                <MenuItem value="th">🇹🇭 {t('settings.thai')}</MenuItem>
                <MenuItem value="tr">🇹🇷 {t('settings.turkish')}</MenuItem>
                <MenuItem value="uk">🇺🇦 {t('settings.ukrainian')}</MenuItem>
                <MenuItem value="ur">🇵🇰 {t('settings.urdu')}</MenuItem>
                <MenuItem value="vi">🇻🇳 {t('settings.vietnamese')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ 
            my: 4,
            borderColor: mode === 'light' 
              ? 'rgba(0, 0, 0, 0.08)' 
              : 'rgba(255, 255, 255, 0.08)'
          }} />

          {/* Time Format Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Schedule sx={{ mr: 1.5, color: '#667eea' }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 500,
                  color: mode === 'light' ? '#212529' : '#ffffff'
                }}
              >
                {t('settings.timeFormat')}
              </Typography>
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 2,
                color: mode === 'light' ? '#6c757d' : '#a0a0a0'
              }}
            >
              {t('settings.timeFormatDescription')}
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="time-format-select-label">{t('settings.timeFormat')}</InputLabel>
              <Select
                labelId="time-format-select-label"
                id="time-format-select"
                value={timeFormat}
                label={t('settings.timeFormat')}
                onChange={handleTimeFormatChange}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: mode === 'light' 
                      ? 'rgba(0, 0, 0, 0.12)' 
                      : 'rgba(255, 255, 255, 0.12)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: mode === 'light' 
                      ? 'rgba(102, 126, 234, 0.5)' 
                      : 'rgba(139, 154, 247, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#667eea',
                  },
                }}
              >
                <MenuItem value="24h">{t('settings.format24h')}</MenuItem>
                <MenuItem value="12h">{t('settings.format12h')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ 
            my: 4,
            borderColor: mode === 'light' 
              ? 'rgba(0, 0, 0, 0.08)' 
              : 'rgba(255, 255, 255, 0.08)'
          }} />

          {/* First Day of Week Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarToday sx={{ mr: 1.5, color: '#667eea' }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 500,
                  color: mode === 'light' ? '#212529' : '#ffffff'
                }}
              >
                {t('settings.firstDayOfWeek')}
              </Typography>
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 2,
                color: mode === 'light' ? '#6c757d' : '#a0a0a0'
              }}
            >
              {t('settings.firstDayOfWeekDescription')}
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="week-start-select-label">{t('settings.firstDayOfWeek')}</InputLabel>
              <Select
                labelId="week-start-select-label"
                id="week-start-select"
                value={weekStart}
                label={t('settings.firstDayOfWeek')}
                onChange={handleWeekStartChange}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: mode === 'light' 
                      ? 'rgba(0, 0, 0, 0.12)' 
                      : 'rgba(255, 255, 255, 0.12)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: mode === 'light' 
                      ? 'rgba(102, 126, 234, 0.5)' 
                      : 'rgba(139, 154, 247, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#667eea',
                  },
                }}
              >
                <MenuItem value="MONDAY">{t('settings.monday')}</MenuItem>
                <MenuItem value="SUNDAY">{t('settings.sunday')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ 
            my: 4,
            borderColor: mode === 'light' 
              ? 'rgba(0, 0, 0, 0.08)' 
              : 'rgba(255, 255, 255, 0.08)'
          }} />

          {/* Time Zone Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Public sx={{ mr: 1.5, color: '#667eea' }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 500,
                  color: mode === 'light' ? '#212529' : '#ffffff'
                }}
              >
                {t('settings.timezone')}
              </Typography>
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 2,
                color: mode === 'light' ? '#6c757d' : '#a0a0a0'
              }}
            >
              {t('settings.timezoneDescription')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Autocomplete
                value={timezone}
                onChange={(_, newValue) => setTimezone(newValue || '')}
                options={COMMON_TIMEZONES}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('settings.timezone')}
                    placeholder={t('settings.selectTimezone')}
                  />
                )}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: mode === 'light' 
                        ? 'rgba(0, 0, 0, 0.12)' 
                        : 'rgba(255, 255, 255, 0.12)',
                    },
                    '&:hover fieldset': {
                      borderColor: mode === 'light' 
                        ? 'rgba(102, 126, 234, 0.5)' 
                        : 'rgba(139, 154, 247, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
              />
              <Button 
                variant="contained" 
                onClick={handleSaveTimezone}
                disabled={!timezone}
                sx={{
                  px: 3,
                  height: 56,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('settings.save')}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ 
            my: 4,
            borderColor: mode === 'light' 
              ? 'rgba(0, 0, 0, 0.08)' 
              : 'rgba(255, 255, 255, 0.08)'
          }} />

          {/* Health Settings Section */}
          <Box sx={{ mb: 4 }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2, 
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 }
              }}
              onClick={() => setHealthExpanded(!healthExpanded)}
            >
              <Favorite sx={{ mr: 1.5, color: '#e91e63' }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 500,
                  color: mode === 'light' ? '#212529' : '#ffffff',
                  flexGrow: 1
                }}
              >
                {t('settings.healthWellness')}
              </Typography>
              {healthExpanded ? <ExpandLess /> : <ExpandMore />}
            </Box>
            
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 2,
                color: mode === 'light' ? '#6c757d' : '#a0a0a0'
              }}
            >
              {t('settings.healthDescription')}
            </Typography>

            <Collapse in={healthExpanded}>
              <Box sx={{ mt: 3 }}>
                {/* Age Setting */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    {t('settings.yourAge')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('settings.ageDescription')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={t('settings.enterAge')}
                      size="small"
                      inputProps={{ min: 0, max: 150 }}
                      sx={{ width: 150 }}
                    />
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={handleSaveAge}
                    >
                      {t('settings.saveAge')}
                    </Button>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                {healthSettings && (
                  <>
                    {/* Notifications */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        {t('settings.notificationsReminders')}
                      </Typography>
                      
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={healthSettings.notificationsEnabled}
                            onChange={(e) => handleHealthSettingChange('notificationsEnabled', e.target.checked)}
                          />
                        }
                        label={t('settings.enableNotifications')}
                        sx={{ mb: 1, display: 'block' }}
                      />

                      <FormControlLabel
                        control={
                          <Switch 
                            checked={healthSettings.soundsEnabled}
                            onChange={(e) => handleHealthSettingChange('soundsEnabled', e.target.checked)}
                            disabled={!healthSettings.notificationsEnabled}
                          />
                        }
                        label={t('settings.enableSounds')}
                        sx={{ mb: 1, display: 'block', ml: 3 }}
                      />

                      <Divider sx={{ my: 2 }} />

                      <FormControlLabel
                        control={
                          <Switch 
                            checked={healthSettings.breakReminderEnabled}
                            onChange={(e) => handleHealthSettingChange('breakReminderEnabled', e.target.checked)}
                            disabled={!healthSettings.notificationsEnabled}
                          />
                        }
                        label={t('settings.breakReminder', { minutes: healthSettings.breakIntervalMinutes })}
                        sx={{ mb: 1, display: 'block' }}
                      />

                      <FormControlLabel
                        control={
                          <Switch 
                            checked={healthSettings.hydrationReminderEnabled}
                            onChange={(e) => handleHealthSettingChange('hydrationReminderEnabled', e.target.checked)}
                            disabled={!healthSettings.notificationsEnabled}
                          />
                        }
                        label={t('settings.hydrationReminder', { minutes: healthSettings.hydrationIntervalMinutes })}
                        sx={{ mb: 1, display: 'block' }}
                      />

                      <FormControlLabel
                        control={
                          <Switch 
                            checked={healthSettings.standReminderEnabled}
                            onChange={(e) => handleHealthSettingChange('standReminderEnabled', e.target.checked)}
                            disabled={!healthSettings.notificationsEnabled}
                          />
                        }
                        label={t('settings.standReminder', { minutes: healthSettings.standIntervalMinutes })}
                        sx={{ display: 'block' }}
                      />
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Goals */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        {t('settings.gamingGoals')}
                      </Typography>

                      <FormControlLabel
                        control={
                          <Switch 
                            checked={healthSettings.goalsEnabled}
                            onChange={(e) => handleHealthSettingChange('goalsEnabled', e.target.checked)}
                          />
                        }
                        label={t('settings.enableGoals')}
                        sx={{ mb: 2, display: 'block' }}
                      />

                      {healthSettings.goalsEnabled && (
                        <Box sx={{ ml: 3 }}>
                          <Box sx={{ mb: 2 }}>
                            <FormControlLabel
                              control={
                                <Switch 
                                  checked={healthSettings.maxHoursPerDayEnabled}
                                  onChange={(e) => handleHealthSettingChange('maxHoursPerDayEnabled', e.target.checked)}
                                />
                              }
                              label={t('settings.maxHoursPerDay')}
                            />
                            {healthSettings.maxHoursPerDayEnabled && (
                              <TextField
                                type="number"
                                value={healthSettings.maxHoursPerDay || ''}
                                onChange={(e) => handleHealthSettingChange('maxHoursPerDay', Number(e.target.value))}
                                size="small"
                                inputProps={{ min: 0.5, max: 24, step: 0.5 }}
                                sx={{ ml: 2, width: 100 }}
                              />
                            )}
                          </Box>

                          <Box sx={{ mb: 2 }}>
                            <FormControlLabel
                              control={
                                <Switch 
                                  checked={healthSettings.maxSessionsPerDayEnabled}
                                  onChange={(e) => handleHealthSettingChange('maxSessionsPerDayEnabled', e.target.checked)}
                                />
                              }
                              label={t('settings.maxSessionsPerDay')}
                            />
                            {healthSettings.maxSessionsPerDayEnabled && (
                              <TextField
                                type="number"
                                value={healthSettings.maxSessionsPerDay || ''}
                                onChange={(e) => handleHealthSettingChange('maxSessionsPerDay', Number(e.target.value))}
                                size="small"
                                inputProps={{ min: 1, max: 20 }}
                                sx={{ ml: 2, width: 100 }}
                              />
                            )}
                          </Box>

                          <Box sx={{ mb: 2 }}>
                            <FormControlLabel
                              control={
                                <Switch 
                                  checked={healthSettings.maxHoursPerWeekEnabled}
                                  onChange={(e) => handleHealthSettingChange('maxHoursPerWeekEnabled', e.target.checked)}
                                />
                              }
                              label={t('settings.maxHoursPerWeek')}
                            />
                            {healthSettings.maxHoursPerWeekEnabled && (
                              <TextField
                                type="number"
                                value={healthSettings.maxHoursPerWeek || ''}
                                onChange={(e) => handleHealthSettingChange('maxHoursPerWeek', Number(e.target.value))}
                                size="small"
                                inputProps={{ min: 1, max: 168, step: 1 }}
                                sx={{ ml: 2, width: 100 }}
                              />
                            )}
                          </Box>

                          <FormControlLabel
                            control={
                              <Switch 
                                checked={healthSettings.goalNotificationsEnabled}
                                onChange={(e) => handleHealthSettingChange('goalNotificationsEnabled', e.target.checked)}
                              />
                            }
                            label={t('settings.showGoalNotifications')}
                          />
                        </Box>
                      )}
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Mood Tracking */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        {t('settings.moodTracking')}
                      </Typography>

                      <FormControlLabel
                        control={
                          <Switch 
                            checked={healthSettings.moodPromptEnabled}
                            onChange={(e) => handleHealthSettingChange('moodPromptEnabled', e.target.checked)}
                          />
                        }
                        label={t('settings.promptMoodAfterSession')}
                        sx={{ mb: 1, display: 'block' }}
                      />

                      {healthSettings.moodPromptEnabled && (
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={healthSettings.moodPromptRequired}
                              onChange={(e) => handleHealthSettingChange('moodPromptRequired', e.target.checked)}
                            />
                          }
                          label={t('settings.moodRequired')}
                          sx={{ display: 'block', ml: 3 }}
                        />
                      )}
                    </Box>

                    {/* Save Button */}
                    <Box sx={{ mt: 3 }}>
                      <Button
                        variant="contained"
                        onClick={handleSaveHealthSettings}
                        disabled={savingHealth}
                        sx={{
                          px: 4,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        {savingHealth ? t('settings.savingHealthSettings') : t('settings.saveHealthSettings')}
                      </Button>
                    </Box>
                  </>
                )}

                {loadingHealth && (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography color="text.secondary">{t('settings.loadingHealthSettings')}</Typography>
                  </Box>
                )}
              </Box>
            </Collapse>
          </Box>

          <Divider sx={{ 
            my: 4,
            borderColor: mode === 'light' 
              ? 'rgba(0, 0, 0, 0.08)' 
              : 'rgba(255, 255, 255, 0.08)'
          }} />

          {/* Backup & Restore Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Backup sx={{ mr: 1.5, color: '#667eea' }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 500,
                  color: mode === 'light' ? '#212529' : '#ffffff'
                }}
              >
                {t('settings.dataBackup')}
              </Typography>
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 3,
                color: mode === 'light' ? '#6c757d' : '#a0a0a0'
              }}
            >
              {t('settings.backupDescription')}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Backup />}
                onClick={handleExportBackup}
                disabled={exportingBackup}
                sx={{
                  px: 3,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #663a8e 100%)',
                  },
                }}
              >
                {exportingBackup ? t('settings.exportingBackup') : t('settings.saveBackup')}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                style={{ display: 'none' }}
              />

              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={handleImportClick}
                disabled={importingBackup}
                sx={{
                  px: 3,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#667eea',
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#5568d3',
                    backgroundColor: 'rgba(102, 126, 234, 0.08)',
                  },
                }}
              >
                {importingBackup ? t('settings.importingBackup') : t('settings.importBackup')}
              </Button>
            </Box>

            <Box sx={{ 
              mt: 2, 
              p: 2, 
              borderRadius: 2,
              backgroundColor: mode === 'light' 
                ? 'rgba(102, 126, 234, 0.08)' 
                : 'rgba(102, 126, 234, 0.15)',
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                {t('settings.backupIncludesTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('settings.backupIncludesGames')}<br />
                {t('settings.backupIncludesPlaythroughs')}<br />
                {t('settings.backupIncludesSessions')}<br />
                {t('settings.backupIncludesMood')}<br />
                {t('settings.backupIncludesTimers')}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ 
            my: 4,
            borderColor: mode === 'light' 
              ? 'rgba(0, 0, 0, 0.08)' 
              : 'rgba(255, 255, 255, 0.08)'
          }} />

          {/* Danger Zone - Delete Account */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DeleteForever sx={{ mr: 1.5, color: '#d32f2f' }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 500,
                  color: '#d32f2f'
                }}
              >
                {t('settings.dangerZone')}
              </Typography>
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 2,
                color: mode === 'light' ? '#6c757d' : '#a0a0a0'
              }}
            >
              {t('settings.dangerZoneDescription')}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForever />}
              onClick={() => setDeleteDialogOpen(true)}
              sx={{
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  backgroundColor: 'rgba(211, 47, 47, 0.08)',
                },
              }}
            >
              {t('settings.deleteAccount')}
            </Button>
          </Box>
        </Paper>

        {/* Delete Confirmation Dialog */}
        <TypedConfirmDialog
          open={deleteDialogOpen}
          onClose={() => !deleting && setDeleteDialogOpen(false)}
          onConfirm={handleDeleteAccount}
          title={t('settings.deleteAccountTitle')}
          message={
            <>
              <Typography sx={{ mb: 2, fontWeight: 600, color: '#667eea' }}>
                {t('settings.deleteAccountTip')}
              </Typography>
              <Typography sx={{ mb: 2 }}>
                {t('settings.deleteAccountBackupTip')}
              </Typography>
              <Typography>
                {t('settings.deleteAccountConfirm')}
              </Typography>
              <Box component="ul" sx={{ mt: 2, pl: 2 }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  {t('settings.deleteAccountGames')}
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  {t('settings.deleteAccountPlaythroughs')}
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  {t('settings.deleteAccountStats')}
                </Typography>
              </Box>
              <Typography sx={{ mt: 2, fontWeight: 'bold', color: '#d32f2f' }}>
                {t('settings.deleteAccountWarning')}
              </Typography>
              {deleteError && (
                <Typography color="error" sx={{ mt: 2 }}>
                  {deleteError}
                </Typography>
              )}
            </>
          }
          confirmText={t('settings.deleteAccount')}
          requiredText={t('settings.deleteAccountRequired')}
          destructive
        />
      </Box>
    </Container>
  )
}

export default Settings
