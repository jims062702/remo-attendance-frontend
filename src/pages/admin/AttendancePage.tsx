import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi, metaApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Card, CardBody, CardHeader, PageHeader, StatCard, StatGrid } from '@/components/ui/Card'
import { AttendanceBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { DateRange, Field, Input, Select, Textarea } from '@/components/ui/Field'
import {
  EmptyState,
  ErrorState,
  PaginationBar,
  TBody,
  TableSkeleton,
  TableWrap,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/ui/Table'
import {
  daysAgoISO,
  formatDate,
  formatHours,
  formatMinutesLate,
  formatShiftTime,
  formatTime,
  formatVariance,
  todayISO,
} from '@/utils/format'
import type { Attendance, AttendanceStatus } from '@/types'

export default function AdminAttendancePage() {
  const queryClient = useQueryClient()

  const [from, setFrom] = useState(daysAgoISO(29))
  const [to, setTo] = useState(todayISO())
  const [status, setStatus] = useState<AttendanceStatus | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('attendance_date')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const [correcting, setCorrecting] = useState<Attendance | null>(null)
  const [deleting, setDeleting] = useState<Attendance | null>(null)

  /*
   * Deleting is separate from correcting on purpose.
   *
   * A correction changes what a night says; a delete says the night never
   * happened. The API refuses while a submission is attached, so the error
   * that matters here is a 409 with a message naming what is in the way --
   * shown as-is, because it already says what to do about it.
   */
  const remove = useMutation({
    mutationFn: (record: Attendance) => adminApi.deleteAttendance(record.id),
    onSuccess: (message) => {
      toast.success(message)
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'attendance'] })
    },
    onError: (error) => toast.error((error as ApiError).message),
  })
  const [exporting, setExporting] = useState(false)

  const filters = { from, to, status, search, sort, direction }

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: metaApi.options,
    staleTime: Infinity,
  })

  const attendance = useQuery({
    queryKey: ['admin', 'attendance', filters, page],
    queryFn: () => adminApi.attendance({ ...filters, page, per_page: 20 }),
  })

  const toggleSort = (key: string) => {
    if (sort === key) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(key)
      setDirection('desc')
    }
    setPage(1)
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      await adminApi.exportReport('attendance', filters)
      toast.success('Export downloaded.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  const totals = attendance.data?.meta.totals

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Attendance"
        description="Every shift record. Times are shown against the shift they belong to."
        action={
          <Button variant="primary" loading={exporting} onClick={() => void exportExcel()}>
            Export Excel
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 p-4">
          <DateRange
            from={from}
            to={to}
            onFromChange={(value) => {
              setFrom(value)
              setPage(1)
            }}
            onToChange={(value) => {
              setTo(value)
              setPage(1)
            }}
          />

          <Field label="Status" className="w-44">
            {(id) => (
              <Select
                id={id}
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as AttendanceStatus | '')
                  setPage(1)
                }}
              >
                <option value="">All statuses</option>
                {meta?.attendance_statuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Search" className="min-w-48 flex-1">
            {(id) => (
              <Input
                id={id}
                type="search"
                placeholder="Name or email"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
            )}
          </Field>
        </CardBody>
      </Card>

      {totals && (
        <StatGrid ready={!attendance.isLoading} columns={6}>
          <StatCard
            label="Records"
            icon="clipboard"
            value={totals.records}
            format={(n) => Math.round(n).toLocaleString()}
          />
          <StatCard
            label="Taskers"
            icon="users"
            value={totals.taskers}
            format={(n) => Math.round(n).toLocaleString()}
          />
          <StatCard
            label="Total hours"
            icon="clock"
            tone="brand"
            value={totals.total_hours}
            format={(n) => n.toFixed(2)}
            hint={
              totals.average_hours !== null
                ? `${totals.average_hours.toFixed(2)} average per shift`
                : undefined
            }
          />
          <StatCard
            label="Late"
            icon="history"
            value={totals.late}
            format={(n) => Math.round(n).toLocaleString()}
            tone={totals.late > 0 ? 'warn' : 'ok'}
            progress={totals.records > 0 ? totals.late / totals.records : 0}
          />
          {/* Absence had no tile at all, so this screen could say how many
              people were late but not how many never arrived. The share is
              measured against records rather than taskers: an absence is one
              filed night, and the denominator has to be the same unit. */}
          <StatCard
            label="Absent"
            icon="lock"
            value={totals.absent}
            format={(n) => Math.round(n).toLocaleString()}
            tone={totals.absent > 0 ? 'bad' : 'ok'}
            progress={totals.records > 0 ? totals.absent / totals.records : 0}
            hint={totals.on_leave > 0 ? `${totals.on_leave} on leave` : undefined}
          />
          <StatCard
            label="Missing time out"
            icon="close"
            value={totals.missing_time_out}
            format={(n) => Math.round(n).toLocaleString()}
            tone={totals.missing_time_out > 0 ? 'bad' : 'ok'}
            hint="Needs correcting"
          />
        </StatGrid>
      )}

      <Card>
        <CardHeader
          title="Shift records"
          description="A time out on the following morning is marked (+1d)."
        />

        {attendance.isLoading ? (
          <TableSkeleton rows={10} cols={8} />
        ) : attendance.isError ? (
          <ErrorState
            description={(attendance.error as ApiError)?.message}
            onRetry={() => void attendance.refetch()}
          />
        ) : attendance.data?.data.length === 0 ? (
          <EmptyState title="No records match these filters" description="Try widening the date range." />
        ) : (
          <>
            <TableWrap>
              <THead>
                <Th sortKey="attendance_date" activeSort={sort} direction={direction} onSort={toggleSort}>
                  Shift date
                </Th>
                <Th>Tasker</Th>
                <Th sortKey="time_in" activeSort={sort} direction={direction} onSort={toggleSort}>
                  Time in
                </Th>
                <Th sortKey="time_out" activeSort={sort} direction={direction} onSort={toggleSort}>
                  Time out
                </Th>
                <Th sortKey="total_hours" activeSort={sort} direction={direction} onSort={toggleSort}>
                  Hours
                </Th>
                <Th>Committed</Th>
                <Th>Variance</Th>
                <Th sortKey="status" activeSort={sort} direction={direction} onSort={toggleSort}>
                  Status
                </Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {attendance.data?.data.map((record) => (
                  <Tr key={record.id}>
                    <Td className="whitespace-nowrap">{formatDate(record.attendance_date)}</Td>
                    <Td>
                      <p className="font-medium text-body">{record.user?.name ?? '—'}</p>
                      <p className="text-xs text-muted">{record.user?.email}</p>
                    </Td>
                    <Td numeric>
                      {record.time_in ? formatTime(record.time_in) : '—'}
                      {record.time_in && (record.minutes_late ?? 0) > 0 && (
                        <span className="ml-1.5 text-xs text-warn">
                          {formatMinutesLate(record.minutes_late)}
                        </span>
                      )}
                    </Td>
                    <Td numeric>
                      {record.time_out
                        ? formatShiftTime(record.time_out, record.attendance_date)
                        : record.time_in
                          ? <span className="text-xs text-warn">Not recorded</span>
                          : '—'}
                    </Td>
                    <Td numeric>
                      {formatHours(record.total_hours, '')}
                    </Td>
                    <Td numeric className="text-muted">
                      {formatHours(record.expected_hours, '')}
                    </Td>
                    <Td
                     
                      numeric
                      className={
                        record.variance === null
                          ? 'text-muted'
                          : record.variance < 0
                            ? 'text-warn'
                            : 'text-ok'
                      }
                    >
                      {formatVariance(record.variance)}
                    </Td>
                    <Td>
                      <AttendanceBadge status={record.status} label={record.status_label} />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Icon name="clipboard" size={14} />}
                          onClick={() => setCorrecting(record)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Icon name="trash" size={14} />}
                          aria-label={`Delete the shift of ${formatDate(record.attendance_date)}`}
                          onClick={() => setDeleting(record)}
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrap>
            <PaginationBar pagination={attendance.data?.meta.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete the shift of ${deleting ? formatDate(deleting.attendance_date) : ''}?`}
        description={
          `This removes ${deleting?.user?.name ?? 'the tasker'}'s record for that night entirely — ` +
          'the clock, the PC and the hours. It cannot be undone, and it frees the night so they ' +
          'can file it again.'
        }
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />

      <CorrectionModal
        record={correcting}
        statuses={meta?.attendance_statuses ?? []}
        onClose={() => setCorrecting(null)}
        onSaved={() => {
          setCorrecting(null)
          void queryClient.invalidateQueries({ queryKey: ['admin'] })
        }}
      />
    </div>
  )
}

// ----------------------------------------------------------- Correction modal

/** Turn an ISO string into the value a datetime-local input expects. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function CorrectionModal({
  record,
  statuses,
  onClose,
  onSaved,
}: {
  record: Attendance | null
  statuses: { value: AttendanceStatus; label: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [timeIn, setTimeIn] = useState('')
  const [timeOut, setTimeOut] = useState('')
  const [status, setStatus] = useState<AttendanceStatus | ''>('')
  const [expected, setExpected] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset the form whenever a different record is opened.
  const recordId = record?.id ?? null
  const [loadedFor, setLoadedFor] = useState<number | null>(null)

  if (record && loadedFor !== recordId) {
    setLoadedFor(recordId)
    setTimeIn(toLocalInput(record.time_in))
    setTimeOut(toLocalInput(record.time_out))
    setStatus(record.status)
    setExpected(record.expected_hours !== null ? String(record.expected_hours) : '')
    setReason('')
    setErrors({})
  }

  const save = useMutation({
    mutationFn: () =>
      adminApi.correctAttendance(record!.id, {
        time_in: timeIn ? new Date(timeIn).toISOString() : null,
        time_out: timeOut ? new Date(timeOut).toISOString() : null,
        status,
        expected_hours: expected === '' ? null : Number(expected),
        reason,
      }),
    onSuccess: ({ message }) => {
      toast.success(message)
      onSaved()
    },
    onError: (error: ApiError) => {
      if (error.isValidation) {
        setErrors(
          Object.fromEntries(Object.entries(error.errors).map(([key, value]) => [key, value[0]])),
        )
        toast.error('Please correct the highlighted fields.')
        return
      }
      toast.error(error.message)
    },
  })

  if (!record) return null

  return (
    <Modal
      open={record !== null}
      onClose={onClose}
      title="Edit attendance"
      description={`${record.user?.name ?? 'Tasker'} · shift of ${formatDate(record.attendance_date)}`}
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-info-soft px-3 py-2 text-xs text-info">
          Hours are recalculated from these times on the server — you cannot set them directly. A
          correction is recorded in the activity log with your name and reason.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Time in"
            hint="This shift started on the evening of the shift date."
            error={errors.time_in}
          >
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                value={timeIn}
                invalid={Boolean(errors.time_in)}
                onChange={(event) => setTimeIn(event.target.value)}
              />
            )}
          </Field>

          <Field
            label="Time out"
            hint="Usually the following morning for this shift."
            error={errors.time_out}
          >
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                value={timeOut}
                invalid={Boolean(errors.time_out)}
                onChange={(event) => setTimeOut(event.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" error={errors.status}>
            {(id) => (
              <Select
                id={id}
                value={status}
                onChange={(event) => setStatus(event.target.value as AttendanceStatus)}
              >
                {statuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Committed hours" error={errors.expected_hours}>
            {(id) => (
              <Input
                id={id}
                type="number"
                step="0.5"
                min="0.5"
                max="16"
                value={expected}
                invalid={Boolean(errors.expected_hours)}
                onChange={(event) => setExpected(event.target.value)}
              />
            )}
          </Field>
        </div>

        <Field
          label="Reason for this change"
          required
          hint="Recorded in the audit log so the change can be explained later."
          error={errors.reason}
        >
          {(id) => (
            <Textarea
              id={id}
              placeholder="e.g. Tasker forgot to time out; confirmed 6:00 AM finish with supervisor."
              value={reason}
              invalid={Boolean(errors.reason)}
              onChange={(event) => setReason(event.target.value)}
            />
          )}
        </Field>
      </div>
    </Modal>
  )
}
