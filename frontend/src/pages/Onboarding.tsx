import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Loading from '../components/Loading'
import { userApi } from '../services/api'
import { useOnboarding } from '../contexts/OnboardingContext'
import { validateHandle, normalizeHandle, HANDLE_MAX_LENGTH, type HandleIssue } from '../lib/handle'

const DISPLAY_NAME_MAX_LENGTH = 50

/**
 * The screen every session with an incomplete account is held on.
 *
 * A handle and a display name are not profile polish - large parts of the app (search,
 * follows, the activity feed) render a person by one or the other, and an account with
 * neither is one those surfaces cannot draw. The route guard in App.tsx redirects here and
 * refuses to release an authenticated session until this form succeeds once.
 *
 * The handle field is prefilled with a generated suggestion rather than left blank: it is
 * still fully editable, and starting from something valid means a person who does not care
 * what their handle is can get through this in one click instead of inventing one.
 */
function Onboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, loading, setStatus } = useOnboarding()

  const [handleInput, setHandleInput] = useState('')
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [handleTouched, setHandleTouched] = useState(false)
  const [displayNameTouched, setDisplayNameTouched] = useState(false)
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null)
  const [checkingHandle, setCheckingHandle] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [prefilled, setPrefilled] = useState(false)

  // Prefilled once, the first time a status is available - typing should never be
  // overwritten by a later re-fetch of the same suggestion.
  useEffect(() => {
    if (prefilled || !status) return
    setHandleInput(status.handle ?? status.suggestedHandle ?? '')
    setDisplayNameInput(status.displayName ?? status.suggestedDisplayName ?? '')
    setPrefilled(true)
  }, [status, prefilled])

  // Debounced and advisory, exactly like the settings form's handle check - the claim
  // itself is what decides, since another account can take it in between.
  useEffect(() => {
    const normalized = normalizeHandle(handleInput)
    if (!normalized || validateHandle(handleInput) !== null || normalized === status?.handle) {
      setHandleAvailable(null)
      return
    }

    setCheckingHandle(true)
    const timer = window.setTimeout(() => {
      userApi
        .isHandleAvailable(normalized)
        .then((response) => setHandleAvailable(response.data.available))
        .catch(() => setHandleAvailable(null))
        .finally(() => setCheckingHandle(false))
    }, 400)

    return () => {
      window.clearTimeout(timer)
      setCheckingHandle(false)
    }
  }, [handleInput, status?.handle])

  if (loading) {
    return <Loading />
  }

  const handleIssue: HandleIssue | null = validateHandle(handleInput)
  const handleErrorKey = handleTouched && handleIssue ? `onboarding.handleErrors.${handleIssue}` : null
  const displayNameTrimmed = displayNameInput.trim()
  const displayNameIssue = !displayNameTrimmed
    ? 'required'
    : displayNameTrimmed.length > DISPLAY_NAME_MAX_LENGTH
      ? 'tooLong'
      : null
  const displayNameErrorKey =
    displayNameTouched && displayNameIssue === 'required'
      ? 'onboarding.displayNameRequired'
      : displayNameTouched && displayNameIssue === 'tooLong'
        ? 'onboarding.displayNameTooLong'
        : null

  const canSubmit =
    !submitting && handleIssue === null && displayNameIssue === null && handleAvailable !== false

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setHandleTouched(true)
    setDisplayNameTouched(true)
    if (handleIssue !== null || displayNameIssue !== null) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const response = await userApi.completeOnboarding({
        handle: normalizeHandle(handleInput),
        displayName: displayNameTrimmed,
      })
      setStatus(response.data)
      navigate('/', { replace: true })
    } catch (err: any) {
      const message = err.response?.data?.message
      if (message === 'That handle is already taken') {
        setHandleAvailable(false)
        setSubmitError(t('onboarding.handleTaken'))
      } else {
        setSubmitError(message || t('onboarding.genericError'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-h3">{t('onboarding.title')}</CardTitle>
          <CardDescription>{t('onboarding.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <Label htmlFor="onboarding-handle" className="mb-1 block text-body-sm font-semibold">
                {t('onboarding.handle')}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-body text-text-secondary">@</span>
                <Input
                  id="onboarding-handle"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  onBlur={() => setHandleTouched(true)}
                  placeholder={t('onboarding.handlePlaceholder')}
                  maxLength={HANDLE_MAX_LENGTH}
                  className="font-mono"
                  aria-describedby="onboarding-handle-hint"
                  aria-invalid={handleErrorKey !== null || handleAvailable === false}
                  autoFocus
                />
                {!checkingHandle && handleIssue === null && handleAvailable === true && (
                  <Check
                    className="size-5 shrink-0 text-success"
                    aria-label={t('onboarding.handleAvailable')}
                  />
                )}
                {!checkingHandle && handleIssue === null && handleAvailable === false && (
                  <X
                    className="size-5 shrink-0 text-destructive"
                    aria-label={t('onboarding.handleTaken')}
                  />
                )}
              </div>
              <p
                id="onboarding-handle-hint"
                className={`mt-1 text-caption ${handleErrorKey || handleAvailable === false ? 'text-destructive' : 'text-text-secondary'}`}
              >
                {handleErrorKey
                  ? t(handleErrorKey)
                  : handleAvailable === false
                    ? t('onboarding.handleTaken')
                    : t('onboarding.handleHint')}
              </p>
            </div>

            <div>
              <Label htmlFor="onboarding-display-name" className="mb-1 block text-body-sm font-semibold">
                {t('onboarding.displayName')}
              </Label>
              <Input
                id="onboarding-display-name"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                onBlur={() => setDisplayNameTouched(true)}
                placeholder={t('onboarding.displayNamePlaceholder')}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                aria-invalid={displayNameErrorKey !== null}
              />
              {displayNameErrorKey && (
                <p className="mt-1 text-caption text-destructive">{t(displayNameErrorKey)}</p>
              )}
            </div>

            {submitError && (
              <p role="alert" className="text-body-sm text-destructive">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={!canSubmit} className="w-full">
              {submitting ? t('onboarding.submitting') : t('onboarding.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Onboarding
