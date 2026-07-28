import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi, metaApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, PageHeader, StatCard, StatGrid } from '@/components/ui/Card'
import { Badge, UserStatusBadge } from '@/components/ui/StatusBadge'
import { AbsenceRiskBadge } from '@/components/ui/AbsenceWarning'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Field'
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
import { formatDate } from '@/utils/format'
import type { User, UserRole, UserStatus } from '@/types'

export default function AdminTaskersPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [atRiskOnly, setAtRiskOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<User | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deactivating, setDeactivating] = useState<User | null>(null)

  const filters = { search, status, include_deleted: includeDeleted }

  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: metaApi.options, staleTime: Infinity })

  const taskers = useQuery({
    queryKey: ['admin', 'taskers', filters, page],
    queryFn: () => adminApi.taskers({ ...filters, page, per_page: 20 }),
  })

  /*
   * The roster-wide counts, read separately from the page being browsed.
   *
   * "How many people have never signed in" is a question about the roster, not
   * about the twenty rows currently rendered, so it cannot be computed from
   * them. A roster is small enough that one wide read is cheaper than adding an
   * aggregate endpoint for four numbers.
   */
  const roster = useQuery({
    queryKey: ['admin', 'taskers', 'roster', filters],
    queryFn: () => adminApi.taskers({ ...filters, page: 1, per_page: 200 }),
  })

  const people = roster.data?.data ?? []
  const counts = people.reduce(
    (acc, person) => ({
      active: acc.active + (person.status === 'active' ? 1 : 0),
      pending: acc.pending + (person.has_signed_in ? 0 : 1),
      admins: acc.admins + (person.role === 'admin' ? 1 : 0),
      atRisk: acc.atRisk + (person.absence_risk?.at_risk ? 1 : 0),
    }),
    { active: 0, pending: 0, admins: 0, atRisk: 0 },
  )

  const totalPeople = taskers.data?.meta.pagination.total
  const whole = (n: number) => Math.round(n).toLocaleString()

  // The rule travels with the response rather than being hardcoded here, since
  // both numbers are server-configurable.
  const rule = taskers.data?.meta.absence_rule

  /*
   * The at-risk filter is applied client-side, on purpose.
   *
   * Filtering server-side would mean a query that computes the rolling count
   * for every user before paginating -- the one shape this feature was built
   * to avoid. The roster read already has the whole list with its counts
   * attached, so narrowing it here costs nothing and cannot degrade as the
   * roster grows in the way a per-row subquery would.
   */
  const visibleRows = (taskers.data?.data ?? []).filter(
    (user) => !atRiskOnly || user.absence_risk?.at_risk,
  )

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'taskers'] })

  const deactivate = useMutation({
    mutationFn: (id: number) => adminApi.deactivateTasker(id),
    onSuccess: (message) => {
      toast.success(message)
      setDeactivating(null)
      invalidate()
    },
    onError: (error: ApiError) => toast.error(error.message),
  })

  const reactivate = useMutation({
    mutationFn: (id: number) => adminApi.reactivateTasker(id),
    onSuccess: ({ message }) => {
      toast.success(message)
      invalidate()
    },
    onError: (error: ApiError) => toast.error(error.message),
  })

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Taskers"
        description="Authorise a Google address and that person can sign in. No passwords are issued."
        action={
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Add tasker
          </Button>
        }
      />

      <StatGrid ready={!roster.isLoading} columns={5}>
        <StatCard label="On the roster" icon="users" value={totalPeople} format={whole} />
        <StatCard
          label="Active"
          icon="check"
          tone="ok"
          value={counts.active}
          format={whole}
          progress={people.length > 0 ? counts.active / people.length : 0}
        />
        <StatCard
          label="Never signed in"
          icon="history"
          value={counts.pending}
          format={whole}
          tone={counts.pending > 0 ? 'warn' : 'ok'}
          hint="Authorised but not yet claimed"
        />
        <StatCard label="Administrators" icon="dashboard" tone="brand" value={counts.admins} format={whole} />
        <StatCard
          label="At risk"
          icon="close"
          value={counts.atRisk}
          format={whole}
          tone={counts.atRisk > 0 ? 'bad' : 'ok'}
          hint={
            rule ? `${rule.threshold}+ absences in ${rule.window_days} days` : 'Repeated absences'
          }
        />
      </StatGrid>

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 p-4">
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

          <Field label="Status" className="w-44">
            {(id) => (
              <Select
                id={id}
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as UserStatus | '')
                  setPage(1)
                }}
              >
                <option value="">All statuses</option>
                {meta?.user_statuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <label className="flex items-center gap-2 pb-2.5 text-sm text-body">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(event) => {
                setIncludeDeleted(event.target.checked)
                setPage(1)
              }}
              className="h-4 w-4 rounded border-line accent-[var(--brand)]"
            />
            Show deactivated
          </label>

          <label className="flex items-center gap-2 pb-2.5 text-sm text-body">
            <input
              type="checkbox"
              checked={atRiskOnly}
              onChange={(event) => setAtRiskOnly(event.target.checked)}
              className="h-4 w-4 rounded border-line accent-[var(--bad)]"
            />
            At risk only
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Accounts" description="Everyone authorised to use the system" />

        {taskers.isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : taskers.isError ? (
          <ErrorState
            description={(taskers.error as ApiError)?.message}
            onRetry={() => void taskers.refetch()}
          />
        ) : visibleRows.length === 0 ? (
          <EmptyState
            title={atRiskOnly ? 'Nobody on this page is at risk' : 'No accounts match'}
            description={
              atRiskOnly
                ? 'Clear the “At risk only” filter to see the rest of the roster.'
                : 'Try a different search, or add a tasker.'
            }
          />
        ) : (
          <>
            <TableWrap>
              <THead>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Attendance</Th>
                <Th>Sign-in</Th>
                <Th>Added</Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {visibleRows.map((user) => (
                  <Tr key={user.id}>
                    <Td>
                      <Link
                        to={`/admin/taskers/${user.id}`}
                        className="font-medium text-body hover:text-brand hover:underline"
                      >
                        {user.name}
                      </Link>
                    </Td>
                    <Td className="text-muted">{user.email}</Td>
                    <Td>
                      <Badge tone={user.role === 'admin' ? 'brand' : 'neutral'}>
                        {user.role_label}
                      </Badge>
                    </Td>
                    <Td>
                      {user.deleted_at ? (
                        <Badge tone="neutral">Deactivated</Badge>
                      ) : (
                        <UserStatusBadge status={user.status} label={user.status_label} />
                      )}
                    </Td>
                    <Td>
                      {/* Silent for anyone with nothing to flag. A column that
                          shows "0 absences" on every well-behaved tasker
                          trains an admin to stop reading it. */}
                      {user.absence_risk?.at_risk || user.absence_risk?.approaching ? (
                        <AbsenceRiskBadge risk={user.absence_risk} />
                      ) : (
                        <span className="text-xs text-faint">—</span>
                      )}
                    </Td>
                    <Td>
                      {/* Distinguishes "authorised but never used" from a live
                          account -- the state an admin most often needs to chase. */}
                      {user.has_signed_in ? (
                        <span className="text-xs text-muted">Google linked</span>
                      ) : (
                        <Badge tone="warn">Never signed in</Badge>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(user.created_at)}</Td>
                    <Td>
                      <div className="flex justify-center gap-0.5">
                        <Link
                          to={`/admin/taskers/${user.id}`}
                          className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-muted transition-colors hover:bg-sunken hover:text-body"
                        >
                          View
                        </Link>
                        {user.deleted_at ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={reactivate.isPending}
                            onClick={() => reactivate.mutate(user.id)}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(user)
                                setFormOpen(true)
                              }}
                            >
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeactivating(user)}>
                              Deactivate
                            </Button>
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrap>
            <PaginationBar pagination={taskers.data?.meta.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>

      <TaskerFormModal
        open={formOpen}
        user={editing}
        roles={meta?.user_roles ?? []}
        statuses={meta?.user_statuses ?? []}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false)
          invalidate()
        }}
      />

      <ConfirmDialog
        open={deactivating !== null}
        title={`Deactivate ${deactivating?.name}?`}
        description="They will no longer be able to sign in. All of their attendance and task history is kept, and you can reactivate them at any time."
        confirmLabel="Deactivate"
        loading={deactivate.isPending}
        onClose={() => setDeactivating(null)}
        onConfirm={() => deactivating && deactivate.mutate(deactivating.id)}
      />
    </div>
  )
}

