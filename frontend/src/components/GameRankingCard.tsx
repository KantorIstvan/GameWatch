import React from 'react'
import { Box, CardMedia, Typography, alpha, useTheme } from '@mui/material'
import { Timer, CalendarMonth } from '@mui/icons-material'
import { formatTime } from '../utils/formatters'
import { GameRanking } from '../types'

interface GameRankingCardProps {
  game: GameRanking
  rank: number
  showDaysToComplete?: boolean
  t?: (key: string, params?: any) => string
}

const GameRankingCard = React.memo(({ game, showDaysToComplete = false, t }: GameRankingCardProps) => {
  const theme = useTheme()
  
  return (
    <Box 
      sx={{ 
        position: 'relative',
        borderRadius: 3,
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
          borderColor: alpha(theme.palette.primary.main, 0.4),
        },
      }}
    >
      <Box sx={{ position: 'relative', height: 180 }}>
        <CardMedia
          component="img"
          sx={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            filter: 'brightness(0.85)',
          }}
          image={game.bannerImageUrl || '/placeholder-game.png'}
          alt={game.gameName}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: `linear-gradient(to top, ${alpha(theme.palette.background.paper, 0.95)} 0%, transparent 100%)`,
            p: 2,
          }}
        >
          <Typography 
            variant="h6" 
            fontWeight="bold" 
            sx={{ 
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.2,
            }}
          >
            {game.gameName}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ p: 2.5, pt: 1.5 }}>
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.75,
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Timer sx={{ fontSize: 18, color: theme.palette.primary.main }} />
            <Typography variant="body2" fontWeight="600" color="primary">
              {formatTime(game.playtimeSeconds)}
            </Typography>
          </Box>
          {showDaysToComplete && game.daysToComplete !== undefined && t && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.75,
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.secondary.main, 0.1),
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
              }}
            >
              <CalendarMonth sx={{ fontSize: 18, color: theme.palette.secondary.main }} />
              <Typography variant="body2" fontWeight="600" color="secondary">
                {t('statistics.userStats.daysToComplete', { days: game.daysToComplete })}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
})

GameRankingCard.displayName = 'GameRankingCard'

export default GameRankingCard
