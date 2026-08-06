import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { userApi } from '../services/api'
import { useAuthContext } from './AuthContext'
import type { OnboardingStatus } from '../types'

interface OnboardingContextType {
  /**
   * Null while it is still unknown - either the request has not finished, or it failed.
   * `loading` tells the two apart.
   */
  status: OnboardingStatus | null
  loading: boolean
  /** Called once the form succeeds, so the guard stops redirecting without a second fetch. */
  setStatus: (status: OnboardingStatus) => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}

/**
 * Fetches, once per session, whether this account still owes the app a handle and a
 * display name.
 *
 * It lives in a context rather than a hook per consumer because two things need the same
 * answer - the route guard and the form it redirects to - and fetching it twice would let
 * them disagree for a render, which is exactly the flash of the wrong screen the guard
 * exists to prevent.
 *
 * A failed request leaves `status` null, and the guard reads that as "let them through".
 * The alternative - blocking on an answer we do not have - would trap every existing
 * account behind a form it does not need every time the API hiccups, while a genuinely
 * incomplete account is going to find the app unusable anyway, since every other call is
 * failing at the same time.
 */
export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth0()
  const { isAuthReady } = useAuthContext()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Nothing to ask about until there is a token to ask with. Signed-out visitors get a
    // settled, empty state so the landing screen is not held behind a spinner.
    if (!isAuthReady) return
    if (!isAuthenticated) {
      setStatus(null)
      setLoading(false)
      return
    }

    setLoading(true)
    userApi
      .getOnboardingStatus()
      .then((response) => {
        if (mounted) setStatus(response.data)
      })
      .catch(() => {
        if (mounted) setStatus(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [isAuthReady, isAuthenticated])

  return (
    <OnboardingContext.Provider value={{ status, loading, setStatus }}>
      {children}
    </OnboardingContext.Provider>
  )
}
