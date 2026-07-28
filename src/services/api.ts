import { ensureCsrfCookie, http, toQuery } from './http'
import type {
  ActivityLog,
  AdminDashboard,
  ApiResponse,
  Attendance,
  AttendanceAnalytics,
  AttendanceFilters,
  AuthStatus,
  ImportPreview,
  ImportResult,
  MetaOptions,
  PaginatedMeta,
  PublicFloorStats,
  Profile,
  Task,
  TaskFilters,
  TaskerDetail,
  TaskerFilters,
  TaskerSummary,
  TaskerSummaryRow,
  TodayMeta,
  User,
  DailyState,
  DailyOptions,
  TrackerEntry,
  WorkstationOption,
} from '@/types'

/** A list endpoint's response: the rows plus their pagination meta. */
export interface Page<T> {
  data: T[]
  meta: PaginatedMeta
}

// ---------------------------------------------------------------------- Auth

export const authApi = {
  /** Whether Google sign-in is configured, and where to send the browser. */
  status: async (): Promise<AuthStatus> =>
    (await http.get<ApiResponse<AuthStatus>>('/auth/status')).data.data,

  me: async (): Promise<Profile> => (await http.get<ApiResponse<Profile>>('/me')).data.data,

  logout: async (): Promise<void> => {
    await ensureCsrfCookie()
    await http.post('/logout')
  },

  /**
   * Signing in is a full browser navigation, not an XHR: Google will not
   * render its consent screen inside a fetch, and the OAuth `state` parameter
   * has to survive a real redirect.
   */
  signInWithGoogle: (): void => {
    window.location.href = '/auth/google/redirect'
  },
}

export const metaApi = {
  options: async (): Promise<MetaOptions> =>
    (await http.get<ApiResponse<MetaOptions>>('/meta/options')).data.data,
}

/** Unauthenticated aggregates for the landing page. Counts only, never names. */
export const publicApi = {
  floor: async (): Promise<PublicFloorStats> =>
    (await http.get<ApiResponse<PublicFloorStats>>('/public/floor')).data.data,
}

// ---------------------------------------------------------------- Attendance

export const attendanceApi = {
  /** The current shift, plus whether each clock action is available. */
  today: async (): Promise<{ attendance: Attendance | null; meta: TodayMeta }> => {
    const { data } = await http.get<ApiResponse<Attendance | null>>('/attendance/today')
    return { attendance: data.data, meta: data.meta as unknown as TodayMeta }
  },

  timeIn: async (): Promise<{ attendance: Attendance; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.post<ApiResponse<Attendance>>('/attendance/time-in')
    return { attendance: data.data, message: data.message ?? 'Timed in.' }
  },

  timeOut: async (): Promise<{ attendance: Attendance; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.post<ApiResponse<Attendance>>('/attendance/time-out')
    return { attendance: data.data, message: data.message ?? 'Timed out.' }
  },

  setCommitment: async (expected_hours: number): Promise<Attendance> => {
    await ensureCsrfCookie()
    const { data } = await http.post<ApiResponse<Attendance>>('/attendance/commitment', {
      expected_hours,
    })
    return data.data
  },

  history: async (filters: AttendanceFilters = {}): Promise<Page<Attendance>> => {
    const { data } = await http.get<ApiResponse<Attendance[]>>('/attendance/history', {
      params: toQuery(filters),
    })
    return { data: data.data, meta: data.meta as unknown as PaginatedMeta }
  },

  summary: async (filters: AttendanceFilters = {}): Promise<TaskerSummary> =>
    (
      await http.get<ApiResponse<TaskerSummary>>('/attendance/summary', {
        params: toQuery(filters),
      })
    ).data.data,
}

// --------------------------------------------------------------------- Tasks

export const taskApi = {
  list: async (filters: TaskFilters = {}): Promise<Page<Task>> => {
    const { data } = await http.get<ApiResponse<Task[]>>('/tasks', { params: toQuery(filters) })
    return { data: data.data, meta: data.meta as unknown as PaginatedMeta }
  },

  get: async (id: number): Promise<Task> =>
    (await http.get<ApiResponse<Task>>(`/tasks/${id}`)).data.data,

  create: async (payload: Record<string, unknown>): Promise<{ task: Task; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.post<ApiResponse<Task>>('/tasks', payload)
    return { task: data.data, message: data.message ?? 'Task submitted.' }
  },

  update: async (
    id: number,
    payload: Record<string, unknown>,
  ): Promise<{ task: Task; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.put<ApiResponse<Task>>(`/tasks/${id}`, payload)
    return { task: data.data, message: data.message ?? 'Task updated.' }
  },

  remove: async (id: number): Promise<string> => {
    await ensureCsrfCookie()
    const { data } = await http.delete<ApiResponse<null>>(`/tasks/${id}`)
    return data.message ?? 'Task removed.'
  },
}

// --------------------------------------------------------------------- Admin

