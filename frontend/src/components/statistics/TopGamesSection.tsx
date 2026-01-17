import { Box, Typography, Paper, Card, CardContent, CardMedia, Chip, alpha, useTheme } from '@mui/material'
import { TrendingUp } from '@mui/icons-material'
import { formatTime } from '../../utils/formatters'

interface TopGame {
  gameId: number
  gameName: string
  playtimeSeconds: number
  bannerImageUrl?: string
}

interface TopGamesSectionProps {
  games: TopGame[]
  title: string
}

function TopGamesSection({ games, title }: TopGamesSectionProps) {
  const theme = useTheme()

  const getChipColor = (rank: number) => {
    if (rank === 1) return '#FFD700'
    if (rank === 2) return '#C0C0C0'
    if (rank === 3) return '#CD7F32'
    return '#424242'
  }

  if (games.length === 0) return null

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3,
        background: alpha(theme.palette.background.paper, 0.6),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      <Box display="flex" alignItems="center" mb={3}>
        <TrendingUp sx={{ mr: 1.5, fontSize: 28, color: theme.palette.primary.main }} />
        <Typography variant="h5" fontWeight="bold">
          {title}
        </Typography>
      </Box>
      <Box 
        sx={{ 
          display: 'flex', 
          gap: 2, 
          overflowX: 'auto',
          pb: 1,
          justifyContent: { xs: 'flex-start', md: 'center' },
          '&::-webkit-scrollbar': {
            height: 8,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.text.primary, 0.2),
            borderRadius: 4,
          },
        }}
      >
        {games.map((game, index) => {
          const rank = index + 1
          
          return (
            <Card
              key={game.gameId}
              sx={{
                minWidth: 200,
                maxWidth: 200,
                flexShrink: 0,
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  image={game.bannerImageUrl || '/placeholder-game.png'}
                  alt={game.gameName}
                  sx={{
                    width: '100%',
                    height: 112,
                    objectFit: 'cover',
                  }}
                />
                <Chip
                  label={`${rank}#`}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    fontWeight: 'bold',
                    bgcolor: getChipColor(rank),
                    color: rank === 4 || rank === 5 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.87)',
                  }}
                />
              </Box>
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Typography 
                  variant="body1" 
                  fontWeight="bold" 
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.3,
                    minHeight: '2.6em',
                  }}
                >
                  {game.gameName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {formatTime(game.playtimeSeconds)}
                </Typography>
              </CardContent>
            </Card>
          )
        })}
      </Box>
    </Paper>
  )
}

export default TopGamesSection
