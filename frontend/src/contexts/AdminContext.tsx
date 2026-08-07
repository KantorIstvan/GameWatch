import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { adminApi } from '../services/api'
import { useAuthContext } from './AuthContext'

interface AdminContextType {
  isAdmin: boolean
  permissions: string[]
  loading: boolean
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export const useAdminContext = (): AdminContextType => {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdminContext must be used within AdminProvider')
  }
  return context
}

/**
 * Fetches, once per session, which admin permissions (if any) this account's JWT
 * carries. Unlike OnboardingContext, a failed or empty request resolves to no
 * permissions rather than "let them through" - this gates elevated access to other
 * people's data, so the safe failure mode is the opposite one.
 */
export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth0()
  const { isAuthReady } = useAuthContext()
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    if (!isAuthReady) return
    if (!isAuthenticated) {
      setPermissions([])
      setLoading(false)
      return
    }

    setLoading(true)
    adminApi
      .getMe()
      .then((response) => {
        if (mounted) setPermissions(response.data.permissions ?? [])
      })
      .catch(() => {
        if (mounted) setPermissions([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [isAuthReady, isAuthenticated])

  return (
    <AdminContext.Provider value={{ isAdmin: permissions.length > 0, permissions, loading }}>
      {children}
    </AdminContext.Provider>
  )
}