export const adminApi = {
  dashboard: async (): Promise<AdminDashboard> =>
    (await http.get<ApiResponse<AdminDashboard>>('/admin/dashboard')).data.data,

  analytics: async (filters: AttendanceFilters = {}): Promise<AttendanceAnalytics> =>
    (
      await http.get<ApiResponse<AttendanceAnalytics>>('/admin/analytics/attendance', {
        params: toQuery(filters),
      })
    ).data.data,

  attendance: async (filters: AttendanceFilters = {}): Promise<Page<Attendance>> => {
    const { data } = await http.get<ApiResponse<Attendance[]>>('/admin/attendance', {
      params: toQuery(filters),
    })
    return { data: data.data, meta: data.meta as unknown as PaginatedMeta }
  },

  correctAttendance: async (
    id: number,
    payload: Record<string, unknown>,
  ): Promise<{ attendance: Attendance; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.put<ApiResponse<Attendance>>(`/admin/attendance/${id}`, payload)
    return { attendance: data.data, message: data.message ?? 'Attendance corrected.' }
  },

  markAttendance: async (payload: Record<string, unknown>): Promise<Attendance> => {
    await ensureCsrfCookie()
    const { data } = await http.post<ApiResponse<Attendance>>('/admin/attendance', payload)
    return data.data
  },

  // --------------------------------------------------------------- Taskers

  taskers: async (filters: TaskerFilters = {}): Promise<Page<User>> => {
    const { data } = await http.get<ApiResponse<User[]>>('/admin/taskers', {
      params: toQuery(filters),
    })
    return { data: data.data, meta: data.meta as unknown as PaginatedMeta }
  },

  createTasker: async (
    payload: Record<string, unknown>,
  ): Promise<{ user: User; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.post<ApiResponse<User>>('/admin/taskers', payload)
    return { user: data.data, message: data.message ?? 'Tasker added.' }
  },

  updateTasker: async (
    id: number,
    payload: Record<string, unknown>,
  ): Promise<{ user: User; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.put<ApiResponse<User>>(`/admin/taskers/${id}`, payload)
    return { user: data.data, message: data.message ?? 'Tasker updated.' }
  },

  deactivateTasker: async (id: number): Promise<string> => {
    await ensureCsrfCookie()
    const { data } = await http.delete<ApiResponse<null>>(`/admin/taskers/${id}`)
    return data.message ?? 'Tasker deactivated.'
  },

  reactivateTasker: async (id: number): Promise<{ user: User; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.post<ApiResponse<User>>(`/admin/taskers/${id}/restore`)
    return { user: data.data, message: data.message ?? 'Tasker reactivated.' }
  },

  taskerDetail: async (id: number, filters: AttendanceFilters = {}): Promise<TaskerDetail> =>
    (
      await http.get<ApiResponse<TaskerDetail>>(`/admin/taskers/${id}/summary`, {
        params: toQuery(filters),
      })
    ).data.data,

  // --------------------------------------------------------------- Reports

  taskerSummaryReport: async (filters: AttendanceFilters = {}): Promise<TaskerSummaryRow[]> =>
    (
      await http.get<ApiResponse<TaskerSummaryRow[]>>('/admin/reports/tasker-summary', {
        params: toQuery(filters),
      })
    ).data.data,

  /** Nightly tracker submissions across all taskers. */
  trackerEntries: async (filters: Record<string, unknown> = {}): Promise<Page<TrackerEntry>> => {
    const { data } = await http.get<ApiResponse<TrackerEntry[]>>('/admin/tracker-entries', {
      params: toQuery(filters),
    })
    return { data: data.data, meta: data.meta as unknown as PaginatedMeta }
  },

  /** Reference lists, reused by the admin submission filters. */
  dailyOptions: async (): Promise<DailyOptions> =>
    (await http.get<ApiResponse<DailyOptions>>('/daily/options')).data.data,

  activityLogs: async (filters: Record<string, unknown> = {}): Promise<Page<ActivityLog>> => {
    const { data } = await http.get<ApiResponse<ActivityLog[]>>('/admin/activity-logs', {
      params: toQuery(filters),
    })
    return { data: data.data, meta: data.meta as unknown as PaginatedMeta }
  },

  // ---------------------------------------------------------------- Excel

  /**
   * Download a formatted workbook.
   *
   * Fetched as a blob rather than navigating to the URL so that an error
   * response is surfaced in the UI instead of replacing the page with JSON,
   * and so the session cookie travels with the request.
   */
  exportReport: async (
    type: 'attendance' | 'productivity' | 'taskers' | 'tasker-summary',
    filters: AttendanceFilters = {},
  ): Promise<void> => {
    const response = await http.get(`/admin/exports/${type}`, {
      params: toQuery(filters),
      responseType: 'blob',
    })

    const disposition = String(response.headers['content-disposition'] ?? '')
    const match = disposition.match(/filename="?([^"';]+)"?/i)
    const filename = match?.[1] ?? `${type}-report.xlsx`

    const url = URL.createObjectURL(response.data as Blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },

  downloadImportTemplate: async (): Promise<void> => {
    const response = await http.get('/admin/imports/attendance/template', { responseType: 'blob' })
    const url = URL.createObjectURL(response.data as Blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'attendance_import_template.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },

  /** Phase one: validate and preview. Writes nothing. */
  previewImport: async (file: File): Promise<{ preview: ImportPreview; message: string }> => {
    await ensureCsrfCookie()
    const form = new FormData()
    form.append('file', file)

    const { data } = await http.post<ApiResponse<ImportPreview>>(
      '/admin/imports/attendance/preview',
      form,
    )
    return { preview: data.data, message: data.message ?? '' }
  },

  /** Phase two: write the rows that passed validation. */
  commitImport: async (token: string): Promise<{ result: ImportResult; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.post<ApiResponse<ImportResult>>(
      '/admin/imports/attendance/commit',
      { token },
    )
    return { result: data.data, message: data.message ?? 'Import complete.' }
  },
}

// -------------------------------------------------------------- Daily flow

export const dailyApi = {
  /** Current state of tonight's flow, plus pre-fill data. */
  state: async (): Promise<DailyState> =>
    (await http.get<ApiResponse<DailyState>>('/daily/state')).data.data,

  /**
   * Static reference data for the flow's pickers.
   *
   * No longer carries workstations -- see `workstations` below.
   */
  options: async (): Promise<DailyOptions> =>
    (await http.get<ApiResponse<DailyOptions>>('/daily/options')).data.data,

  /**
   * The PC picker, with live claim state.
   *
   * Split from `options` so it is only requested while a desk is actually being
   * chosen, rather than on the same schedule as a list of support teams.
   */
  workstations: async (): Promise<WorkstationOption[]> =>
    (await http.get<ApiResponse<WorkstationOption[]>>('/daily/workstations')).data.data,

  /** Step 1 + 2 — file the activation and claim a PC. Clocks in on server time. */
  activate: async (
    payload: Record<string, unknown>,
  ): Promise<{ attendance: Attendance; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.post<ApiResponse<Attendance>>('/daily/activate', payload)
    return { attendance: data.data, message: data.message ?? 'Attendance filed.' }
  },

  /** Step 3 — the production declaration. */
  submitTracker: async (
    payload: Record<string, unknown>,
  ): Promise<{ entry: TrackerEntry; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.post<ApiResponse<TrackerEntry>>('/daily/tracker', payload)
    return { entry: data.data, message: data.message ?? 'Tracker entry saved.' }
  },

  trackerHistory: async (filters: Record<string, unknown> = {}): Promise<Page<TrackerEntry>> => {
    const { data } = await http.get<ApiResponse<TrackerEntry[]>>('/daily/tracker/history', {
      params: toQuery(filters),
    })
    return { data: data.data, meta: data.meta as unknown as PaginatedMeta }
  },
}

// ---------------------------------------------------------- Lookup lists

export type LookupType = 'projects' | 'workstations' | 'sites' | 'support-teams'

export interface LookupRow {
  id: number
  is_active: boolean
  created_at: string | null
  code?: string
  name?: string | null
  site_id?: number | null
  site_name?: string | null
  notes?: string | null
  /** Support machines are hidden from the tasker PC picker entirely. */
  is_support?: boolean
}

/**
 * Reference lists the daily flow depends on. One shared shape for all four,
 * matching the single backend controller.
 */
export const lookupApi = {
  list: async (
    type: LookupType,
    filters: Record<string, unknown> = {},
  ): Promise<Page<LookupRow>> => {
    const { data } = await http.get<ApiResponse<LookupRow[]>>(`/admin/lookups/${type}`, {
      params: toQuery(filters),
    })
    return { data: data.data, meta: data.meta as unknown as PaginatedMeta }
  },

  create: async (
    type: LookupType,
    payload: Record<string, unknown>,
  ): Promise<{ row: LookupRow; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.post<ApiResponse<LookupRow>>(`/admin/lookups/${type}`, payload)
    return { row: data.data, message: data.message ?? 'Added.' }
  },

  update: async (
    type: LookupType,
    id: number,
    payload: Record<string, unknown>,
  ): Promise<{ row: LookupRow; message: string }> => {
    await ensureCsrfCookie()
    const { data } = await http.put<ApiResponse<LookupRow>>(`/admin/lookups/${type}/${id}`, payload)
    return { row: data.data, message: data.message ?? 'Updated.' }
  },

  /** Retires rather than deletes; historical entries keep resolving. */
  retire: async (type: LookupType, id: number): Promise<string> => {
    await ensureCsrfCookie()
    const { data } = await http.delete<ApiResponse<LookupRow>>(`/admin/lookups/${type}/${id}`)
    return data.message ?? 'Retired.'
  },
}
