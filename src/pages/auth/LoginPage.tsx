import { useQuery } from '@tanstack/react-query'
import { Navigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'

/**
 * Each error the sign-in flow can redirect back with, phrased so the person
 * reading it knows what to do next.
 *
 * "Not registered" deliberately does not hint at whether the address exists in
 * any other system, and every message points at an administrator rather than
 * suggesting a retry that would fail identically.
 */
const ERRORS: Record<string, { title: string; detail: string }> = {
  'google.not_registered': {
    title: 'No account for that address',
    detail:
      'Signing in with Google does not create an account. Ask an administrator to add your email address, then try again.',
  },
  'google.account_not_active': {
    title: 'Account not active',
    detail: 'Your account has been deactivated or suspended. Please contact an administrator.',
  },
  'google.email_not_verified': {
    title: 'Email not verified',
    detail: 'Google has not verified that address. Verify it with Google, then try again.',
  },
  'google.domain_not_allowed': {
    title: 'Domain not allowed',
    detail: 'That address is not on an approved domain for this workspace.',
  },
  'google.identity_mismatch': {
    title: 'Google account does not match',
    detail:
      'This account was set up with a different Google account. An administrator can relink it for you.',
  },
  'google.cancelled': {
    title: 'Sign-in cancelled',
    detail: 'You closed the Google window before finishing. No harm done — try again when ready.',
  },
  'google.not_configured': {
    title: 'Sign-in is not configured',
    detail:
      'Google sign-in has not been set up on this server yet. An administrator needs to add the Google client credentials.',
  },
  'google.failed': {
    title: 'Sign-in could not be completed',
    detail: 'Something went wrong talking to Google. Please try again.',
  },
}

export function LoginPage() {
  const { isAuthenticated, isLoading, signIn } = useAuth()
  const [params] = useSearchParams()

  const { data: status } = useQuery({
    queryKey: ['auth-status'],
    queryFn: authApi.status,
    retry: false,
    staleTime: Infinity,
  })

  const errorCode = params.get('error')
  const error = errorCode ? (ERRORS[errorCode] ?? ERRORS['google.failed']) : null

  // Already signed in (e.g. arriving back from the Google callback).
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const disabled = status?.google_enabled === false

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Sign-in panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 h-7" />

          <h1 className="text-2xl font-semibold text-body">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted">
            Use the Google account your administrator authorised.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-bad/30 bg-bad-soft px-4 py-3"
            >
              <p className="text-sm font-medium text-bad">{error.title}</p>
              <p className="mt-1 text-xs text-bad/90">{error.detail}</p>
            </div>
          )}

          {disabled && !error && (
            <div role="alert" className="mt-6 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3">
              <p className="text-sm font-medium text-warn">Sign-in is not configured</p>
              <p className="mt-1 text-xs text-warn/90">
                Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the backend .env file.
              </p>
            </div>
          )}

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={disabled}
            onClick={signIn}
            className="mt-6 border-line"
            icon={<GoogleMark />}
          >
            Continue with Google
          </Button>

          <p className="mt-6 text-xs leading-relaxed text-muted">
            Signing in does not create an account. If your address has not been added yet, ask an
            administrator to authorise it first.
          </p>
        </div>
      </div>

      {/* Context panel: hidden on small screens where it would just push the
          sign-in button below the fold. */}
      <div className="hidden flex-col justify-center border-l border-line bg-sunken px-12 py-12 lg:flex">
        <h2 className="text-lg font-semibold text-body">Attendance &amp; productivity, in one place</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          Time in and out on the server clock, record what you produced, and see your hours without
          a spreadsheet in sight.
        </p>

        <dl className="mt-8 space-y-5">
          {[
            {
              term: 'Built for the night shift',
              detail:
                'The 10:00 PM – 6:00 AM shift is treated as one shift, even though it crosses midnight. Clock out at 6 AM and it still counts against the night you started.',
            },
            {
              term: 'Server time, always',
              detail:
                'Every time in and time out is stamped by the server, so a wrong clock on a laptop can never change someone’s hours.',
            },
            {
              term: 'Hours calculated for you',
              detail:
                'Total hours rendered are computed and stored automatically — no formula to copy down a sheet, and nothing to get out of step.',
            },
          ].map((item) => (
            <div key={item.term} className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              <div>
                <dt className="text-sm font-medium text-body">{item.term}</dt>
                <dd className="mt-0.5 max-w-md text-sm text-muted">{item.detail}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}
