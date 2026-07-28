import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { attendanceApi, dailyApi, metaApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { AttendanceBadge, Badge } from '@/components/ui/StatusBadge'
import { Field, Select } from '@/components/ui/Field'
import { ErrorState } from '@/components/ui/Table'
import { ShiftTimeline } from '@/components/dashboard/ShiftTimeline'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { FlowStepper, type FlowStep } from '@/components/flow/FlowStepper'
import { StepPanel, SubStep } from '@/components/flow/StepPanel'
import { Chip, ChoiceTile } from '@/components/flow/Choice'
import { WorkstationPicker } from '@/components/flow/WorkstationPicker'
import { FloorPlanPicker } from '@/components/flow/FloorPlanPicker'
import { Segmented } from '@/components/ui/Segmented'
import { Ring } from '@/components/ui/Ring'
import {
  cn,
  elapsedHours,
  elapsedSince,
  formatDate,
  formatHours,
  formatShiftTime,
  formatTime,
} from '@/utils/format'
import { TrackerStep } from './TrackerStep'
import type { CommitmentBracket, DailyState, PcStatus, WorkstationOption } from '@/types'

type StepKey = 'activation' | 'tracker' | 'timeout'

/**
 * The tasker's nightly flow.
 *
 * Activation and the PC claim are one step because claiming a machine IS
 * clocking in -- there is a single clock per shift, so there is nothing to
 * reconcile afterwards.
 */
export default function DailyFlowPage() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()

  /*
   * None of these poll on a timer, and that is the single most important
   * performance property of this page.
   *
   * This is the screen every tasker leaves open for their entire shift. The
   * two queries here used to carry `refetchInterval: 60_000`, so each open tab
   * sent two requests a minute whether or not anyone touched it. On a full
   * floor of 30,000 that is 60,000 requests a minute -- around a thousand a
   * second of pure idle traffic, before a single person actually does
   * anything. The options request was the worse of the two: it rebuilt the
   * entire floor's PC claim state per call.
   *
   * Nothing was gained for it. A tasker's own state only changes when they act,
   * and every action already invalidates these queries directly. The running
   * clock on screen is derived from `time_in` on a local ticker, so it stays
   * live with no network at all.
   *
   * So this page now refreshes on exactly three occasions: when it is opened,
   * when the tasker does something, and when they ask it to. The last of those
   * is why the hero carries a visible "updated N ago" and a refresh control --
   * with focus-refetch off, a page that silently never updates and never says
   * so is worse than one that updates too often.
   */
  const state = useQuery({
    queryKey: ['daily', 'state'],
    queryFn: dailyApi.state,
    staleTime: 30_000,
  })

  /*
   * Wake up exactly once, when the business date rolls over.
   *
   * This is the one moment the page genuinely goes stale on its own: at the
   * cutoff, last night stops being "tonight" and a new shift opens. Without
   * this, a tab left open across midday keeps showing a finished shift and the
   * tasker concludes the system is stuck -- there is nothing on screen to say
   * that the thing they are waiting for has already happened.
   *
   * A single timer to that exact moment, rather than polling for it. One
   * request per tasker per day, fired when the answer actually changes, which
   * is what makes it affordable on a full floor where a one-minute poll would
   * be five hundred requests a second.
   */
  const opensAt = state.data?.next_shift_opens_at

  useEffect(() => {
    if (!opensAt) return

    // A second past the cutoff, so the server has unambiguously rolled over
    // rather than being raced by a clock a few milliseconds ahead.
    const delay = new Date(opensAt).getTime() - Date.now() + 1000
    if (delay <= 0) return

    const timer = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ['daily'] })
    }, delay)

    return () => window.clearTimeout(timer)
  }, [opensAt, queryClient])

  // Lookup tables. They change when an admin edits them, so they are read once
  // per session rather than re-fetched against the clock.
  const options = useQuery({
    queryKey: ['daily', 'options'],
    queryFn: dailyApi.options,
    staleTime: 10 * 60 * 1000,
  })

  const meta = useQuery({ queryKey: ['meta'], queryFn: metaApi.options, staleTime: Infinity })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['daily'] })
    void queryClient.invalidateQueries({ queryKey: ['attendance'] })
  }

  const timeOut = useMutation({
    mutationFn: attendanceApi.timeOut,
    onSuccess: ({ message }) => {
      toast.success(message)
      refresh()
    },
    onError: (error: ApiError) => toast.error(error.message),
  })

  const steps = state.data?.steps

  // Land the tasker on whichever step is next, rather than always step one.
  const [step, setStep] = useState<StepKey>('activation')
  useEffect(() => {
    if (!steps) return
    if (!steps.activation) setStep('activation')
    else if (!steps.tracker) setStep('tracker')
    else setStep('timeout')
  }, [steps?.activation, steps?.tracker, steps?.clocked_out])

  /*
   * The PC picker is the one genuinely live list, so it is the one thing still
   * fetched on a schedule -- but only while it is actually on screen and still
   * relevant. Once a desk is claimed the tasker is timed in, the query is
   * disabled, and no further requests are made for the rest of the night,
   * which is the state they spend almost all of their shift in.
   */
  const pickingPc = step === 'activation' && !steps?.clocked_in

  const workstations = useQuery({
    queryKey: ['daily', 'workstations'],
    queryFn: dailyApi.workstations,
    enabled: pickingPc,
    refetchInterval: pickingPc ? 30_000 : false,
    staleTime: 10_000,
  })

  if (state.isError) {
    return (
      <ErrorState
        title="Could not load tonight's shift"
        description={(state.error as ApiError)?.message}
        onRetry={() => void state.refetch()}
      />
    )
  }

  return (
    <div className="space-y-5">
      {state.isLoading ? (
        <div className="skeleton h-56 rounded-2xl" />
      ) : (
        <TonightHero
          name={user?.name?.split(' ')[0] ?? 'there'}
          state={state.data!}
          shift={{
            start: profile?.shift.start ?? '22:00',
            end: profile?.shift.end ?? '06:00',
          }}
          updatedAt={state.dataUpdatedAt}
          refreshing={state.isFetching}
          onRefresh={() => void state.refetch()}
        />
      )}

      {state.isLoading ? (
        <Card className="p-6">
          <div className="skeleton h-40 rounded-lg" />
        </Card>
      ) : (
        <>
          <Reveal ready delay={120}>
            <FlowStepper
              steps={buildFlowSteps(state.data!)}
              current={step}
              onSelect={(key) => setStep(key as StepKey)}
            />
          </Reveal>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
            {/* Keyed on the step so moving through the flow re-plays the
                entrance -- the panel genuinely is new content, not the same
                panel with different text in it. */}
            <Reveal key={step} ready delay={200} className="min-w-0 space-y-5">
          {step === 'activation' && (
            <ActivationStep
              state={state.data!}
              workstations={workstations.data ?? []}
              workstationsLoading={workstations.isLoading && pickingPc}
              brackets={meta.data?.commitment_brackets ?? []}
              taskingStatuses={meta.data?.tasking_statuses ?? {}}
              pcStatuses={meta.data?.pc_statuses ?? []}
              onSaved={() => {
                refresh()
                setStep('tracker')
              }}
            />
          )}

          {step === 'tracker' && (
            <TrackerStep
              state={state.data!}
              options={options.data}
              meta={meta.data}
              onSaved={() => {
                refresh()
                setStep('timeout')
              }}
              onBack={() => setStep('activation')}
            />
          )}

          {step === 'timeout' && (
            <TimeOutStep
              state={state.data!}
              onTimeOut={() => timeOut.mutate()}
              pending={timeOut.isPending}
            />
          )}
            </Reveal>

            {/* Context rail: what the tasker has produced. Alongside the form
                on a wide screen rather than stacked above it, where it pushed
                the actual work down the page. */}
            <Reveal ready delay={280} className="xl:sticky xl:top-24">
              {state.data?.totals && <ProductionTotals totals={state.data.totals} />}
            </Reveal>
          </div>
        </>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ Flow model

/**
 * The three steps, described for the stepper.
 *
 * Kept here rather than inside the stepper because what a step *recorded* is
 * domain knowledge -- the commitment bracket, which PC, what time the clock
 * started -- and the stepper's job is only to render whatever it is handed.
 *
 * The locked reasons encode the real dependency: the tracker needs an
 * attendance row to attach to, and there is nothing to time out of until the
 * clock has started. A support-filed absence never starts a clock, so its
 * "time out" stays locked all night and says so, rather than presenting a
 * button that would fail.
 */
function buildFlowSteps(state: DailyState): FlowStep[] {
  const attendance = state.attendance
  const tracker = state.tracker
  const steps = state.steps

  const activationSummary = [
    attendance?.commitment_bracket_label,
    attendance?.workstation_name,
    attendance?.time_in ? `in ${formatTime(attendance.time_in)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const trackerSummary = tracker
    ? [
        `${tracker.total_tasks ?? 0} task${(tracker.total_tasks ?? 0) === 1 ? '' : 's'}`,
        `${tracker.task_id_count} ID${tracker.task_id_count === 1 ? '' : 's'}`,
        tracker.sbq_count > 0 ? `${tracker.sbq_count} SBQ` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined

  return [
    {
      key: 'activation',
      label: 'Attendance & PC',
      purpose: 'Tell us how long you can commit and which PC you are on.',
      done: steps.activation,
      summary: activationSummary || undefined,
    },
    {
      key: 'tracker',
      label: 'Tracker entry',
      purpose: 'Declare what you produced tonight, project by project.',
      done: steps.tracker,
      lockedReason: steps.activation
        ? undefined
        : 'File your attendance first — your entry attaches to it.',
      summary: trackerSummary,
    },
    {
      key: 'timeout',
      label: 'Time out',
      purpose: 'Stop the clock. Your hours are worked out from it automatically.',
      done: steps.clocked_out,
      lockedReason: steps.clocked_in
        ? undefined
        : steps.activation
          ? 'No clock was started — this was filed as a support entry.'
          : 'You have not timed in yet.',
      summary:
        attendance?.total_hours != null
          ? `${formatHours(attendance.total_hours, '')} hrs clocked`
          : undefined,
    },
  ]
}

/**
 * The tasker's own output over three windows.
 *
 * Answers "how much have I actually done?" without sending them to a report.
 * Windows are business dates, so a shift finishing at 6 AM Monday counts
 * against Sunday night -- the night they think of themselves as having worked.
 */
function ProductionTotals({ totals }: { totals: NonNullable<DailyState['totals']> }) {
  const windows = [
    { key: 'today', label: 'Tonight', data: totals.today },
    { key: 'week', label: 'This week', data: totals.week },
    { key: 'month', label: 'This month', data: totals.month },
  ] as const

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Your production" description="Counted by shift night, not calendar day" />

      <div className="border-t border-line">
        {windows.map((w) => (
          <section
            key={w.key}
            aria-label={w.label}
            className="border-b border-line/60 px-5 py-3.5 last:border-b-0"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold tracking-[0.1em] text-muted uppercase">
                {w.label}
              </p>
              <p className="numeric text-[13px] text-faint tabular-nums">
                {w.data.days} {w.data.days === 1 ? 'night' : 'nights'}
              </p>
            </div>

            <div className="mt-1.5 flex items-baseline gap-2">
              <AnimatedNumber
                value={w.data.tasks}
                format={(n) => Math.round(n).toLocaleString()}
                className="numeric text-[30px] leading-none font-semibold tracking-tight text-brand tabular-nums"
              />
              <p className="text-[13px] text-muted">tasks</p>
            </div>

            <dl className="mt-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
              <div className="flex gap-1.5">
                <dt className="text-faint">IDs</dt>
                <dd className="numeric font-semibold text-body tabular-nums">
                  <AnimatedNumber
                    value={w.data.task_ids}
                    format={(n) => Math.round(n).toLocaleString()}
                  />
                </dd>
              </div>
              {w.data.sbq > 0 && (
                <div className="flex gap-1.5">
                  <dt className="text-faint">SBQ</dt>
                  <dd className="numeric font-semibold text-warn tabular-nums">
                    <AnimatedNumber
                      value={w.data.sbq}
                      format={(n) => Math.round(n).toLocaleString()}
                    />
                  </dd>
                </div>
              )}
              <div className="flex gap-1.5">
                <dt className="text-faint">Hours</dt>
                <dd className="numeric font-semibold text-body tabular-nums">
                  <AnimatedNumber value={w.data.hours} format={(n) => n.toFixed(2)} />
                </dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
    </Card>
  )
}

/**
 * When the next shift becomes available, phrased for someone reading it now.
 *
 * "12:00 PM" alone is ambiguous at 3 AM — is that in nine hours, or was it
 * yesterday? Saying which day removes the guess.
 */
function formatNextOpen(iso: string): string {
  const at = new Date(iso)
  const time = at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  const today = new Date()
  const sameDay = at.toDateString() === today.toDateString()

  return sameDay ? `${time} today` : `${time} tomorrow`
}

/**
 * How old the data on screen is.
 *
 * "0m ago" is what a plain elapsed formatter produces for the first minute
 * after a refresh, which reads as a fault rather than as freshness — so the
 * first minute gets words instead of a number.
 */
function freshness(updatedAt: number): string {
  const minutes = Math.floor((Date.now() - updatedAt) / 60_000)

  if (minutes < 1) return 'Just updated'
  if (minutes < 60) return `Updated ${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  return `Updated ${hours}h ${minutes % 60}m ago`
}

/**
 * The greeting, from the actual clock.
 *
 * It was the string "Good evening", which is right for the four hours a shift
 * starts in and wrong for every other hour of the day — including 9 AM, when
 * somebody who worked through checks what they filed.
 *
 * The night hours keep the evening greeting rather than switching to "Good
 * morning" at midnight. A tasker three hours into a shift that began at 10 PM
 * has not started a new day, and greeting them with a new one reads as the
 * system having lost track of which shift they are on — the exact confusion
 * the business date exists to prevent.
 */
function greetingFor(now: Date): string {
  const hour = now.getHours()

  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'

  // 17:00 through 04:59 — the evening, and the shift that runs out of it.
  return 'Good evening'
}

// ---------------------------------------------------------------- Hero band

/**
 * Tonight's shift, at the top of the tasker's own page.
 *
 * Same treatment as the admin hero, for the same reason: the running clock is
 * the only time-critical thing here, and it should not have to compete with
 * three identical cards. The elapsed figure is the headline because "how long
 * have I been on?" is the question a tasker opens this page to answer.
 */
function TonightHero({
  name,
  state,
  shift,
  updatedAt,
  refreshing,
  onRefresh,
}: {
  name: string
  state: DailyState
  shift: { start: string; end: string }
  updatedAt: number
  refreshing: boolean
  onRefresh: () => void
}) {
  const attendance = state.attendance
  const open = attendance?.is_open ?? false

  /*
   * Ticks regardless of whether the shift is open.
   *
   * The elapsed figure only needs this while the clock is running, but the
   * greeting is derived from the wall clock and so goes wrong on any page left
   * open across a boundary -- which on a night shift is every page, since the
   * shift itself crosses one.
   */
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(timer)
  }, [])

  const headline = open
    ? elapsedSince(attendance?.time_in)
    : attendance?.total_hours != null
      ? formatHours(attendance.total_hours, '')
      : '—'

  return (
    <section
      aria-label="Tonight’s shift"
      className="hero-panel rise-in relative overflow-hidden rounded-2xl border border-line shadow-raised"
    >
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            {open ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-raised/70 px-2.5 py-1 text-[13px] font-bold tracking-[0.12em] text-body uppercase backdrop-blur">
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
                </span>
                On shift
              </span>
            ) : (
              attendance && (
                <AttendanceBadge status={attendance.status} label={attendance.status_label} />
              )
            )}
            <span className="text-[13px] text-muted">
              Shift of {formatDate(state.business_date)} · {shift.start} – {shift.end}
            </span>

            {/* This page does not poll and does not refetch when you come back
                to the tab, so it says how old it is and offers to update. A
                screen that silently never refreshes, with nothing on it to say
                so, is the version of this that costs somebody a shift. */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-line bg-raised/60 px-2.5 py-1',
                'text-[12px] font-medium text-muted backdrop-blur transition-colors',
                'hover:border-brand/40 hover:text-body disabled:opacity-60',
              )}
              title="Refresh tonight’s shift"
            >
              <Icon
                name="history"
                size={13}
                className={cn('shrink-0', refreshing && 'animate-spin')}
              />
              {refreshing ? 'Updating…' : freshness(updatedAt)}
            </button>
          </div>

          <h1 className="mt-3.5 text-xl font-semibold tracking-tight text-body">
            {greetingFor(new Date())}, {name}
          </h1>

          <div className="mt-3 flex items-end gap-2.5">
            <p className="numeric text-[52px] leading-[0.85] font-semibold tracking-tight text-brand tabular-nums">
              {headline}
            </p>
          </div>
          <p className="mt-2.5 text-[15px] text-muted">
            {open ? 'elapsed since you timed in' : attendance ? 'clocked tonight' : 'not timed in yet'}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-1 lg:gap-y-3.5">
          <div>
            <dt className="text-[13px] font-semibold tracking-[0.1em] text-faint uppercase">
              Time in
            </dt>
            <dd className="numeric mt-1 text-base font-semibold text-body tabular-nums">
              {attendance?.time_in ? formatTime(attendance.time_in) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] font-semibold tracking-[0.1em] text-faint uppercase">
              Time out
            </dt>
            <dd className="numeric mt-1 text-base font-semibold text-body tabular-nums">
              {attendance?.time_out
                ? formatShiftTime(attendance.time_out, attendance.attendance_date)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] font-semibold tracking-[0.1em] text-faint uppercase">
              Committed
            </dt>
            <dd className="numeric mt-1 text-base font-semibold text-body tabular-nums">
              {attendance?.expected_hours != null ? `${attendance.expected_hours}h` : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="border-t border-line/70 px-5 py-4 sm:px-6">
        <ShiftTimeline start={state.scheduled_start} end={state.scheduled_end} />
      </div>
    </section>
  )
}

// ------------------------------------------------------------ Step 1: activate

function ActivationStep({
  state,
  workstations,
  workstationsLoading,
  brackets,
  taskingStatuses,
  pcStatuses,
  onSaved,
}: {
  state: DailyState
  workstations: WorkstationOption[]
  workstationsLoading: boolean
  brackets: { value: CommitmentBracket; label: string }[]
  taskingStatuses: Record<string, { value: string; label: string }[]>
  pcStatuses: { value: PcStatus; label: string }[]
  onSaved: () => void
}) {
  const existing = state.attendance

  const [bracket, setBracket] = useState<CommitmentBracket | ''>(
    (existing?.commitment_bracket as CommitmentBracket) ?? '',
  )
  // Prefilled from what was already filed, so coming back to fix a mis-picked
  // PC shows the current answers rather than an empty form.
  const [statuses, setStatuses] = useState<string[]>(
    existing?.tasking_statuses?.map((s) => s.value) ?? [],
  )
  const [workstationId, setWorkstationId] = useState<string>(
    existing?.workstation_id ? String(existing.workstation_id) : '',
  )
  const [pcStatus, setPcStatus] = useState<PcStatus>('used')
  const [pcView, setPcView] = useState<'map' | 'list'>('map')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedPc = workstations.find((pc) => String(pc.id) === workstationId)

  // A support-filed absence has no PC and starts no clock.
  const isWorking = bracket !== '' && !bracket.includes('support_entry')

  // Split so the two kinds can be presented as the different things they are,
  // rather than as six interchangeable rows.
  const workingBrackets = brackets.filter((b) => !b.value.includes('support_entry'))
  const supportBrackets = brackets.filter((b) => b.value.includes('support_entry'))

  const save = useMutation({
    mutationFn: () =>
      dailyApi.activate({
        commitment_bracket: bracket,
        tasking_statuses: statuses,
        workstation_id: isWorking && workstationId ? Number(workstationId) : null,
        pc_status: isWorking ? pcStatus : null,
      }),
    onSuccess: ({ message }) => {
      toast.success(message)
      onSaved()
    },
    onError: (error: ApiError) => {
      if (error.isValidation) {
        setErrors(Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v[0]])))
        toast.error('Please correct the highlighted fields.')
        return
      }
      toast.error(error.message)
    },
  })

  const toggleStatus = (value: string) => {
    setStatuses((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    )
  }

  const ready = bracket !== '' && statuses.length > 0 && (!isWorking || workstationId !== '')

  return (
    <StepPanel
      index={1}
      total={3}
      icon="desktop"
      title="Attendance & PC"
      purpose={
        existing?.time_in
          ? 'Your shift has already started. You can correct any of these — your original time in is kept.'
          : 'Three quick answers. The last one claims your PC and starts your clock on server time.'
      }
      footer={
        <>
          {/* The consequence, restated next to the button that causes it.
              A tasker reading only the button label should still not be able
              to start their shift by accident. */}
          <p className="text-[13px] leading-snug text-muted">
            {!ready
              ? 'Answer all three to continue.'
              : existing?.time_in
                ? 'Saves your changes. Your time in does not move.'
                : isWorking
                  ? 'This claims your PC and times you in now.'
                  : 'Files a support entry. No clock is started.'}
          </p>
          <Button
            variant="primary"
            size="lg"
            loading={save.isPending}
            disabled={!ready}
            onClick={() => save.mutate()}
          >
            {existing?.time_in
              ? 'Update attendance'
              : isWorking
                ? 'File attendance & time in'
                : 'File attendance'}
          </Button>
        </>
      }
    >
      <SubStep
        index={1}
        done={bracket !== ''}
        title="How many hours can we expect from you tonight?"
        description="Pick one. The support entries at the bottom record why you are not tasking, and never start a shift."
      >
        <div className="space-y-4">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {workingBrackets.map((option) => (
              <ChoiceTile
                key={option.value}
                name="commitment"
                value={option.value}
                checked={bracket === option.value}
                onChange={() => setBracket(option.value)}
                title={option.label}
              />
            ))}
          </div>

          {supportBrackets.length > 0 && (
            <div>
              {/* A labelled break rather than three more identical rows. These
                  three do something categorically different -- no PC, no
                  clock -- and the old flat list gave no hint of that until you
                  had already picked one. */}
              <div className="mb-2.5 flex items-center gap-3">
                <span className="text-xs font-bold tracking-[0.12em] text-faint uppercase">
                  Not tasking tonight
                </span>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {supportBrackets.map((option) => (
                  <ChoiceTile
                    key={option.value}
                    name="commitment"
                    value={option.value}
                    checked={bracket === option.value}
                    onChange={() => setBracket(option.value)}
                    title={option.label}
                    subdued
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {errors.commitment_bracket && (
          <p role="alert" className="mt-3 text-[13px] text-bad">
            {errors.commitment_bracket}
          </p>
        )}
      </SubStep>

      <SubStep
        index={2}
        done={statuses.length > 0}
        title="What is your tasking status?"
        description="Tap every one that applies. Filing a status even on a blocked or empty-queue night is what keeps your attendance complete."
      >
        <div className="space-y-4">
          {Object.entries(taskingStatuses).map(([group, items]) => (
            <fieldset key={group}>
              <legend className="mb-2 text-xs font-bold tracking-[0.12em] text-faint uppercase">
                {group}
              </legend>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <Chip
                    key={item.value}
                    checked={statuses.includes(item.value)}
                    onChange={() => toggleStatus(item.value)}
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>
            </fieldset>
          ))}

          {statuses.length > 0 && (
            <p className="numeric text-[13px] text-muted tabular-nums">
              {statuses.length} selected
            </p>
          )}

          {errors.tasking_statuses && (
            <p role="alert" className="text-[13px] text-bad">
              {errors.tasking_statuses}
            </p>
          )}
        </div>
      </SubStep>

      {isWorking ? (
        <SubStep
          index={3}
          done={workstationId !== ''}
          title="Which PC are you on?"
          description={
            existing?.time_in
              ? 'Picked the wrong desk? Change it here — your original time in is kept.'
              : 'Pick the exact machine you are sitting at. Saving this times you in on the server clock.'
          }
        >
          <div className="space-y-4">
            {/* The map is the default because identifying your own desk is a
                spatial question. The list stays one tap away for anyone who
                already knows their PC number and just wants to type it. */}
            <div className="flex items-center justify-between gap-3">
              <Segmented
                ariaLabel="PC picker view"
                value={pcView}
                options={[
                  { value: 'map', label: 'Floor plan' },
                  { value: 'list', label: 'List' },
                ]}
                onChange={setPcView}
              />
              {selectedPc && (
                <p className="truncate text-[13px] text-muted">
                  Selected <strong className="text-body">{selectedPc.name}</strong>
                </p>
              )}
            </div>

            {workstationsLoading ? (
              <div className="skeleton h-64 rounded-xl" />
            ) : pcView === 'map' ? (
              <FloorPlanPicker
                workstations={workstations}
                value={workstationId}
                onChange={setWorkstationId}
                currentId={existing?.workstation_id ?? null}
              />
            ) : (
              <WorkstationPicker
                workstations={workstations}
                value={workstationId}
                onChange={setWorkstationId}
                loading={false}
                invalid={Boolean(errors.workstation_id)}
                currentName={existing?.workstation_name}
              />
            )}

            {errors.workstation_id && (
              <p role="alert" className="text-[13px] text-bad">
                {errors.workstation_id}
              </p>
            )}

            <Field label="PC status" error={errors.pc_status} className="max-w-xs">
              {(id) => (
                <Select
                  id={id}
                  value={pcStatus}
                  onChange={(event) => setPcStatus(event.target.value as PcStatus)}
                >
                  {pcStatuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </SubStep>
      ) : (
        bracket !== '' && (
          // The third question genuinely does not apply to a support entry.
          // Saying so is better than silently rendering two steps where the
          // stepper promised three.
          <div className="rounded-2xl border border-line bg-sunken/60 px-5 py-4">
            <p className="text-[15px] font-medium text-body">No PC needed for this entry</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Support entries record why you are not tasking tonight, so there is no machine to
              claim and no clock to start.
            </p>
          </div>
        )
      )}
    </StepPanel>
  )
}

// -------------------------------------------------------------- Step 3: time out

function TimeOutStep({
  state,
  onTimeOut,
  pending,
}: {
  state: DailyState
  onTimeOut: () => void
  pending: boolean
}) {
  // ---- Terminal state: the night is filed and there is nothing left to do.
  if (state.steps.clocked_out) {
    const tracker = state.tracker

    return (
      <StepPanel
        index={3}
        total={3}
        icon="check"
        title="Shift complete"
        purpose={`Your night is filed. Nothing further is needed — this is what was recorded. Your next shift opens at ${formatNextOpen(state.next_shift_opens_at)}.`}
      >
        <Card>
          <CardBody className="space-y-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
                <Icon name="check" size={24} />
              </span>
              <div className="min-w-0">
                <p className="numeric text-[32px] leading-none font-semibold tracking-tight text-body tabular-nums">
                  <AnimatedNumber
                    value={state.attendance?.total_hours}
                    format={(n) => n.toFixed(2)}
                  />
                </p>
                <p className="mt-1.5 text-[15px] text-muted">
                  hours clocked
                  {tracker?.declared_hours != null && (
                    <> · {formatHours(tracker.declared_hours, '')} declared productive</>
                  )}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Time in', value: formatTime(state.attendance?.time_in) },
                {
                  label: 'Time out',
                  value: state.attendance?.time_out
                    ? formatShiftTime(state.attendance.time_out, state.attendance.attendance_date)
                    : '—',
                },
                { label: 'Tasks', value: String(tracker?.total_tasks ?? 0) },
                { label: 'Task IDs', value: String(tracker?.task_id_count ?? 0) },
              ].map((row) => (
                <div key={row.label} className="rounded-lg bg-sunken px-3 py-2.5">
                  <dt className="text-[13px] text-muted">{row.label}</dt>
                  <dd className="numeric mt-0.5 text-[15px] font-semibold text-body tabular-nums">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            {tracker && (
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">{tracker.total_tasks ?? 0} tasks</Badge>
                <Badge tone="neutral">{tracker.task_id_count} task IDs</Badge>
                {tracker.sbq_count > 0 && <Badge tone="warn">{tracker.sbq_count} SBQ</Badge>}
              </div>
            )}
          </CardBody>
        </Card>
      </StepPanel>
    )
  }

  // ---- Blocked: no clock was ever started, so there is nothing to stop.
  if (!state.can_time_out) {
    return (
      <StepPanel
        index={3}
        total={3}
        icon="clock"
        title="Time out"
        purpose="This stops your clock. It only becomes available once a shift has actually started."
      >
        <Card>
          <CardBody className="py-10 text-center">
            <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-sunken text-faint">
              <Icon name="clock" size={24} />
            </span>
            <p className="text-[15px] font-medium text-body">Nothing to time out from</p>
            <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-muted">
              {state.steps.activation
                ? 'You filed a support entry tonight, which does not start a clock — so there is nothing to stop.'
                : 'File your attendance and claim a PC first. That is what starts the clock.'}
            </p>
          </CardBody>
        </Card>
      </StepPanel>
    )
  }

  // ---- Live: the clock is running.
  const committed = state.attendance?.expected_hours ?? 0
  const worked = elapsedHours(state.attendance?.time_in)
  const progress = committed > 0 ? worked / committed : 0
  const met = progress >= 1

  const remainingHours = Math.max(0, committed - worked)
  const remaining =
    remainingHours >= 1
      ? `${Math.floor(remainingHours)}h ${Math.round((remainingHours % 1) * 60)}m`
      : `${Math.round(remainingHours * 60)}m`

  return (
    <StepPanel
      index={3}
      total={3}
      icon="clock"
      title="Time out"
      purpose="This records the current server time, whenever that is. Your hours are worked out from it automatically — you never type them."
      footer={
        <>
          <p className="text-[13px] leading-snug text-muted">
            {state.steps.tracker
              ? 'Your tracker entry is filed. This ends your night.'
              : 'You have not filed a tracker entry yet — you can still do that after timing out.'}
          </p>
          <Button variant="danger" size="lg" loading={pending} onClick={onTimeOut}>
            Time out now
          </Button>
        </>
      }
    >
      <section className="hero-panel relative overflow-hidden rounded-2xl border border-line shadow-raised">
        <div className="flex flex-col items-center gap-7 p-7 sm:flex-row sm:justify-center sm:gap-10">
          {/* The ring turns "how long have I been on" into "how close am I to
              what I committed to", which is the question actually being asked
              at the moment someone considers timing out. */}
          <Ring
            value={progress}
            size={168}
            thickness={13}
            tone={met ? 'ok' : 'brand'}
            label={`${Math.round(progress * 100)} percent of committed hours`}
          >
            <span className="numeric text-[34px] leading-none font-semibold tracking-tight text-body tabular-nums">
              {elapsedSince(state.attendance?.time_in)}
            </span>
            <span className="mt-1.5 text-[12px] font-bold tracking-[0.1em] text-faint uppercase">
              elapsed
            </span>
          </Ring>

          <div className="min-w-0 text-center sm:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-raised/70 px-3 py-1 text-[13px] font-bold tracking-[0.12em] text-body uppercase backdrop-blur">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
              </span>
              Clock running
            </span>

            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Timed in at{' '}
              <strong className="numeric text-body tabular-nums">
                {formatTime(state.attendance?.time_in)}
              </strong>
              {committed > 0 && (
                <>
                  <br />
                  Committed to{' '}
                  <strong className="numeric text-body tabular-nums">{committed} hours</strong>
                  {met ? ' — already met.' : ` — ${remaining} to go.`}
                </>
              )}
            </p>

            {committed > 0 && (
              <p
                className={cn(
                  'mt-3 inline-block rounded-full px-3 py-1 text-[13px] font-semibold',
                  met ? 'bg-ok-soft text-ok' : 'bg-brand-soft text-brand',
                )}
              >
                {Math.round(progress * 100)}% of your commitment
              </p>
            )}
          </div>
        </div>
      </section>
    </StepPanel>
  )
}
