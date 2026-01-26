import React from 'react'
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  useTheme,
  alpha,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Error as ErrorIcon,
  Lock as LockIcon,
  SearchOff as NotFoundIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
} from '@mui/icons-material'

interface ErrorPageProps {
  errorCode?: 401 | 404 | 500 | number
  title?: string
  message?: string
  showHomeButton?: boolean
  showRetryButton?: boolean
  onRetry?: () => void
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  errorCode = 500,
  title,
  message,
  showHomeButton = true,
  showRetryButton = false,
  onRetry,
}) => {
  const theme = useTheme()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const getErrorIcon = () => {
    switch (errorCode) {
      case 401:
        return <LockIcon sx={{ fontSize: 80, color: theme.palette.error.main }} />
      case 404:
        return <NotFoundIcon sx={{ fontSize: 80, color: theme.palette.warning.main }} />
      case 500:
      default:
        return <ErrorIcon sx={{ fontSize: 80, color: theme.palette.error.main }} />
    }
  }

  const getDefaultTitle = () => {
    switch (errorCode) {
      case 401:
        return t('errors.unauthorized', 'Unauthorized Access')
      case 404:
        return t('errors.notFound', 'Page Not Found')
      case 500:
      default:
        return t('errors.serverError', 'Server Error')
    }
  }

  const getDefaultMessage = () => {
    switch (errorCode) {
      case 401:
        return t('errors.unauthorizedMessage', 'You don\'t have permission to access this resource. Please log in or contact support.')
      case 404:
        return t('errors.notFoundMessage', 'The page you\'re looking for doesn\'t exist or has been moved.')
      case 500:
      default:
        return t('errors.serverErrorMessage', 'Something went wrong on our end. Please try again later or contact support.')
    }
  }

  const handleGoHome = () => {
    navigate('/')
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            background: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            maxWidth: 500,
            width: '100%',
          }}
        >
          <Box sx={{ mb: 4 }}>
            {getErrorIcon()}
          </Box>

          <Typography
            variant="h4"
            component="h1"
            sx={{
              mb: 2,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {errorCode}
          </Typography>

          <Typography
            variant="h5"
            component="h2"
            sx={{
              mb: 3,
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {title || getDefaultTitle()}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              mb: 4,
              color: theme.palette.text.secondary,
              lineHeight: 1.6,
              maxWidth: 400,
              mx: 'auto',
            }}
          >
            {message || getDefaultMessage()}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {showHomeButton && (
              <Button
                variant="contained"
                startIcon={<HomeIcon />}
                onClick={handleGoHome}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                  },
                }}
              >
                {t('common.backToDashboard', 'Go Home')}
              </Button>
            )}

            {showRetryButton && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRetry}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.main,
                  '&:hover': {
                    borderColor: theme.palette.primary.dark,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                {t('common.retry', 'Try Again')}
              </Button>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default ErrorPage