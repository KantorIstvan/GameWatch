import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Stack,
  alpha,
  useTheme,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Playthrough, getPlatformColor } from '../types'
import { formatTimeHMS, formatDate, formatPlaythroughType, getPlaythroughTypeColor } from '../utils/formatters'

interface StopwatchCardProps {
  playthrough: Playthrough
  onUpdate?: () => void
  onDelete?: (id: number) => void
}

function StopwatchCard({ playthrough }: StopwatchCardProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const theme = useTheme()
  const [localPlaythrough, setLocalPlaythrough] = useState<Playthrough>(playthrough)
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setLocalPlaythrough(playthrough)
    
    if (playthrough.isActive && playthrough.startedAt) {
      const now = Date.now()
      const startTime = new Date(playthrough.startedAt).getTime()
      const currentSessionElapsed = Math.floor((now - startTime) / 1000)
      const baseDuration = playthrough.durationSeconds || 0
      setElapsedTime(baseDuration + currentSessionElapsed)
    } else {
      setElapsedTime(playthrough.durationSeconds || 0)
    }
  }, [playthrough])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    if (localPlaythrough.isActive) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [localPlaythrough.isActive, localPlaythrough.id])

  const handleCardClick = useCallback(() => {
    navigate(`/playthrough/${localPlaythrough.id}`)
  }, [navigate, localPlaythrough.id])

  const playthroughColor = useMemo(
    () => getPlaythroughTypeColor(localPlaythrough.playthroughType),
    [localPlaythrough.playthroughType]
  )
  
  const formattedTime = useMemo(() => formatTimeHMS(elapsedTime), [elapsedTime])
  const formattedDate = useMemo(() => formatDate(localPlaythrough.startDate), [localPlaythrough.startDate])
  const formattedType = useMemo(() => formatPlaythroughType(localPlaythrough.playthroughType), [localPlaythrough.playthroughType])

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        background: theme.palette.mode === 'dark' 
          ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
          : theme.palette.background.paper,
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: theme.palette.mode === 'dark'
            ? `0 12px 40px ${alpha('#000', 0.4)}, 0 0 0 1px ${alpha(playthroughColor, 0.2)}`
            : `0 12px 40px ${alpha(playthroughColor, 0.15)}, 0 0 0 1px ${alpha(playthroughColor, 0.1)}`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${playthroughColor} 0%, ${alpha(playthroughColor, 0.6)} 100%)`,
        }
      }}
      onClick={handleCardClick}
    >
      {localPlaythrough.gameBannerImageUrl && (
        <Box sx={{ position: 'relative', overflow: 'hidden', height: 140 }}>
          <CardMedia
            component="img"
            height="140"
            image={localPlaythrough.gameBannerImageUrl}
            alt={localPlaythrough.gameName}
            sx={{ 
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              }
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(180deg, ${alpha('#000', 0)} 0%, ${alpha('#000', 0.7)} 100%)`,
            }}
          />
        </Box>
      )}
      
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
        <Typography 
          variant="h6" 
          component="div" 
          gutterBottom 
          noWrap
          sx={{
            fontWeight: 600,
            background: theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.8)} 100%)`
              : theme.palette.text.primary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: theme.palette.mode === 'dark' ? 'transparent' : 'inherit',
          }}
        >
          {localPlaythrough.gameName}
        </Typography>
        
        {localPlaythrough.title && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            gutterBottom 
            noWrap
            sx={{ mb: 2, fontStyle: 'italic' }}
          >
            {localPlaythrough.title}
          </Typography>
        )}
        
        <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label={formattedType}
            size="small"
            sx={{
              backgroundColor: playthroughColor,
              color: 'white',
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 24,
              '&:hover': {
                backgroundColor: playthroughColor,
                filter: 'brightness(1.1)'
              }
            }}
          />
          {localPlaythrough.platform && (
            <Chip
              label={localPlaythrough.platform}
              size="small"
              sx={{
                backgroundColor: getPlatformColor(localPlaythrough.platform),
                color: 'white',
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
                '&:hover': {
                  backgroundColor: getPlatformColor(localPlaythrough.platform),
                  filter: 'brightness(1.1)'
                }
              }}
            />
          )}
          {localPlaythrough.isCompleted && (
            <Chip
              label={t('playthrough.completed')}
              color="success"
              size="small"
              sx={{ height: 24, fontSize: '0.75rem' }}
            />
          )}
          {localPlaythrough.isDropped && (
            <Chip
              label={t('playthrough.dropped')}
              color="error"
              size="small"
              sx={{ height: 24, fontSize: '0.75rem' }}
            />
          )}
          {localPlaythrough.isActive && (
            <Chip
              icon={<Box 
                sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  backgroundColor: 'currentColor',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  }
                }} 
              />}
              label={t('playthrough.active')}
              size="small"
              sx={{ 
                height: 24, 
                fontSize: '0.75rem',
                backgroundColor: alpha('#ff9800', 0.15),
                color: '#ff9800',
                fontWeight: 600,
                '& .MuiChip-icon': {
                  marginLeft: '8px'
                }
              }}
            />
          )}
          {localPlaythrough.isPaused && (
            <Chip
              label={t('playthrough.paused')}
              size="small"
              sx={{ 
                height: 24, 
                fontSize: '0.75rem',
                backgroundColor: alpha('#9e9e9e', 0.15),
                color: '#9e9e9e',
                fontWeight: 600,
              }}
            />
          )}
        </Stack>

        <Box
          sx={{
            mt: 'auto',
            p: 2.5,
            borderRadius: 2,
            background: theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${alpha(playthroughColor, 0.08)} 0%, ${alpha(playthroughColor, 0.04)} 100%)`
              : `linear-gradient(135deg, ${alpha(playthroughColor, 0.05)} 0%, ${alpha(playthroughColor, 0.02)} 100%)`,
            border: `1px solid ${alpha(playthroughColor, 0.1)}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Typography
            variant="h4"
            component="div"
            sx={{ 
              fontFamily: 'monospace', 
              textAlign: 'center',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: playthroughColor,
              textShadow: theme.palette.mode === 'dark' 
                ? `0 0 20px ${alpha(playthroughColor, 0.3)}`
                : 'none',
            }}
          >
            {formattedTime}
          </Typography>
          
          {localPlaythrough.isActive && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 2,
                background: playthroughColor,
                animation: 'progress 2s ease-in-out infinite',
                '@keyframes progress': {
                  '0%': { transform: 'translateX(-100%)' },
                  '100%': { transform: 'translateX(100%)' },
                }
              }}
            />
          )}
        </Box>

        {(formattedDate || localPlaythrough.endDate) && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            {formattedDate && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ opacity: 0.7 }}>
                {t('playthrough.started')}: {formattedDate}
              </Typography>
            )}
            {localPlaythrough.endDate && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ opacity: 0.7 }}>
                {localPlaythrough.isDropped ? t('playthrough.dropped') : t('playthrough.ended')}: {formatDate(localPlaythrough.endDate)}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default memo(StopwatchCard)
