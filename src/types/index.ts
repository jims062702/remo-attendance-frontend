/**
 * The API contract, mirrored from the Laravel API Resources.
 *
 * Field names match the JSON exactly (snake_case) rather than being remapped
 * to camelCase: one naming convention across the wire means a response can be
 * compared against these types by eye, and there is no translation layer to
 * drift out of sync.
 */

// ------------------------------------------------------------------ Envelope

/** Every successful response is wrapped in this shape. */
export interface ApiResponse<T> {
  data: T
  message?: string
  meta?: Record<string, unknown>
}

export interface Pagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface PaginatedMeta {
  pagination: Pagination
  totals?: AttendanceTotals
  filters?: Record<string, string>
  /** On the admin roster: the configured repeated-absence rule. */
  absence_rule?: { threshold: number; window_days: number }
}

/** Laravel's validation error payload. */
export interface ValidationErrors {
  message: string
  errors: Record<string, string[]>
}

// --------------------------------------------------------------------- Enums

export type UserRole = 'admin' | 'tasker'
export type UserStatus = 'active' | 'inactive' | 'suspended'

export type AttendanceStatus = 'present' | 'late' | 'incomplete' | 'absent' | 'on_leave'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'

export interface EnumOption<T extends string = string> {
  value: T
  label: string
}

// --------------------------------------------------------------------- Models

/**
 * Repeated-absence standing, over a fixed rolling window.
 *
 * The threshold and window travel with the payload because both are
 * server-configurable; a client that hardcoded "4 in 30 days" would start
 * lying the moment an operation changed them.
 */
export interface AbsenceRisk {
  absences: number
  threshold: number
  window_days: number
  window_start: string
  /** At or over the threshold — recommend review for discontinuation. */
  at_risk: boolean
  /** Exactly one short of it. A warning is only useful before the decision. */
  approaching: boolean
}

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  role_label: string
  status: UserStatus
  status_label: string
  avatar_url: string | null
  /** False when the account is authorised but has never completed a Google sign-in. */
  has_signed_in: boolean
  /** Present on the admin roster; absent on endpoints that do not compute it. */
  absence_risk?: AbsenceRisk
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface Attendance {
  id: number
  user_id: number
  /**
   * The BUSINESS date of the shift -- the date it started. For the overnight
   * 10 PM - 6 AM shift this is not necessarily the calendar date of time_in:
   * a 00:30 arrival still belongs to the previous night. Always label this
   * "Shift date" in the UI, never "Date".
   */
  attendance_date: string
  /** Full ISO 8601 with offset, so a shift crossing midnight is unambiguous. */
  time_in: string | null
  time_out: string | null
  total_hours: number | null
  expected_hours: number | null
  /** total_hours - expected_hours. Null while the shift is still open. */
  variance: number | null
  status: AttendanceStatus
  status_label: string

  // Daily-flow fields.
  commitment_bracket: CommitmentBracket | null
  commitment_bracket_label: string | null
  workstation_id: number | null
  workstation_name?: string | null
  pc_status: PcStatus | null
  pc_status_label: string | null
  /** Several tasking statuses may be filed for one shift. */
  tasking_statuses?: EnumOption[]

  is_open: boolean
  notes: string | null
  scheduled_start: string
  scheduled_end: string
  minutes_late: number | null
  user?: User
  tasks?: Task[]
  tasks_count?: number
  created_at: string | null
  updated_at: string | null
}

export interface Task {
  id: number
  /** System-generated and always present, e.g. TASK-20260726-0001. */
  task_code: string
  /** Optional client/legacy reference; null renders as "N/A". */
  external_task_id: string | null
  external_task_id_display: string
  user_id: number
  attendance_id: number | null
  task_date: string
  task_name: string
  task_description: string | null
  output_count: number
  task_status: TaskStatus
  task_status_label: string
  screenshot_link: string | null
  screenshot_link_display: string
  notes: string | null
  user?: User
  attendance?: Attendance
  created_at: string | null
  updated_at: string | null
}

export interface ActivityLog {
  id: number
  action: string
  description: string | null
  subject_type: string | null
  subject_id: number | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  user?: User
  created_at: string | null
}

// ---------------------------------------------------------------- Auth / meta

export interface ShiftSettings {
  business_date?: string
  start: string
  end: string
  standard_hours: number
  grace_minutes: number
  timezone?: string
  max_shift_hours?: number
  commitment_min?: number
  commitment_max?: number
}

export interface Profile {
  user: User
  shift: ShiftSettings
}

export interface AuthStatus {
  google_enabled: boolean
  google_redirect_url: string
  app_name: string
}

export interface MetaOptions {
  attendance_statuses: EnumOption<AttendanceStatus>[]
  task_statuses: EnumOption<TaskStatus>[]
  user_roles: EnumOption<UserRole>[]
  user_statuses: EnumOption<UserStatus>[]
  admin_assignable_attendance_statuses: EnumOption<AttendanceStatus>[]
  shift: ShiftSettings

