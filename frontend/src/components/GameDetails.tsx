import { Box, Typography, Grid, Divider, Stack, Chip } from '@mui/material'
import { Game } from '../types'

interface GameDetailsProps {
  game: Game
  t: any
}

function GameDetails({ game, t }: GameDetailsProps) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        {game.releaseDate && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('game.released')}
            </Typography>
            <Typography variant="body1">
              {game.releaseDate}
            </Typography>
          </Box>
        )}

        {game.rating && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('game.rating')}
            </Typography>
            <Typography variant="body1">
              {game.rating}/5 ⭐ {(game.ratingTop ?? 0) > 0 && `(${t('game.top')}: ${game.ratingTop})`}
              {(game.ratingsCount ?? 0) > 0 && ` - ${game.ratingsCount?.toLocaleString()} ${t('game.ratings')}`}
            </Typography>
          </Box>
        )}

        {(game.metacritic ?? 0) > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('game.metacriticScore')}
            </Typography>
            <Typography variant="body1">
              {game.metacriticUrl ? (
                <a href={game.metacriticUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  {game.metacritic}/100
                </a>
              ) : (
                `${game.metacritic}/100`
              )}
            </Typography>
          </Box>
        )}

        {game.esrbRating && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('game.esrbRating')}
            </Typography>
            <Typography variant="body1">
              {game.esrbRating}
            </Typography>
          </Box>
        )}

        {game.genres && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('game.genres')}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
              {game.genres.split(', ').filter((g: string) => g).map((genre: string, idx: number) => (
                <Chip key={idx} label={genre} size="small" variant="outlined" />
              ))}
            </Stack>
          </Box>
        )}

        {game.tags && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('game.tags')}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
              {game.tags.split(', ').filter((t: string) => t).slice(0, 10).map((tag: string, idx: number) => (
                <Chip key={idx} label={tag} size="small" variant="outlined" color="primary" />
              ))}
            </Stack>
          </Box>
        )}
      </Grid>

      <Grid item xs={12} md={6}>
        {game.platforms && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('game.platforms')}
            </Typography>
            <Typography variant="body1">
              {game.platforms}
            </Typography>
          </Box>
        )}

        {game.developers && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('game.developers')}
            </Typography>
            <Typography variant="body1">
              {game.developers}
            </Typography>
          </Box>
        )}

        {game.publishers && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('game.publishers')}
            </Typography>
            <Typography variant="body1">
              {game.publishers}
            </Typography>
          </Box>
        )}

        {game.website && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('game.officialWebsite')}
            </Typography>
            <Typography variant="body1">
              <a href={game.website} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                {t('game.visitWebsite')}
              </a>
            </Typography>
          </Box>
        )}
      </Grid>

      {/* Reddit Section */}
      {(game.redditUrl || game.redditName) && (
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('game.redditCommunity')}
            </Typography>
            {game.redditUrl && (
              <Typography variant="body1">
                <a href={game.redditUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  r/{game.redditName || t('game.visitSubreddit')}
                </a>
                {game.redditCount && ` - ${game.redditCount.toLocaleString()} ${t('game.members')}`}
              </Typography>
            )}
            {game.redditDescription && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {game.redditDescription}
              </Typography>
            )}
          </Box>
        </Grid>
      )}

      {/* Alternative Names */}
      {game.alternativeNames && (
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('game.alsoKnownAs')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {game.alternativeNames}
            </Typography>
          </Box>
        </Grid>
      )}
    </Grid>
  )
}

export default GameDetails
