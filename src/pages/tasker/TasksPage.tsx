import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { metaApi, taskApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, PageHeader, StatCard, StatGrid } from '@/components/ui/Card'
import { TaskBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
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
import { formatDate, formatNumber, orNA } from '@/utils/format'
import type { Task, TaskStatus } from '@/types'

/**
 * Validation mirrors the server's rules so a mistake is caught before a round
 * trip. The server revalidates everything regardless -- this is convenience,
 * never the enforcement point.
 */
const schema = z.object({
  task_name: z.string().min(1, 'What did you work on?').max(255),
  task_description: z.string().max(5000).optional().or(z.literal('')),
  output_count: z.coerce
    .number({ message: 'Enter a number' })
    .int('Whole numbers only')
    .min(0, 'Output cannot be negative')
    .max(1_000_000),
  task_status: z.enum(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']),
  external_task_id: z.string().max(100).optional().or(z.literal('')),
  // "N/A" and blank are both accepted; the server stores NULL either way.
  screenshot_link: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (value) =>
        !value ||
        value.trim() === '' ||
        /^n\/?a$/i.test(value.trim()) ||
        /^https?:\/\/.+/i.test(value.trim()),
      { message: 'Enter a full URL starting with http:// or https://, or leave blank' },
    ),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

type FormValues = z.input<typeof schema>

export default function TaskerTasksPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Task | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Task | null>(null)

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: metaApi.options,
    staleTime: Infinity,
  })

  const tasks = useQuery({
    queryKey: ['tasks', 'mine', page],
    queryFn: () => taskApi.list({ page, per_page: 15 }),
  })

  /*
   * A second, wider read purely for the headline figures.
   *
   * Summing the fifteen rows currently on screen would produce a total that
   * changes as you page, which is not a fact about anyone's work. The cap is
   * acknowledged in the tile hint when it actually bites.
   */
  const recent = useQuery({
    queryKey: ['tasks', 'mine', 'recent'],
    queryFn: () => taskApi.list({ page: 1, per_page: 100 }),
  })

  const total = tasks.data?.meta.pagination.total
  const sample = recent.data?.data ?? []
  const capped = (total ?? 0) > sample.length

  const stats = sample.reduce(
    (acc, task) => ({
      completed: acc.completed + (task.task_status === 'completed' ? 1 : 0),
      open: acc.open + (task.task_status === 'pending' || task.task_status === 'in_progress' ? 1 : 0),
      output: acc.output + task.output_count,
    }),
    { completed: 0, open: 0, output: 0 },
  )

  const sampleNote = capped ? `Across your latest ${sample.length} submissions` : undefined

  const remove = useMutation({
    mutationFn: (id: number) => taskApi.remove(id),
    onSuccess: (message) => {
      toast.success(message)
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error: ApiError) => toast.error(error.message),
  })

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditing(task)
    setFormOpen(true)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="My record"
        title="My tasks"
        description={`Daily production submissions for ${user?.name ?? 'you'}.`}
        action={
          <Button variant="primary" onClick={openNew}>
            Submit a task
          </Button>
        }
      />

      <StatGrid ready={!recent.isLoading} columns={4}>
        <StatCard
          label="Total submissions"
          icon="clipboard"
          value={total}
          format={(n) => Math.round(n).toLocaleString()}
        />
        <StatCard
          label="Total output"
          icon="database"
          tone="brand"
          value={stats.output}
          format={(n) => Math.round(n).toLocaleString()}
          hint={sampleNote}
        />
        <StatCard
          label="Completed"
          icon="check"
          tone="ok"
          value={stats.completed}
          format={(n) => Math.round(n).toLocaleString()}
          progress={sample.length > 0 ? stats.completed / sample.length : 0}
          hint={sampleNote}
        />
        <StatCard
          label="Still open"
          icon="history"
          tone={stats.open > 0 ? 'warn' : 'default'}
          value={stats.open}
          format={(n) => Math.round(n).toLocaleString()}
          hint={sampleNote ?? 'Pending or in progress'}
        />
      </StatGrid>

      <Card>
        <CardHeader title="Submissions" description="Newest first" />

        {tasks.isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : tasks.isError ? (
          <ErrorState
            description={(tasks.error as ApiError)?.message}
            onRetry={() => void tasks.refetch()}
          />
        ) : tasks.data?.data.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            description="Record what you produced during your shift so it counts toward your productivity."
            action={
              <Button variant="primary" onClick={openNew}>
                Submit your first task
              </Button>
            }
          />
        ) : (
          <>
            <TableWrap>
              <THead>
                <Th>Date</Th>
                <Th>Task</Th>
                <Th>Code</Th>
                <Th>Reference</Th>
                <Th>Output</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {tasks.data?.data.map((task) => (
                  <Tr key={task.id}>
                    <Td className="whitespace-nowrap">{formatDate(task.task_date)}</Td>
                    <Td>
                      <p className="font-medium text-body">{task.task_name}</p>
                      {task.task_description && (
                        <p className="mt-0.5 max-w-xs truncate text-[13px] text-muted">
                          {task.task_description}
                        </p>
                      )}
                    </Td>
                    <Td className="font-mono text-[13px] text-muted">{task.task_code}</Td>
                    <Td className="text-[13px] text-muted">{task.external_task_id_display}</Td>
                    <Td numeric>
                      {formatNumber(task.output_count)}
                    </Td>
                    <Td>
                      <TaskBadge status={task.task_status} label={task.task_status_label} />
                    </Td>
                    <Td>
                      {/* Completed and cancelled work is production history; a
                          tasker cannot revise it, matching the server policy. */}
                      {task.task_status === 'completed' || task.task_status === 'cancelled' ? (
                        <span className="text-[13px] text-faint">Locked</span>
                      ) : (
                        <div className="flex justify-center gap-0.5">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(task)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(task)}>
                            Delete
                          </Button>
                        </div>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrap>
            <PaginationBar pagination={tasks.data?.meta.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>

      <TaskFormModal
        open={formOpen}
        task={editing}
        statuses={meta?.task_statuses ?? []}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false)
          void queryClient.invalidateQueries({ queryKey: ['tasks'] })
          void queryClient.invalidateQueries({ queryKey: ['attendance'] })
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this submission?"
        description={`${deleting?.task_code} will be removed from your productivity figures. This cannot be undone from here.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  )
}

// ---------------------------------------------------------------- Form modal

interface TaskFormModalProps {
  open: boolean
  task: Task | null
  statuses: { value: TaskStatus; label: string }[]
  onClose: () => void
  onSaved: () => void
}

function TaskFormModal({ open, task, statuses, onClose, onSaved }: TaskFormModalProps) {
  const isEdit = task !== null

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      task_name: task?.task_name ?? '',
      task_description: task?.task_description ?? '',
      output_count: task?.output_count ?? 0,
      task_status: task?.task_status ?? 'completed',
      external_task_id: task?.external_task_id ?? '',
      screenshot_link: task?.screenshot_link ?? '',
      notes: task?.notes ?? '',
    },
  })

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? taskApi.update(task.id, values) : taskApi.create(values),
    onSuccess: ({ message }) => {
      toast.success(message)
      reset()
      onSaved()
    },
    onError: (error: ApiError) => {
      // Surface server-side field errors inline rather than as a toast the
      // user has to map back onto a form.
      if (error.isValidation) {
        Object.entries(error.errors).forEach(([field, messages]) => {
          setError(field as keyof FormValues, { message: messages[0] })
        })
        toast.error('Please correct the highlighted fields.')
        return
      }
      toast.error(error.message)
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${task.task_code}` : 'Submit a task'}
      description={
        isEdit
          ? 'Update this production record.'
          : 'The date and your name are taken from your account automatically.'
      }
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={save.isPending}
            onClick={handleSubmit((values) => save.mutate(values))}
          >
            {isEdit ? 'Save changes' : 'Submit task'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => save.mutate(values))}
      >
        <Field label="Task" required error={errors.task_name?.message}>
          {(id) => (
            <Input
              id={id}
              placeholder="e.g. Data Validation"
              invalid={Boolean(errors.task_name)}
              {...register('task_name')}
            />
          )}
        </Field>

        <Field
          label="Specific task / description"
          hint="What exactly did you work on?"
          error={errors.task_description?.message}
        >
          {(id) => (
            <Textarea
              id={id}
              placeholder="e.g. Validate customer records against the master list"
              {...register('task_description')}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Total submissions / output"
            required
            hint="How many units you produced"
            error={errors.output_count?.message}
          >
            {(id) => (
              <Input
                id={id}
                type="number"
                min="0"
                invalid={Boolean(errors.output_count)}
                {...register('output_count')}
              />
            )}
          </Field>

          <Field label="Status" required error={errors.task_status?.message}>
            {(id) => (
              <Select id={id} invalid={Boolean(errors.task_status)} {...register('task_status')}>
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Task ID / reference"
            hint="A client or legacy reference, if there is one. Leave blank for N/A."
            error={errors.external_task_id?.message}
          >
            {(id) => <Input id={id} placeholder="N/A" {...register('external_task_id')} />}
          </Field>

          <Field
            label="Screenshot link"
            hint="A full URL, or leave blank for N/A."
            error={errors.screenshot_link?.message}
          >
            {(id) => (
              <Input
                id={id}
                placeholder="https://…"
                invalid={Boolean(errors.screenshot_link)}
                {...register('screenshot_link')}
              />
            )}
          </Field>
        </div>

        <Field label="Notes" error={errors.notes?.message}>
          {(id) => <Textarea id={id} placeholder="Anything worth flagging" {...register('notes')} />}
        </Field>

        {isEdit && (
          <p className="rounded-lg bg-sunken px-3 py-2 text-[13px] text-muted">
            Task code <span className="font-mono text-body">{task.task_code}</span> is assigned by
            the system and cannot be changed. Reference:{' '}
            <span className="text-body">{orNA(task.external_task_id)}</span>
          </p>
        )}
      </form>
    </Modal>
  )
}