  // Daily flow vocabularies.
  commitment_brackets: EnumOption<CommitmentBracket>[]
  /** Grouped by category; 24 flat options would be unusable. */
  tasking_statuses: Record<string, EnumOption[]>
  tenurities: EnumOption<Tenurity>[]
  tasker_levels: EnumOption<TaskerLevel>[]
  task_complexities: EnumOption<TaskComplexity>[]
  pc_statuses: EnumOption<PcStatus>[]
}

// ------------------------------------------------------------------ Aggregates

export interface AttendanceTotals {
  records: number
  taskers: number
  total_hours: number
  average_hours: number | null
  late: number
  missing_time_out: number
  expected_hours: number
  variance: number
}

export interface TodayMeta {
  business_date: string
  scheduled_start: string
  scheduled_end: string
  can_time_in: boolean
  can_time_out: boolean
  totals: ProductionTotals
}

export interface DashboardSummary {
  business_date: string
  shift_start: string
  shift_end: string
  total_taskers: number
  active_taskers: number
  attendance_today: number
  currently_timed_in: number
  late_today: number
  total_hours_today: number

  /**
   * Production filed through the nightly flow — tracker entries, not the
   * optional Extra Tasks page. `submissions_today` counts entries and matches
   * what the admin Submissions screen lists.
   */
  submissions_today: number
  output_today: number
  task_ids_today: number
  sbq_today: number

  /** The separate Extra Tasks page. Never added into the figures above. */
  extra_tasks_today: number
  extra_output_today: number
  completed_tasks_today: number
  pending_tasks_today: number
  in_progress_tasks_today: number
}

/**
 * Aggregate floor figures for the public landing page.
 *
 * Counts only. The endpoint behind this is unauthenticated, so it deliberately
 * carries nothing that could identify a person — if a name ever appears in this
 * interface, something has gone wrong upstream.
 */
export interface PublicFloorStats {
  business_date: string
  active_taskers: number
  currently_timed_in: number
  roll_call: {
    present: { count: number; percent: number }
    late: { count: number; percent: number }
    not_yet_in: { count: number; percent: number }
  }
}

export interface AdminDashboard {
  summary: DashboardSummary
  currently_on_shift: Attendance[]
}

export interface AnalyticsBucket {
  bucket: string
  records: number
  present: number
  late: number
  incomplete: number
  absent: number
  missing_time_out: number
  total_hours: number
}

export interface AttendanceAnalytics {
  group_by: 'day' | 'week' | 'month'
  series: AnalyticsBucket[]
  totals: AttendanceTotals
}

export interface TaskerSummary {
  attendance: {
    records: number
    days_worked: number
    late_days: number
    absent_days: number
    missing_time_out: number
    total_hours: number
    average_hours_per_day: number | null
    expected_hours: number
    variance: number
    attendance_rate: number | null
  }
  /** The optional Extra Tasks page only. */
  productivity: {
    total_tasks: number
    completed_tasks: number
    pending_tasks: number
    in_progress_tasks: number
    cancelled_tasks: number
    total_output: number
    average_daily_output: number | null
    completion_rate: number | null
    output_per_hour: number | null
  }
  /**
   * Production filed through the nightly flow. For most taskers this is all of
   * their work; `productivity` above covers only ad-hoc extra submissions.
   */
  production: {
    nights_filed: number
    total_tasks: number
    task_ids: number
    sbq: number
    declared_hours: number
    average_tasks_per_night: number | null
    tasks_per_hour: number | null
  }
}

export interface TaskerDetail {
  user: User
  summary: TaskerSummary
  /**
   * Independent of the page's date filter by design: the warning is about a
   * fixed recent window, so widening a date picker must not appear to put
   * someone at risk.
   */
  absence_risk: AbsenceRisk
  recent_attendance: Attendance[]
  recent_tasks: Task[]
}

export interface TaskerSummaryRow {
  user_id: number
  name: string
  email: string
  status: UserStatus
  days_worked: number
  late_days: number
  total_hours: number
  average_hours: number | null
  expected_hours: number
  variance: number
  total_tasks: number
  completed_tasks: number
  total_output: number
  average_daily_output: number | null
  completion_rate: number | null
}

// --------------------------------------------------------------------- Import

export interface ImportRow {
  row: number
  valid: boolean
  errors: string[]
  will_update: boolean
  input: {
    email: string
    shift_date: string | null
    time_in: string | null
    time_out: string | null
    expected_hours: number | null
    status: AttendanceStatus | null
    notes: string | null
  }
}

export interface ImportPreview {
  token: string
  filename: string
  summary: { total: number; valid: number; invalid: number; will_update: number }
  rows: ImportRow[]
}

export interface ImportResult {
  summary: {
    total: number
    valid: number
    invalid: number
    will_update: number
    imported: number
    updated: number
  }
  rows: ImportRow[]
}

// --------------------------------------------------------------------- Filters

export interface AttendanceFilters {
  from?: string
  to?: string
  user_id?: string
  status?: AttendanceStatus | ''
  search?: string
  group_by?: 'day' | 'week' | 'month'
  page?: number
  per_page?: number
  sort?: string
  direction?: 'asc' | 'desc'
}

