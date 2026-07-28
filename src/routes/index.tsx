import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'

// Pages are code split so a tasker never downloads the admin bundle -- which
// is most of the application weight, including the charting library.
const TaskerDaily = lazy(() => import('@/pages/tasker/DailyFlowPage'))
const TaskerTasks = lazy(() => import('@/pages/tasker/TasksPage'))
const TaskerHistory = lazy(() => import('@/pages/tasker/HistoryPage'))
const TaskerTracker = lazy(() => import('@/pages/tasker/TrackerHistoryPage'))

const AdminDashboard = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminAttendance = lazy(() => import('@/pages/admin/AttendancePage'))
const AdminTasks = lazy(() => import('@/pages/admin/TasksPage'))
const AdminSubmissions = lazy(() => import('@/pages/admin/SubmissionsPage'))
const AdminTaskers = lazy(() => import('@/pages/admin/TaskersPage'))
const AdminTaskerDetail = lazy(() => import('@/pages/admin/TaskerDetailPage'))
const AdminReports = lazy(() => import('@/pages/admin/ReportsPage'))
const AdminImport = lazy(() => import('@/pages/admin/ImportPage'))
const AdminActivity = lazy(() => import('@/pages/admin/ActivityPage'))
const AdminLookups = lazy(() => import('@/pages/admin/LookupsPage'))

// Split like everything else: a signed-in tasker should never download the
// marketing page, and a visitor should never download the dashboard.
const LandingPage = lazy(() => import('@/pages/public/LandingPage'))

function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
        <p className="text-sm text-muted">Loading…</p>
      </div>
    </div>
  )
}

function PageSpinner() {
  return (
    <div className="flex min-h-64 items-center justify-center" aria-busy="true">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" />
    </div>
  )
}

/**
 * Requires a session; sends anonymous visitors to the landing page.
 *
 * Deliberately the landing page rather than the sign-in form. A visitor who
 * arrives on a deep link has not asked to sign in, they have asked to see the
 * product -- and dropping a stranger straight onto a bare "Continue with
 * Google" button, on a system where signing in cannot create an account,
 * offers them the one action guaranteed to fail. The landing page explains
 * what this is and carries the sign-in link for the people who do have an
 * account. `/login` stays directly reachable, and is still where the OAuth
 * callback returns its error codes.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />

  if (!isAuthenticated) {
    /*
     * Render the landing page rather than redirect to it when we are already
     * standing on its path.
     *
     * Two routes match "/" while signed out: the landing route below and this
     * guarded layout's index child. React Router settles that by declaration
     * order, so the landing route wins today -- but if it ever did not, a
     * redirect from "/" to "/" would spin forever. Answering in place removes
     * the failure mode instead of depending on the tie-break.
     */
    return location.pathname === '/' ? <LandingPage /> : <Navigate to="/" replace />
  }

  return <>{children}</>
}

/**
 * Requires an administrator.
 *
 * This is convenience, not security: every admin endpoint is independently
 * guarded server-side, so hiding the routes only keeps a tasker from reaching
 * a page whose requests would all fail anyway.
 */
function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) return <FullPageSpinner />
  if (!isAdmin) return <Navigate to="/" replace />

  return <>{children}</>
}

/** Admins land on their dashboard; taskers on their shift. */
function HomeRedirect() {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) return <FullPageSpinner />

  return isAdmin ? <Navigate to="/admin" replace /> : <TaskerDaily />
}

export function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth()

  // Resolved before any route is declared, because which component owns "/"
  // depends on the answer and a route tree that reshuffles mid-resolution
  // makes the landing page flash for signed-in users.
  if (isLoading) return <FullPageSpinner />

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/*
          "/" belongs to whoever is asking.

          A signed-in tasker's home IS "/" -- it is the "My Shift" entry in
          their sidebar -- so the landing page cannot simply claim the path.
          Declaring it only while anonymous means exactly one route ever
          matches, rather than two routes of equal specificity racing and
          react-router picking by declaration order.
        */}
        {!isAuthenticated && <Route path="/" element={<LandingPage />} />}

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<PageSpinner />}>
                <HomeRedirect />
              </Suspense>
            }
          />

          {/* Tasker */}
          <Route path="tasks" element={<Suspense fallback={<PageSpinner />}><TaskerTasks /></Suspense>} />
          <Route path="history" element={<Suspense fallback={<PageSpinner />}><TaskerHistory /></Suspense>} />
          <Route path="tracker" element={<Suspense fallback={<PageSpinner />}><TaskerTracker /></Suspense>} />

          {/* Admin */}
          <Route
            path="admin"
            element={
              <RequireAdmin>
                <Suspense fallback={<PageSpinner />}>
                  <AdminDashboard />
                </Suspense>
              </RequireAdmin>
            }
          />
          <Route
            path="admin/attendance"
            element={
              <RequireAdmin>
                <Suspense fallback={<PageSpinner />}><AdminAttendance /></Suspense>
              </RequireAdmin>
            }
          />
          <Route
            path="admin/submissions"
            element={
              <RequireAdmin>
                <Suspense fallback={<PageSpinner />}><AdminSubmissions /></Suspense>
              </RequireAdmin>
            }
          />
          <Route
            path="admin/tasks"
            element={
              <RequireAdmin>
                <Suspense fallback={<PageSpinner />}><AdminTasks /></Suspense>
              </RequireAdmin>
            }
          />
          <Route
            path="admin/taskers"
            element={
              <RequireAdmin>
                <Suspense fallback={<PageSpinner />}><AdminTaskers /></Suspense>
              </RequireAdmin>
            }
          />
          <Route
            path="admin/taskers/:id"
            element={
              <RequireAdmin>
                <Suspense fallback={<PageSpinner />}><AdminTaskerDetail /></Suspense>
              </RequireAdmin>
            }
          />
          <Route
            path="admin/reports"
            element={
              <RequireAdmin>
                <Suspense fallback={<PageSpinner />}><AdminReports /></Suspense>
              </RequireAdmin>
            }
          />
          <Route
            path="admin/import"
            element={
              <RequireAdmin>
                <Suspense fallback={<PageSpinner />}><AdminImport /></Suspense>
              </RequireAdmin>
            }
          />
          <Route
            path="admin/lookups"
            element={
              <RequireAdmin>
                <Suspense fallback={<PageSpinner />}><AdminLookups /></Suspense>
              </RequireAdmin>
            }
          />
          <Route
            path="admin/activity"
            element={
              <RequireAdmin>
                <Suspense fallback={<PageSpinner />}><AdminActivity /></Suspense>
              </RequireAdmin>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