// ---------------------------------------------------------------- Form modal

function TaskerFormModal({
  open,
  user,
  roles,
  statuses,
  onClose,
  onSaved,
}: {
  open: boolean
  user: User | null
  roles: { value: UserRole; label: string }[]
  statuses: { value: UserStatus; label: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = user !== null

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('tasker')
  const [status, setStatus] = useState<UserStatus>('active')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadedFor, setLoadedFor] = useState<number | null | undefined>(undefined)

  const key = user?.id ?? null
  if (open && loadedFor !== key) {
    setLoadedFor(key)
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setRole(user?.role ?? 'tasker')
    setStatus(user?.status ?? 'active')
    setErrors({})
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = { name, email, role, status }
      return isEdit ? adminApi.updateTasker(user.id, payload) : adminApi.createTasker(payload)
    },
    onSuccess: ({ message }) => {
      toast.success(message)
      setLoadedFor(undefined)
      onSaved()
    },
    onError: (error: ApiError) => {
      if (error.isValidation) {
        setErrors(
          Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v[0]])),
        )
        toast.error('Please correct the highlighted fields.')
        return
      }
      toast.error(error.message)
    },
  })

  const emailChanged = isEdit && email.toLowerCase() !== user.email.toLowerCase()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${user.name}` : 'Add a tasker'}
      description={
        isEdit
          ? 'Update this account.'
          : 'Authorise a Google address. They sign in with Google — there is no password to set or send.'
      }
      footer={
        <>
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
            {isEdit ? 'Save changes' : 'Add tasker'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Full name"
          required
          hint={isEdit ? undefined : 'Replaced by their Google profile name on first sign-in.'}
          error={errors.name}
        >
          {(id) => (
            <Input
              id={id}
              value={name}
              invalid={Boolean(errors.name)}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>

        <Field
          label="Google email address"
          required
          hint="Must match the Google account they will sign in with."
          error={errors.email}
        >
          {(id) => (
            <Input
              id={id}
              type="email"
              placeholder="name@company.com"
              value={email}
              invalid={Boolean(errors.email)}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </Field>

        {emailChanged && (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
            Changing the email unlinks the Google account currently attached. The new address will
            claim this record the next time it signs in.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" error={errors.role}>
            {(id) => (
              <Select id={id} value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                {roles.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Status" error={errors.status}>
            {(id) => (
              <Select
                id={id}
                value={status}
                onChange={(event) => setStatus(event.target.value as UserStatus)}
              >
                {statuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </div>
    </Modal>
  )
}
