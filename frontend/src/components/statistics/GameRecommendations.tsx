import { Box, Typography, Paper, Stack, Chip, alpha, useTheme } from '@mui/material'
import { SportsEsports } from '@mui/icons-material'
import { GameRecommendation } from '../../types'

interface GameRecommendationsProps {
  recommendations: GameRecommendation[]
  title: string
  noDataMessage: string
}

function GameRecommendations({ recommendations, title, noDataMessage }: GameRecommendationsProps) {
  const theme = useTheme()

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: alpha(theme.palette.background.paper, 0.6),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      <Box display="flex" alignItems="center" mb={2}>
        <SportsEsports sx={{ mr: 1, color: theme.palette.primary.main }} />
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>
      </Box>
      {recommendations.length > 0 ? (
        <Stack spacing={1.5}>
          {recommendations.map((game, index) => (
            <Box 
              key={game.externalId || index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  transform: 'translateX(4px)',
                }
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  minWidth: 28,
                  fontWeight: 700,
                  color: theme.palette.primary.main,
                }}
              >
                #{index + 1}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="body2" 
                  fontWeight={600}
                  sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {game.name}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                  {game.matchingDevelopers && game.matchingDevelopers.length > 0 && (
                    game.matchingDevelopers.slice(0, 2).map((developer, idx) => (
                      <Chip
                        key={`dev-${idx}`}
                        label={developer}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          bgcolor: alpha(theme.palette.success.main, 0.2),
                          color: theme.palette.success.main,
                          '& .MuiChip-label': {
                            px: 0.75,
                          }
                        }}
                      />
                    ))
                  )}
                  {game.matchingPublishers && game.matchingPublishers.length > 0 && (
                    game.matchingPublishers.slice(0, 2).map((publisher, idx) => (
                      <Chip
                        key={`pub-${idx}`}
                        label={publisher}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          bgcolor: alpha(theme.palette.info.main, 0.2),
                          color: theme.palette.info.main,
                          '& .MuiChip-label': {
                            px: 0.75,
                          }
                        }}
                      />
                    ))
                  )}
                </Stack>
              </Box>
            </Box>
          ))}
        </Stack>
      ) : (
        <Box
          sx={{
            height: 260,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">
            {noDataMessage}
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

export default GameRecommendations
