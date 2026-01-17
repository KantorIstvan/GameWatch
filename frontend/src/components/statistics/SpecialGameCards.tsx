import { Grid, Paper, Box, Typography, alpha, useTheme } from '@mui/material'
import { TrendingUp, CalendarMonth, Timer } from '@mui/icons-material'
import GameRankingCard from '../GameRankingCard'

interface SpecialGame {
  gameId: number
  gameName: string
  playtimeSeconds: number
  daysToComplete?: number
  bannerImageUrl?: string
}

interface SpecialGameCardsProps {
  favoriteGame?: SpecialGame
  longestToComplete?: SpecialGame
  fastestToComplete?: SpecialGame
  t: any
}

function SpecialGameCards({ favoriteGame, longestToComplete, fastestToComplete, t }: SpecialGameCardsProps) {
  const theme = useTheme()

  return (
    <Grid container spacing={3} mb={4}>
      {favoriteGame && (
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              height: '100%',
              background: alpha(theme.palette.background.paper, 0.6),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Box display="flex" alignItems="center" mb={2.5}>
              <TrendingUp sx={{ mr: 1, color: theme.palette.warning.main }} />
              <Typography variant="h6" fontWeight="bold">
                {t('statistics.userStats.favoriteGame')}
              </Typography>
            </Box>
            <GameRankingCard game={favoriteGame} rank={1} showDaysToComplete={false} t={t} />
          </Paper>
        </Grid>
      )}

      {longestToComplete && (
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              height: '100%',
              background: alpha(theme.palette.background.paper, 0.6),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Box display="flex" alignItems="center" mb={2.5}>
              <CalendarMonth sx={{ mr: 1, color: theme.palette.info.main }} />
              <Typography variant="h6" fontWeight="bold">
                {t('statistics.userStats.longestToComplete')}
              </Typography>
            </Box>
            <GameRankingCard game={longestToComplete} rank={1} showDaysToComplete={true} t={t} />
          </Paper>
        </Grid>
      )}

      {fastestToComplete && (
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              height: '100%',
              background: alpha(theme.palette.background.paper, 0.6),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Box display="flex" alignItems="center" mb={2.5}>
              <Timer sx={{ mr: 1, color: theme.palette.success.main }} />
              <Typography variant="h6" fontWeight="bold">
                {t('statistics.userStats.fastestCompletion')}
              </Typography>
            </Box>
            <GameRankingCard game={fastestToComplete} rank={1} showDaysToComplete={true} t={t} />
          </Paper>
        </Grid>
      )}
    </Grid>
  )
}

export default SpecialGameCards
