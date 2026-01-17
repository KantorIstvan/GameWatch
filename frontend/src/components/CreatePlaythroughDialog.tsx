import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Box,
  Slide,
  alpha,
  useTheme,
  Autocomplete,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import React from 'react'
import { Close, PlaylistAdd } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { Game } from '../types'

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

interface CreatePlaythroughDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  games: Game[]
  selectedGame: Game | null
  setSelectedGame: (game: Game | null) => void
  playthroughType: string
  setPlaythroughType: (type: string) => void
  playthroughTitle: string
  setPlaythroughTitle: (title: string) => void
  platform: string
  setPlatform: (platform: string) => void
  startDate: string
  setStartDate: (date: string) => void
}

function CreatePlaythroughDialog({
  open,
  onClose,
  onSubmit,
  games,
  selectedGame,
  setSelectedGame,
  playthroughType,
  setPlaythroughType,
  playthroughTitle,
  setPlaythroughTitle,
  platform,
  setPlatform,
  startDate,
  setStartDate,
}: CreatePlaythroughDialogProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  const availablePlatforms = React.useMemo(() => {
    if (!selectedGame?.platforms) return []
    return selectedGame.platforms.split(',').map(p => p.trim()).filter(Boolean)
  }, [selectedGame])

  React.useEffect(() => {
    if (selectedGame && platform && !availablePlatforms.includes(platform)) {
      setPlatform('')
    }
  }, [selectedGame, platform, availablePlatforms, setPlatform])

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      fullScreen={false}
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: theme.palette.mode === 'dark' 
            ? `0 8px 32px ${alpha('#000000', 0.6)}` 
            : `0 8px 32px ${alpha('#000000', 0.15)}`,
          overflow: 'visible',
          m: { xs: 2, sm: 3 },
          maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
            : theme.palette.background.paper,
        }
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: { xs: 4, sm: 8 },
          top: { xs: 4, sm: 8 },
          color: theme.palette.text.secondary,
          transition: 'all 0.2s ease-in-out',
          minWidth: 44,
          minHeight: 44,
          '&:hover': {
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            transform: 'rotate(90deg)',
          }
        }}
      >
        <Close />
      </IconButton>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          pt: { xs: 3, sm: 4 },
          pb: 2,
        }}
      >
        <Box
          sx={{
            width: { xs: 64, sm: 80 },
            height: { xs: 64, sm: 80 },
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            color: theme.palette.primary.main,
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': {
                boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.4)}`,
              },
              '50%': {
                boxShadow: `0 0 0 10px ${alpha(theme.palette.primary.main, 0)}`,
              },
            },
          }}
        >
          <PlaylistAdd sx={{ fontSize: { xs: 40, sm: 48 } }} />
        </Box>
      </Box>

      <DialogTitle 
        sx={{ 
          textAlign: 'center',
          pt: 2,
          pb: 1,
          px: { xs: 2, sm: 3, md: 4 },
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 600,
        }}
      >
        {t('playthrough.create')}
      </DialogTitle>
      
      <DialogContent sx={{ px: { xs: 2, sm: 3, md: 4 }, pb: 2 }}>
        <Autocomplete
          fullWidth
          options={games}
          getOptionLabel={(option) => option.name}
          value={selectedGame}
          onChange={(_, newValue) => setSelectedGame(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('playthrough.selectGame')}
              margin="normal"
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
            />
          )}
          ListboxProps={{
            style: {
              maxHeight: '250px',
            },
          }}
          sx={{ mt: 1 }}
        />
        <TextField
          fullWidth
          label={t('playthrough.playthroughTitle')}
          value={playthroughTitle}
          onChange={(e) => setPlaythroughTitle(e.target.value)}
          margin="normal"
          placeholder={selectedGame ? `${selectedGame.name} playthrough` : ''}
          helperText={t('playthrough.playthroughTitleHelper')}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              },
            },
          }}
        />
        <TextField
          select
          fullWidth
          label={t('playthrough.type')}
          value={playthroughType}
          onChange={(e) => setPlaythroughType(e.target.value)}
          margin="normal"
          required
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              },
            },
          }}
        >
          <MenuItem value="story">Story</MenuItem>
          <MenuItem value="100%">100%</MenuItem>
          <MenuItem value="speedrun">Speedrun</MenuItem>
          <MenuItem value="casual">Casual</MenuItem>
        </TextField>
        <TextField
          select
          fullWidth
          label={t('playthrough.platform')}
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          margin="normal"
          required
          disabled={!selectedGame || availablePlatforms.length === 0}
          helperText={!selectedGame ? t('playthrough.selectGameFirst') : availablePlatforms.length === 0 ? t('playthrough.noPlatformsAvailable') : ''}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              },
            },
          }}
        >
          {availablePlatforms.map((p) => (
            <MenuItem key={p} value={p}>
              {p}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          label={t('playthrough.startDate')}
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          margin="normal"
          required
          InputLabelProps={{
            shrink: true,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              minHeight: 48,
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              },
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3, md: 4 }, pb: 3, pt: 2, gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          size="large"
          fullWidth
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            borderWidth: 2,
            minHeight: 48,
            '&:hover': {
              borderWidth: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
            }
          }}
        >
          {t('common.cancel')}
        </Button>
        <Button 
          onClick={onSubmit} 
          variant="contained" 
          color="primary"
          size="large"
          fullWidth
          disabled={!selectedGame || !playthroughType || !platform || !startDate}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 48,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
              transform: 'translateY(-1px)',
            },
            '&.Mui-disabled': {
              boxShadow: 'none',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {t('playthrough.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreatePlaythroughDialog
