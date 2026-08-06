import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { setAuthToken } from '../services/api'
import { setCurrentUserId } from '../lib/currentUserId'

interface AuthContextType {
  isAuthReady: boolean
  isAuthenticated: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoading, isAuthenticated, user, getAccessTokenSilently, logout: auth0Logout } = useAuth0()
  const [isAuthReady, setIsAuthReady] = useState(false)

  const logout = () => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } })
  }

  // Kept in step with Auth0's own state rather than just set once at login: a browser
  // reload with no session, or the moment `logout()` clears one, has to blank this out
  // immediately, or the next account's device-local lists (recent searches, local
  // notifications) could still resolve against the previous account's id for a render.
  useEffect(() => {
    setCurrentUserId(isAuthenticated ? (user?.sub ?? null) : null)
  }, [isAuthenticated, user?.sub])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      if (isAuthenticated) {
        try {
          const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string
          
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: audience,
            },
            cacheMode: 'on'
          })
          
          if (!mounted) return
          
          setAuthToken(token)
          
          // Only set auth ready after token is successfully set
          if (mounted) {
            setIsAuthReady(true)
          }
        } catch (error: any) {
          // Error handled silently
          // Don't set isAuthReady to true on error
          if (mounted) {
            setIsAuthReady(false)
          }
        }
      } else {
        // Set auth ready even when not authenticated (for public pages)
        if (mounted) {
          setIsAuthReady(true)
        }
      }
    }

    if (!isLoading) {
      initAuth()
    }

    return () => {
      mounted = false
    }
  }, [isLoading, isAuthenticated, getAccessTokenSilently])

  return (
    <AuthContext.Provider value={{ isAuthReady, isAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
