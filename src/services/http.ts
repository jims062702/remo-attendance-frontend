import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { ValidationErrors } from '@/types'

/**
 * The shared Axios instance.
 *
 * Requests go to a relative base URL. In development Vite proxies /api to
 * Laravel, and in production the SPA is served by Laravel itself -- so the
 * browser always sees one origin and the session cookie is first-party.
 */
export const http: AxiosInstance = axios.create({
  baseURL: '/api',
  // Required for cookie-based Sanctum auth: without it the browser sends no
  // session cookie and every request is anonymous.
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

/**
 * Laravel reads the CSRF token from this header, having set it as a readable
 * XSRF-TOKEN cookie. Axios does this automatically, but only when the cookie
 * and header names are the defaults -- naming them explicitly means the app
 * keeps working if those defaults ever change.
 */
http.defaults.xsrfCookieName = 'XSRF-TOKEN'
http.defaults.xsrfHeaderName = 'X-XSRF-TOKEN'

let csrfReady: Promise<unknown> | null = null

/**
 * Fetch the CSRF cookie once per page load, before the first mutating request.
 * Subsequent calls reuse the same promise so a burst of requests triggers a
 * single round trip.
 */
export function ensureCsrfCookie(): Promise<unknown> {
  csrfReady ??= axios.get('/sanctum/csrf-cookie', { withCredentials: true })
  return csrfReady
}

/** A CSRF token is only rejected because the page has gone stale; allow a refetch. */
export function resetCsrfCookie(): void {
  csrfReady = null
}

// ------------------------------------------------------------------- Errors

/**
 * Normalised error surface, so components never inspect Axios internals.
 *
 * Fields are declared and assigned explicitly rather than as constructor
 * parameter properties: `erasableSyntaxOnly` is on, and that shorthand emits
 * runtime code rather than being purely erasable.
 */
export class ApiError extends Error {
  readonly status: number

  /** Machine-readable code from the API, e.g. "attendance.already_timed_in". */
  readonly code: string | null

  /** Field-level validation messages, when the API returned 422. */
  readonly errors: Record<string, string[]>

  readonly context: Record<string, unknown>

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    errors: Record<string, string[]> = {},
    context: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors
    this.context = context
  }

  /** The first message for a field, for inline form errors. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0]
  }

  get isValidation(): boolean {
    return this.status === 422
  }

  get isUnauthenticated(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  /** A business-rule conflict, e.g. clocking in twice. */
  get isConflict(): boolean {
    return this.status === 409
  }
}

interface ApiErrorBody {
  message?: string
  code?: string
  errors?: Record<string, string[]>
  context?: Record<string, unknown>
}

/**
 * Translate every failure into an ApiError with a message worth showing.
 */
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    // No response at all: the server is unreachable or the request was aborted.
    if (!error.response) {
      return Promise.reject(
        new ApiError(
          'Could not reach the server. Check your connection and try again.',
          0,
          'network.unreachable',
        ),
      )
    }

    const { status, data } = error.response

    // The session's CSRF token expired; allow the next attempt to refetch it.
    if (status === 419) {
      resetCsrfCookie()
      return Promise.reject(
        new ApiError('Your session expired. Please refresh the page and try again.', 419, 'session.expired'),
      )
    }

    const fallback =
      status >= 500
        ? 'Something went wrong on the server. Please try again.'
        : 'That request could not be completed.'

    return Promise.reject(
      new ApiError(
        data?.message ?? fallback,
        status,
        data?.code ?? null,
        (data as ValidationErrors | undefined)?.errors ?? {},
        data?.context ?? {},
      ),
    )
  },
)

/**
 * Drop empty filter values so the query string carries only real filters --
 * the API rejects an empty `status` as an invalid enum.
 */
export function toQuery(filters: object): Record<string, string> {
  return Object.entries(filters).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== false) {
      acc[key] = String(value)
    }
    return acc
  }, {})
}
