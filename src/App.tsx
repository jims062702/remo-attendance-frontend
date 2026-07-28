import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/hooks/useTheme'
import { MotionProvider } from '@/hooks/useMotion'
import { AppRoutes } from '@/routes'
import { ApiError } from '@/services/http'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 120_000,

      /*
       * Returning to the tab never refetches.
       *
       * Switching to another window and back is not a request for new data,
       * and treating it as one meant the whole screen reloaded, re-rendered
       * and re-animated every time someone glanced at their email.
       *
       * Nothing goes stale as a result, because focus was never what kept this
       * application current:
       *
       *   - the admin dashboard polls on its own 60s interval, which is where
       *     genuinely live figures live;
       *   - every mutation invalidates the queries it affects, so a tasker's
       *     own actions refresh their own view immediately;
       *   - filters and pagination refetch by changing the query key.
       *
       * Authorisation is unaffected either way: it is enforced server-side on
       * every request, so a revoked session fails at the next call rather than
       * relying on the client having re-checked itself.
       */
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Auth and validation failures are answers, not outages -- retrying
        // them only delays the message the user needs to see.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MotionProvider>
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
              <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4000 }} />
            </AuthProvider>
          </BrowserRouter>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
