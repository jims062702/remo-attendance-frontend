import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { dailyApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StepPanel } from '@/components/flow/StepPanel'
import { Icon } from '@/components/ui/Icon'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { cn, formatHours } from '@/utils/format'
import type {
  DailyOptions,
  DailyState,
  MetaOptions,
  TaskComplexity,
  TaskerLevel,
  Tenurity,
  TrackerItem,
} from '@/types'

/** A blank block, added when the tasker taps "Add another task". */
function emptyItem(): TrackerItem {
  return {
    project_id: 0,
    tasker_level: null,
    total_tasks: 0,
    task_ids: '',
    task_complexity: null,
    screenshot_links: '',
  }
}

/** Count IDs and SBQ markers exactly as the server will. */
function parseIds(raw: string | null): { total: number; sbq: number } {
  const parts = (raw ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p !== '' && !/^n\/?a$/i.test(p))

  return { total: parts.length, sbq: parts.filter((p) => /\(\s*SBQ\s*\)/i.test(p)).length }
}

/**
 * Step 3 — the production declaration.
 *
 * Task entry is a list of per-project blocks rather than one shared set of
 * fields: three tasks on aloha and two on ego are different IDs, usually a
 * different complexity, and always a different screenshot.
 */
export function TrackerStep({
  state,
  options,
  meta,
  onSaved,
  onBack,
}: {
  state: DailyState
  options?: DailyOptions
  meta?: MetaOptions
  onSaved: () => void
  onBack: () => void
}) {
  const source = state.tracker ?? state.last_entry

  // No pre-selected value: the tasker chooses, so a wrong tenurity or level is
  // never recorded just because the form arrived with one filled in.
  const [tenurity, setTenurity] = useState<Tenurity | ''>(state.tracker?.tenurity ?? '')
  const [supportId, setSupportId] = useState(String(source?.support_team_id ?? ''))
  const [remarks, setRemarks] = useState(state.tracker?.remarks ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [items, setItems] = useState<TrackerItem[]>(
    state.tracker?.items?.length
      ? state.tracker.items.map((i) => ({ ...i, task_ids: i.task_ids ?? '', screenshot_links: i.screenshot_links ?? '' }))
      : [emptyItem()],
  )

  // The site is fixed for this operation, so it is shown rather than asked.
  const site = options?.sites?.[0]

  const totals = useMemo(() => {
    const counts = items.map((i) => parseIds(i.task_ids))
    return {
      ids: counts.reduce((sum, c) => sum + c.total, 0),
      sbq: counts.reduce((sum, c) => sum + c.sbq, 0),
      tasks: items.reduce((sum, i) => sum + (Number(i.total_tasks) || 0), 0),
    }
  }, [items])

  const save = useMutation({
    mutationFn: () =>
      dailyApi.submitTracker({
        tenurity,
        site_id: site?.id ?? null,
        support_team_id: supportId ? Number(supportId) : null,
        items: items.map((i) => ({
          project_id: i.project_id,
          tasker_level: i.tasker_level,
          total_tasks: Number(i.total_tasks) || 0,
          task_ids: i.task_ids || null,
          task_complexity: i.task_complexity || null,
          screenshot_links: i.screenshot_links || null,
        })),
        remarks: remarks || null,
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

  const patchItem = (index: number, patch: Partial<TrackerItem>) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const usedProjectIds = items.map((i) => i.project_id).filter(Boolean)
  // Every block needs a project and a level, since level now varies per project.
  const canSubmit =
    tenurity !== '' && items.every((i) => i.project_id > 0 && i.tasker_level !== null)

  return (
    <StepPanel
      index={2}
      total={3}
      icon="clipboard"
      title="Tracker entry"
      purpose={
        state.tracker
          ? 'Already filed for tonight. Change anything below and save again — this replaces your entry.'
          : 'Declare what you produced tonight, one block per project. Your hours are not asked for here; they come from your clock.'
      }
      footer={
        <>
          <p className="text-[13px] leading-snug text-muted">
            {canSubmit
              ? `${totals.tasks} task${totals.tasks === 1 ? '' : 's'} across ${items.length} project${items.length === 1 ? '' : 's'}${totals.ids > 0 ? ` · ${totals.ids} ID${totals.ids === 1 ? '' : 's'}` : ''}`
              : 'Every block needs a project and your level on it.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onBack} disabled={save.isPending}>
              ← Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              loading={save.isPending}
              disabled={!canSubmit}
              onClick={() => save.mutate()}
            >
              {state.tracker ? 'Update tracker entry' : 'Submit tracker entry'}
            </Button>
          </div>
        </>
      }
    >
      <Card>
        <CardHeader title="Your details" description="Confirm these for tonight's entry." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="CB tenurity" required error={errors.tenurity}>
            {(id) => (
              <Select
                id={id}
                value={tenurity}
                invalid={Boolean(errors.tenurity)}
                onChange={(e) => setTenurity(e.target.value as Tenurity)}
              >
                <option value="">Select tenurity…</option>
                {meta?.tenurities.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {/* Fixed for this operation, so it is shown rather than asked. */}
          <Field label="Site">
            {(id) => (
              <Input id={id} value={site?.name ?? '—'} readOnly disabled className="cursor-default" />
            )}
          </Field>

          <Field
            label="Under trainer team"
            hint="If your support is not listed, tap your assigned support so they can be added."
            error={errors.support_team_id}
          >
            {(id) => (
              <Select id={id} value={supportId} onChange={(e) => setSupportId(e.target.value)}>
                <option value="">Select support…</option>
                {options?.support_teams.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="What did you work on?"
          description="One block per project. Add another if you worked on more than one tonight."
          action={
            totals.ids > 0 || totals.tasks > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="numeric rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-semibold text-brand tabular-nums">
                  {totals.tasks} task{totals.tasks === 1 ? '' : 's'}
                </span>
                <span className="numeric rounded-full bg-sunken px-2.5 py-1 text-[13px] font-semibold text-muted tabular-nums">
                  {totals.ids} ID{totals.ids === 1 ? '' : 's'}
                </span>
                {totals.sbq > 0 && (
                  <span className="numeric rounded-full bg-warn-soft px-2.5 py-1 text-[13px] font-semibold text-warn tabular-nums">
                    {totals.sbq} SBQ
                  </span>
                )}
              </div>
            ) : undefined
          }
        />
        <CardBody className="space-y-3">
          {items.map((item, index) => {
            const counts = parseIds(item.task_ids)
            const project = options?.projects.find((p) => p.id === item.project_id)

            return (
              <fieldset
                key={index}
                className="overflow-hidden rounded-xl border border-line bg-sunken/40 transition-colors focus-within:border-brand/50"
              >
                {/* A titled bar rather than a legend floating in the border.
                    With several blocks stacked, the old version gave no strong
                    boundary between one project and the next. */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-raised px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="numeric grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand text-[13px] font-bold text-on-brand tabular-nums">
                      {index + 1}
                    </span>
                    <span className="truncate text-[15px] font-semibold text-body">
                      {project ? project.code : `Project ${index + 1}`}
                    </span>
                    {counts.total > 0 && (
                      <span className="numeric shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[12px] font-semibold text-muted tabular-nums">
                        {counts.total} ID{counts.total === 1 ? '' : 's'}
                        {counts.sbq > 0 && ` · ${counts.sbq} SBQ`}
                      </span>
                    )}
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItems((c) => c.filter((_, i) => i !== index))}
                      aria-label={`Remove ${project?.code ?? `project ${index + 1}`}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-muted transition-colors hover:bg-bad-soft hover:text-bad"
                    >
                      <Icon name="trash" size={14} />
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-4 bg-raised p-4">
                  <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                    <Field
                      label="Tracking project"
                      required
                      error={errors[`items.${index}.project_id`]}
                    >
                      {(id) => (
                        <Select
                          id={id}
                          value={item.project_id || ''}
                          invalid={Boolean(errors[`items.${index}.project_id`])}
                          onChange={(e) => patchItem(index, { project_id: Number(e.target.value) })}
                        >
                          <option value="">Select project…</option>
                          {options?.projects.map((p) => (
                            <option
                              key={p.id}
                              value={p.id}
                              // Already used in another block; combining them
                              // into one block is the correct move.
                              disabled={usedProjectIds.includes(p.id) && p.id !== item.project_id}
                            >
                              {p.code}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>

                    <Field
                      label="Your level here"
                      required
                      hint="Your level on this project."
                      error={errors[`items.${index}.tasker_level`]}
                    >
                      {(id) => (
                        <Select
                          id={id}
                          value={item.tasker_level ?? ''}
                          invalid={Boolean(errors[`items.${index}.tasker_level`])}
                          onChange={(e) =>
                            patchItem(index, {
                              tasker_level: (e.target.value || null) as TaskerLevel | null,
                            })
                          }
                        >
                          <option value="">Select level…</option>
                          {meta?.tasker_levels.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>

                    <Field
                      label="Total tasks"
                      required
                      error={errors[`items.${index}.total_tasks`]}
                    >
                      {(id) => (
                        <Input
                          id={id}
                          type="number"
                          min="0"
                          value={item.total_tasks}
                          onChange={(e) => patchItem(index, { total_tasks: Number(e.target.value) })}
                        />
                      )}
                    </Field>
                  </div>

                  <Field
                    label="Task / Sub. IDs"
                    hint="Separate with commas. Mark send-backs as (SBQ) — e.g. TaskID1 (SBQ), TaskID2"
                    error={errors[`items.${index}.task_ids`]}
                  >
                    {(id) => (
                      <Textarea
                        id={id}
                        placeholder="TaskID1, TaskID2, TaskID3"
                        value={item.task_ids ?? ''}
                        onChange={(e) => patchItem(index, { task_ids: e.target.value })}
                      />
                    )}
                  </Field>

                  {counts.total > 0 && (
                    <p className="numeric -mt-2 text-[13px] text-muted">
                      Counted <strong className="text-body">{counts.total}</strong> ID
                      {counts.total === 1 ? '' : 's'}
                      {counts.sbq > 0 && (
                        <>
                          , <strong className="text-body">{counts.sbq}</strong> marked SBQ
                        </>
                      )}
                      .
                    </p>
                  )}

                  <div className="grid gap-4 lg:grid-cols-2">
                  <Field
                    label="Task complexity"
                    hint="For this project's tasks. Use MIXED if they span sizes."
                    error={errors[`items.${index}.task_complexity`]}
                  >
                    {(id) => (
                      <Select
                        id={id}
                        value={item.task_complexity ?? ''}
                        onChange={(e) =>
                          patchItem(index, {
                            task_complexity: (e.target.value || null) as TaskComplexity | null,
                          })
                        }
                      >
                        <option value="">Select complexity…</option>
                        {meta?.task_complexities.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>

                  <Field
                    label="Screenshot link"
                    hint="For this project. Separate several with commas, or use N/A."
                    error={errors[`items.${index}.screenshot_links`]}
                  >
                    {(id) => (
                      <Textarea
                        id={id}
                        placeholder="https://…"
                        value={item.screenshot_links ?? ''}
                        onChange={(e) => patchItem(index, { screenshot_links: e.target.value })}
                      />
                    )}
                  </Field>
                  </div>
                </div>
              </fieldset>
            )
          })}

          {/* A dashed slot rather than a solid button: it reads as the empty
              space where another project would go, which is what it is. */}
          <button
            type="button"
            onClick={() => setItems((c) => [...c, emptyItem()])}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line',
              'px-4 py-4 text-[15px] font-semibold text-muted transition-all duration-200',
              'hover:border-brand/50 hover:bg-brand-soft/40 hover:text-brand',
            )}
          >
            <Icon name="plus" size={18} />
            Add another project
          </button>

          {errors.items && (
            <p role="alert" className="text-[13px] text-bad">
              {errors.items}
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Total work hours today"
          description="Calculated from your time in to your time out — nothing to fill in."
        />
        <CardBody className="space-y-4">
          <div className="rounded-lg bg-sunken px-4 py-3">
            {state.attendance?.total_hours != null ? (
              <p className="text-[15px] text-body">
                <strong className="numeric text-base">
                  {formatHours(state.attendance.total_hours)}
                </strong>{' '}
                rendered.
              </p>
            ) : (
              <p className="text-[15px] text-muted">
                Your hours are worked out when you time out, so this fills in then. You can submit
                this entry now either way.
              </p>
            )}
          </div>

          <Field
            label="Remarks / suggestions / issues / experience for today"
            hint="Can be N/A."
            error={errors.remarks}
          >
            {(id) => (
              <Textarea
                id={id}
                placeholder="N/A"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            )}
          </Field>
        </CardBody>
      </Card>

    </StepPanel>
  )
}
