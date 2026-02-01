import { Card, CardContent, Box, Typography, IconButton, Chip } from '@mui/material'
import { Delete, Schedule, PlayArrow } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { Game } from '../types'

interface GameCardProps {
  game: Game
  cardScale: number
  onDelete: (id: number) => void
  onClick?: (id: number) => void
}

function GameCard({ game, cardScale, onDelete, onClick }: GameCardProps) {
  const { t } = useTranslation()

  const formatPlaytime = (seconds: number | undefined): string => {
    if (!seconds) return '00:00:00'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const getStatusInfo = (status: string) => {
    const statusConfig: Record<string, { color: 'success' | 'primary' | 'error' | 'warning', label: string }> = {
      active: { color: 'success', label: t('games.statusActive') },
      completed: { color: 'success', label: t('games.statusCompleted') },
      dropped: { color: 'error', label: t('games.statusDropped') },
      started: { color: 'warning', label: t('games.statusStarted') },
    }
    return statusConfig[status] || null
  }

  const statusInfo = game.status ? getStatusInfo(game.status) : null

  return (
    <Card 
      onClick={() => onClick?.(game.id)}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        borderRadius: 3, // Unified card border radius (24px)
        overflow: 'visible',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
        },
        '&:hover .delete-button': {
          opacity: 1,
        },
        '&:hover .card-overlay': {
          opacity: 1,
        },
      }}
    >
      {/* Banner Image Container */}
      <Box sx={{ position: 'relative', overflow: 'hidden', display: 'block', lineHeight: 0, fontSize: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}> {/* Updated to match unified border radius */}
        {game.bannerImageUrl && (
          <>
            <Box
              component="img"
              src={game.bannerImageUrl}
              alt={game.name}
              sx={{
                width: '100%',
                aspectRatio: '16/9',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.3s ease',
                '.MuiCard-root:hover &': {
                  transform: 'scale(1.05)',
                },
              }}
            />
            {/* Gradient Overlay */}
            <Box
              className="card-overlay"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 50%)',
                opacity: 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          </>
        )}
        
        {/* Status Chip Overlay */}
        {statusInfo && (
          <Chip
            label={statusInfo.label}
            color={statusInfo.color}
            size="small"
            sx={{
              position: 'absolute',
              top: 8 * cardScale,
              left: 8 * cardScale,
              fontWeight: 600,
              '& .MuiChip-label': {
                paddingLeft: '12px',
                paddingRight: '12px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: `${0.75 * cardScale}rem`,
              },
            }}
          />
        )}
        
        {/* Delete Button Overlay */}
        <IconButton
          className="delete-button"
          size="small"
          color="error"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(game.id)
          }}
          sx={{
            position: 'absolute',
            top: 8 * cardScale,
            right: 8 * cardScale,
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            opacity: 0,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'error.main',
              transform: 'scale(1.1)',
            },
          }}
        >
          <Delete fontSize="small" sx={{ color: 'white' }} />
        </IconButton>
      </Box>

      <CardContent sx={{ 
        flexGrow: 1, 
        py: 1.5 * cardScale, 
        px: 2 * cardScale, 
        '&:last-child': { pb: 1.5 * cardScale },
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 100%)',
      }}>
        {/* Title */}
        <Typography 
          variant="subtitle1" 
          component="div" 
          sx={{ 
            fontWeight: 700,
            fontSize: `${1 * cardScale}rem`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            mb: 0.5 * cardScale,
            lineHeight: 1.3,
            letterSpacing: '0.01em',
          }}
        >
          {game.name}
        </Typography>
        
        {/* Statistics Row */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 * cardScale, mb: 0.5 * cardScale }}>
          {/* Total Playtime */}
          {game.totalPlaytimeSeconds != null && game.totalPlaytimeSeconds > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Schedule sx={{ fontSize: `${0.9 * cardScale}rem`, color: 'primary.main', opacity: 0.7 }} />
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  fontSize: `${0.75 * cardScale}rem`,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                {formatPlaytime(game.totalPlaytimeSeconds)}
              </Typography>
            </Box>
          )}
          
          {/* Session Count */}
          {(game.sessionCount ?? 0) > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PlayArrow sx={{ fontSize: `${0.9 * cardScale}rem`, color: 'secondary.main', opacity: 0.7 }} />
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  fontSize: `${0.75 * cardScale}rem`,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                {game.sessionCount} {game.sessionCount === 1 ? t('games.session') : t('games.sessions')}
              </Typography>
            </Box>
          )}
        </Box>
        
        {/* Last Played Date */}
        {game.lastPlayedDate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 4 * cardScale,
                height: 4 * cardScale,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                opacity: 0.7,
              }}
            />
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                fontSize: `${0.75 * cardScale}rem`,
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              {t('games.lastPlayed')}: {game.lastPlayedDate}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default GameCard
