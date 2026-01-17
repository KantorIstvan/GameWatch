import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { setAuthToken } from '../services/api'

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
  const { isLoading, isAuthenticated, getAccessTokenSilently, logout: auth0Logout } = useAuth0()
  const [isAuthReady, setIsAuthReady] = useState(false)

  const logout = () => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } })
  }

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      console.log('[AuthContext] initAuth called, isAuthenticated:', isAuthenticated, 'isLoading:', isLoading)
      
      if (isAuthenticated) {
        try {
          const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string
          console.log('[AuthContext] Requesting token with audience:', audience)
          
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: audience,
            },
            cacheMode: 'on'
          })
          
          if (!mounted) return
          
          console.log('[AuthContext] Token received, length:', token?.length)
          console.log('[AuthContext] Token preview:', token?.substring(0, 50) + '...')
          
          setAuthToken(token)
          console.log('[AuthContext] Token set in API client')
          
          // Only set auth ready after token is successfully set
          if (mounted) {
            setIsAuthReady(true)
            console.log('[AuthContext] Auth initialization complete')
          }
        } catch (error: any) {
          console.error('[AuthContext] Error getting access token:', error)
          console.error('[AuthContext] Error details:', error.error, error.error_description)
          // Don't set isAuthReady to true on error
          if (mounted) {
            setIsAuthReady(false)
          }
        }
      } else {
        console.log('[AuthContext] User not authenticated')
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

  console.log('[AuthContext] Rendering, isAuthReady:', isAuthReady, 'isAuthenticated:', isAuthenticated)

  return (
    <AuthContext.Provider value={{ isAuthReady, isAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
