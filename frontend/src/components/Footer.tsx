import { Box, Container, Typography, Link as MuiLink, IconButton, useMediaQuery } from '@mui/material'
import { GitHub, Twitter, Chat } from '@mui/icons-material'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'

function Footer() {
  const { mode } = useTheme()
  const { t } = useTranslation()
  const isMobile = useMediaQuery('(max-width:600px)')

  const currentYear = new Date().getFullYear()

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: { xs: 3, sm: 4 },
        px: 2,
        backgroundColor: mode === 'light' 
          ? 'rgba(249, 250, 251, 0.9)' 
          : '#0a0c0e',
        borderTop: '1px solid',
        borderColor: mode === 'light' 
          ? 'rgba(0, 0, 0, 0.08)' 
          : 'rgba(255, 255, 255, 0.08)',
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'flex-start',
            justifyContent: 'space-between',
            gap: { xs: 2, sm: 3 },
          }}
        >
          {/* Copyright Section */}
          <Box
            sx={{
              textAlign: isMobile ? 'center' : 'left',
              order: isMobile ? 2 : 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.875rem',
              }}
            >
              {t('footer.copyright', { year: currentYear, appName: t('app.name') })}
            </Typography>
          </Box>

          {/* Navigation Links */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              gap: { xs: 1.5, sm: 3 },
              order: isMobile ? 1 : 2,
            }}
          >
            <MuiLink
              href="/help"
              underline="hover"
              sx={{
                color: mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: mode === 'light' ? '#667eea' : '#8b9af7',
                },
              }}
            >
              {t('footer.help')}
            </MuiLink>
            <MuiLink
              href="#"
              underline="hover"
              sx={{
                color: mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: mode === 'light' ? '#667eea' : '#8b9af7',
                },
              }}
            >
              {t('footer.privacy')}
            </MuiLink>
            <MuiLink
              href="#"
              underline="hover"
              sx={{
                color: mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: mode === 'light' ? '#667eea' : '#8b9af7',
                },
              }}
            >
              {t('footer.terms')}
            </MuiLink>
            <MuiLink
              href="#"
              underline="hover"
              sx={{
                color: mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: mode === 'light' ? '#667eea' : '#8b9af7',
                },
              }}
            >
              {t('footer.contact')}
            </MuiLink>
          </Box>

          {/* Social Media Icons */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              order: 3,
            }}
          >
            <IconButton
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              sx={{
                color: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: mode === 'light' ? '#667eea' : '#8b9af7',
                  backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.08)' : 'rgba(139, 154, 247, 0.08)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <GitHub fontSize="small" />
            </IconButton>
            <IconButton
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              sx={{
                color: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: mode === 'light' ? '#667eea' : '#8b9af7',
                  backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.08)' : 'rgba(139, 154, 247, 0.08)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Twitter fontSize="small" />
            </IconButton>
            <IconButton
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
              sx={{
                color: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: mode === 'light' ? '#667eea' : '#8b9af7',
                  backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.08)' : 'rgba(139, 154, 247, 0.08)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Chat fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

export default Footer
