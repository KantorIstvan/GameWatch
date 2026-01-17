import { Box, Typography, Stack, Chip, IconButton, Tooltip, Button, alpha, useTheme } from '@mui/material'
import { Edit } from '@mui/icons-material'
import { Playthrough } from '../../types'
import { formatPlaythroughType, getPlaythroughTypeColor } from '../../utils/playthroughUtils'

interface PlaythroughHeaderProps {
  playthrough: Playthrough
  gameName: string
  onEditTitle: () => void
  onImport?: () => void
  showImportButton: boolean
  t: any
}

function PlaythroughHeader({ 
  playthrough, 
  gameName, 
  onEditTitle, 
  onImport,
  showImportButton,
  t 
}: PlaythroughHeaderProps) {
  const theme = useTheme()

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        {gameName}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: playthrough.title ? 0 : 2 }}>
        {playthrough.title ? (
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {playthrough.title}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {t('playthrough.noTitle')}
          </Typography>
        )}
        <Tooltip title={t('playthrough.editTitle')} arrow>
          <IconButton
            size="small"
            onClick={onEditTitle}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
            }}
          >
            <Edit sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Tooltip>
        {showImportButton && onImport && (
          <Tooltip 
            title={playthrough.importedFromPlaythroughId 
              ? "Already imported from another playthrough (one-time only)" 
              : "Import playtime from another playthrough"
            } 
            arrow
          >
            <span>
              <Button
                variant="outlined"
                size="small"
                onClick={onImport}
                disabled={playthrough.importedFromPlaythroughId !== null && playthrough.importedFromPlaythroughId !== undefined}
                sx={{
                  ml: 'auto',
                  fontSize: '0.75rem',
                  py: 0.5,
                  px: 1.5,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  borderWidth: 1.5,
                  '&:hover': {
                    borderWidth: 1.5,
                  },
                  '&:disabled': {
                    borderColor: 'success.main',
                    color: 'success.main',
                    opacity: 0.7,
                  }
                }}
              >
                {playthrough.importedFromPlaythroughId ? 'Imported ✓' : 'Import Time'}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3, gap: 1 }}>
        <Chip 
          label={formatPlaythroughType(playthrough.playthroughType)} 
          size="medium"
          sx={{
            backgroundColor: getPlaythroughTypeColor(playthrough.playthroughType),
            color: 'white',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: getPlaythroughTypeColor(playthrough.playthroughType),
              filter: 'brightness(1.1)'
            }
          }}
        />
        {playthrough.isCompleted && (
          <Chip label={t('playthrough.completed')} color="success" size="medium" />
        )}
        {playthrough.isDropped && (
          <Chip label={t('playthrough.dropped')} color="error" size="medium" />
        )}
        {playthrough.isActive && (
          <Chip label={t('playthrough.active')} color="warning" size="medium" />
        )}
      </Stack>
    </>
  )
}

export default PlaythroughHeader