export interface TaskFilters {
  from?: string
  to?: string
  user_id?: string
  task_status?: TaskStatus | ''
  search?: string
  page?: number
  per_page?: number
}

export interface TaskerFilters {
  search?: string
  status?: UserStatus | ''
  role?: UserRole | ''
  include_deleted?: boolean
  page?: number
  per_page?: number
  sort?: string
  direction?: 'asc' | 'desc'
}

// ============================================================ Daily flow
//
// The guided nightly sequence: attendance activation and PC claim, then the
// production declaration. Mirrors the Remotask operational forms.

export type CommitmentBracket =
  | '1_2_hours'
  | '2_4_hours'
  | '4_6_hours'
  | '7_plus_hours'
  | 'absent_support_entry'
  | 'discontinued_support_entry'
  | 'disabled_support_entry'

export type Tenurity = 'newbie' | 'trained' | 'expert'

export type TaskerLevel = 'attempter' | 'l0' | 'l1' | 'l4' | 'l8' | 'l10' | 'l12'

export type PcStatus = 'used' | 'vacant' | 'support' | 'maintenance' | 'reserved' | 'other'

export type TaskComplexity =
  | 'short_frame'
  | 'small_scene_frame'
  | 'mid_scene_frames'
  | 'large_dense_3k'
  | 'large_dense_4k'
  | 'large_dense_5k'
  | 'large_dense_6k'
  | 'large_dense_7k'
  | 'super_dense_8k'
  | 'mixed'
  | 'empty_queue'

export interface WorkstationOption {
  id: number
  name: string
  site: string | null
  site_id: number | null
  /** Already taken for tonight's shift by someone else. */
  is_claimed: boolean
  claimed_by: string | null
  /**
   * Permanently outside the tasker pool. Included in the payload rather than
   * omitted so the floor map matches the physical room; never selectable.
   */
  is_support: boolean
  /**
   * Position on the floor plan. Null until an admin places the machine — it
   * then drops off the map but stays fully selectable in the list view.
   */
  floor_block: number | null
  floor_row: number | null
  floor_col: number | null
}

export interface ProjectOption {
  id: number
  code: string
  name: string | null
}

export interface NamedOption {
  id: number
  name: string
}

/**
 * Static reference lists for the daily flow.
 *
 * Workstations are deliberately NOT here: they carry live claim state for the
 * whole floor and are fetched separately, only while a PC is being picked.
 */
export interface DailyOptions {
  projects: ProjectOption[]
  sites: NamedOption[]
  support_teams: NamedOption[]
}

/**
 * One project's block inside a nightly entry. A tasker on aloha and ego the
 * same night has two of these, each with its own IDs, complexity and
 * screenshot.
 */
export interface TrackerItem {
  id?: number
  project_id: number
  /** Level is per project — the same tasker may differ between projects. */
  tasker_level: TaskerLevel | null
  tasker_level_label?: string | null
  project_code?: string
  project_name?: string | null
  total_tasks: number
  task_ids: string | null
  task_ids_display?: string
  task_id_count?: number
  sbq_count?: number
  task_complexity: TaskComplexity | null
  task_complexity_label?: string | null
  screenshot_links: string | null
  screenshot_links_display?: string
}

export interface TrackerEntry {
  id: number
  user_id: number
  attendance_id: number | null
  entry_date: string
  tenurity: Tenurity
  tenurity_label: string
  site_id: number | null
  site_name: string | null
  support_team_id: number | null
  support_team_name: string | null
  /** Rolled up across every block. */
  task_id_count: number
  sbq_count: number
  /** The tasker's own productive-hours figure, breaks excluded. */
  declared_hours: number | null
  remarks: string | null
  remarks_display: string
  items?: TrackerItem[]
  total_tasks?: number
  /** declared_hours minus clocked hours; negative is expected. */
  hours_gap?: number | null
  user?: User
  attendance?: Attendance
  created_at: string | null
  updated_at: string | null
}

export interface DailySteps {
  activation: boolean
  clocked_in: boolean
  tracker: boolean
  clocked_out: boolean
}

export interface ProductionWindow {
  days: number
  tasks: number
  task_ids: number
  sbq: number
  hours: number
}

/** Tonight / this week / this month, measured in business dates. */
export interface ProductionTotals {
  today: ProductionWindow
  week: ProductionWindow
  month: ProductionWindow
  week_starts: string
  month_starts: string
}

export interface DailyState {
  business_date: string
  scheduled_start: string
  scheduled_end: string
  /**
   * When the business date next rolls over — the moment a finished tasker can
   * file another night. Comes from the same config the server resolves dates
   * with, so it cannot drift from actual behaviour.
   */
  next_shift_opens_at: string
  steps: DailySteps
  attendance: Attendance | null
  tracker: TrackerEntry | null
  /** Previous entry, used to pre-fill the form. */
  last_entry: TrackerEntry | null
  can_time_out: boolean
  totals: ProductionTotals
}

/** Grouped so 24 tasking statuses are not one flat wall of options. */
export type GroupedTaskingStatuses = Record<string, EnumOption[]>
