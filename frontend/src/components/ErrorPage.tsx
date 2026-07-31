import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, Lock, SearchX, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  const { t } = useTranslation()
  const navigate = useNavigate()

  const getErrorIcon = () => {
    switch (errorCode) {
      case 401:
        return <Lock className="size-20 text-accent" />
      case 404:
        return <SearchX className="size-20 text-accent" />
      case 500:
      default:
        return <CircleAlert className="size-20 text-destructive" />
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
    <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface/80 p-12 text-center shadow-2 backdrop-blur-md">
        <div className="mb-8 flex justify-center">{getErrorIcon()}</div>

        <p className="mb-4 bg-linear-to-br from-accent to-accent-hover bg-clip-text text-h1 font-bold text-transparent">
          {errorCode}
        </p>

        <h2 className="mb-6 text-h4 font-semibold text-text-primary">
          {title || getDefaultTitle()}
        </h2>

        <p className="mx-auto mb-8 max-w-sm text-body text-text-secondary">
          {message || getDefaultMessage()}
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          {showHomeButton && (
            <Button onClick={handleGoHome} size="lg">
              <Home className="size-4" />
              {t('common.backToDashboard', 'Go Home')}
            </Button>
          )}

          {showRetryButton && (
            <Button onClick={handleRetry} variant="outline" size="lg">
              <RefreshCw className="size-4" />
              {t('common.retry', 'Try Again')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorPage
