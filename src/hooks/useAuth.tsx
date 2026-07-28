import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/services/api'
import { ApiError } from '@/services/http'
import type { Profile, User } from '@/types'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  signIn: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Session state, derived from GET /api/me.
 *
 * There is no token to store: authentication lives in an httpOnly cookie the
 * JavaScript cannot read. "Am I signed in?" is therefore answered by asking
 * the server, not by inspecting local storage -- which also means a session
 * revoked server-side (a suspended account) takes effect on the next request
 * rather than lingering until a token expires.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    // 401 is the expected answer for a signed-out visitor, not a failure worth
    // retrying. Anything else may be transient, so allow one retry.
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.isUnauthenticated || error.isForbidden)) return false
      return failureCount < 1
    },
    staleTime: 5 * 60 * 1000,
    // Explicitly off, matching the global default. Left on, this one query
    // would still fire on every tab return -- and it sits above the router, so
    // it is the one most able to make the whole app look like it reloaded.
    refetchOnWindowFocus: false,
  })

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      // Clear every cached query: leaving one user's attendance in the cache
      // where the next person to sign in on this machine could see it would be
      // a privacy failure.
      queryClient.clear()

      // Out to the landing page, not straight back to a sign-in form. Someone
      // who has just signed out has usually finished, and presenting the login
      // screen reads as though the sign-out failed and is asking them to go
      // again. A full navigation rather than a router push, so no React state
      // from the previous session survives.
      window.location.href = '/'
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data?.user ?? null,
      profile: data ?? null,
      isLoading,
      isAuthenticated: Boolean(data?.user),
      isAdmin: data?.user?.role === 'admin',
      signIn: authApi.signInWithGoogle,
      signOut,
    }),
    [data, isLoading, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.')
  }

  return context
}
