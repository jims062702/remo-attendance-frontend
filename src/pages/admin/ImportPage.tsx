import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, PageHeader, StatCard, StatGrid } from '@/components/ui/Card'
import { Badge } from '@/components/ui/StatusBadge'
import { TBody, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table'
import { cn, formatDate } from '@/utils/format'
import type { ImportPreview, ImportResult } from '@/types'

type Stage = 'upload' | 'review' | 'done'

/**
 * Two-phase Excel import.
 *
 * Nothing is written until the admin has seen exactly what will happen: phase
 * one validates and reports per row, phase two commits only the rows that
 * passed. A file that is half wrong imports its good half rather than failing
 * wholesale, and the rows that would overwrite existing records are flagged
 * before -- not after -- they overwrite anything.
 */
export default function AdminImportPage() {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<Stage>('upload')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const [showOnlyProblems, setShowOnlyProblems] = useState(false)

  const upload = useMutation({
    mutationFn: (file: File) => adminApi.previewImport(file),
    onSuccess: ({ preview: data, message }) => {
      setPreview(data)
      setStage('review')
      if (data.summary.valid === 0) toast.error(message)
      else toast.success(message)
    },
    onError: (error: ApiError) =>
      toast.error(error.fieldError('file') ?? error.message),
  })

  const commit = useMutation({
    mutationFn: (token: string) => adminApi.commitImport(token),
    onSuccess: ({ result: data, message }) => {
      setResult(data)
      setStage('done')
      toast.success(message)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (error: ApiError) => toast.error(error.message),
  })

  const reset = () => {
    setStage('upload')
    setPreview(null)
    setResult(null)
    setShowOnlyProblems(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  const handleFile = (file: File | undefined) => {
    if (file) upload.mutate(file)
  }

  const rows = preview?.rows ?? []
  const visibleRows = showOnlyProblems ? rows.filter((row) => !row.valid) : rows

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Data"
        title="Import attendance"
        description="Upload historical attendance from Excel or CSV. Every row is checked and shown to you before anything is saved."
      />

      <Stepper stage={stage} />

      {stage === 'upload' && (
        <Card>
          <CardHeader
            title="Upload a file"
            description="Excel (.xlsx, .xls) or CSV, up to 10 MB"
            action={
              <Button size="sm" onClick={() => void adminApi.downloadImportTemplate()}>
                Download template
              </Button>
            }
          />
          <CardBody>
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                handleFile(event.dataTransfer.files[0])
              }}
              className={cn(
                'rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
                dragging ? 'border-brand bg-brand-soft' : 'border-line',
              )}
            >
              <p className="text-sm font-medium text-body">Drop your file here</p>
              <p className="mt-1 text-xs text-muted">or</p>
              <div className="mt-3">
                <Button
                  variant="primary"
                  loading={upload.isPending}
                  onClick={() => fileInput.current?.click()}
                >
                  Choose a file
                </Button>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </div>

            <div className="mt-5 rounded-lg bg-sunken px-4 py-3">
              <p className="text-xs font-medium text-body">Required columns</p>
              <p className="mt-1 text-xs text-muted">
                <span className="font-medium">Email</span> and{' '}
                <span className="font-medium">Shift Date</span> are required. Time In, Time Out,
                Committed Hours, Status and Notes are optional.
              </p>
              <p className="mt-2 text-xs text-muted">
                Shift Date is the date the shift <strong className="text-body">started</strong>. A
                shift running 10:00 PM Monday to 6:00 AM Tuesday has a Shift Date of Monday — a time
                out that looks earlier than the time in is read as the next morning.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {stage === 'review' && preview && (
        <>
          {/* These count up as the validation result lands, which is the one
              moment on this page where the numbers are genuinely news. */}
          <StatGrid columns={4}>
            <StatCard
              label="Rows in file"
              icon="database"
              value={preview.summary.total}
              format={(n) => Math.round(n).toLocaleString()}
            />
            <StatCard
              label="Ready to import"
              icon="check"
              tone="ok"
              value={preview.summary.valid}
              format={(n) => Math.round(n).toLocaleString()}
              progress={
                preview.summary.total > 0 ? preview.summary.valid / preview.summary.total : 0
              }
            />
            <StatCard
              label="With problems"
              icon="close"
              value={preview.summary.invalid}
              format={(n) => Math.round(n).toLocaleString()}
              tone={preview.summary.invalid > 0 ? 'bad' : 'default'}
            />
            <StatCard
              label="Will overwrite"
              icon="history"
              value={preview.summary.will_update}
              format={(n) => Math.round(n).toLocaleString()}
              tone={preview.summary.will_update > 0 ? 'warn' : 'default'}
              hint="Existing records"
            />
          </StatGrid>

          {preview.summary.will_update > 0 && (
            <div className="rounded-lg border border-warn/30 bg-warn-soft px-4 py-3">
              <p className="text-sm font-medium text-warn">
                {preview.summary.will_update} row
                {preview.summary.will_update === 1 ? '' : 's'} will overwrite an existing record
              </p>
              <p className="mt-1 text-xs text-warn/90">
                Those taskers already have attendance saved for that shift date. Importing replaces
                the stored times, hours and status.
              </p>
            </div>
          )}

          <Card>
            <CardHeader
              title={preview.filename}
              description="Row numbers match the spreadsheet, so row 2 is the first data row."
              action={
                preview.summary.invalid > 0 ? (
                  <label className="flex items-center gap-2 text-xs text-body">
                    <input
                      type="checkbox"
                      checked={showOnlyProblems}
                      onChange={(event) => setShowOnlyProblems(event.target.checked)}
                      className="h-4 w-4 rounded border-line accent-[var(--brand)]"
                    />
                    Only show problems
                  </label>
                ) : undefined
              }
            />

            <TableWrap>
              <THead>
                <Th align="center">Row</Th>
                <Th>Email</Th>
                <Th>Shift date</Th>
                <Th>Time in</Th>
                <Th>Time out</Th>
                <Th>Committed</Th>
                <Th>Status</Th>
                <Th>Result</Th>
              </THead>
              <TBody>
                {visibleRows.map((row) => (
                  <Tr key={row.row} className={!row.valid ? 'bg-bad-soft/30' : undefined}>
                    <Td align="center" numeric className="text-muted">
                      {row.row}
                    </Td>
                    <Td className="text-xs">{row.input.email || '—'}</Td>
                    <Td className="whitespace-nowrap text-xs">
                      {row.input.shift_date ? formatDate(row.input.shift_date) : '—'}
                    </Td>
                    <Td numeric className="text-xs">
                      {row.input.time_in?.slice(11) ?? '—'}
                    </Td>
                    <Td numeric className="text-xs">
                      {/* Shown with its own date, because an overnight time out
                          lands on the following day. */}
                      {row.input.time_out
                        ? `${row.input.time_out.slice(11)}${
                            row.input.time_out.slice(0, 10) !== row.input.shift_date ? ' (+1d)' : ''
                          }`
                        : '—'}
                    </Td>
                    <Td numeric className="text-xs">
                      {row.input.expected_hours ?? '—'}
                    </Td>
                    <Td className="text-xs">{row.input.status ?? '—'}</Td>
                    <Td>
                      {row.valid ? (
                        row.will_update ? (
                          <Badge tone="warn">Will overwrite</Badge>
                        ) : (
                          <Badge tone="ok">Ready</Badge>
                        )
                      ) : (
                        <div className="space-y-0.5">
                          {row.errors.map((error) => (
                            <p key={error} className="text-xs text-bad">
                              {error}
                            </p>
                          ))}
                        </div>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrap>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={reset} disabled={commit.isPending}>
              Choose a different file
            </Button>
            <Button
              variant="primary"
              disabled={preview.summary.valid === 0}
              loading={commit.isPending}
              onClick={() => commit.mutate(preview.token)}
            >
              Import {preview.summary.valid} row{preview.summary.valid === 1 ? '' : 's'}
            </Button>
          </div>
        </>
      )}

      {stage === 'done' && result && (
        <Card>
          <CardBody className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ok-soft text-xl text-ok">
              ✓
            </div>
            <h2 className="text-base font-semibold text-body">Import complete</h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
              {result.summary.imported} new record
              {result.summary.imported === 1 ? '' : 's'} created
              {result.summary.updated > 0 && `, ${result.summary.updated} updated`}.
              {result.summary.invalid > 0 &&
                ` ${result.summary.invalid} row${result.summary.invalid === 1 ? ' was' : 's were'} skipped.`}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button onClick={reset}>Import another file</Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function Stepper({ stage }: { stage: Stage }) {
  const steps: { key: Stage; label: string }[] = [
    { key: 'upload', label: 'Upload' },
    { key: 'review', label: 'Review' },
    { key: 'done', label: 'Import' },
  ]

  const activeIndex = steps.findIndex((step) => step.key === stage)

  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, index) => {
        const done = index < activeIndex
        const active = index === activeIndex

        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                done && 'bg-ok text-white',
                active && 'bg-brand text-on-brand',
                !done && !active && 'bg-sunken text-faint',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {done ? '✓' : index + 1}
            </span>
            <span
              className={cn(
                'text-sm font-medium',
                active ? 'text-body' : done ? 'text-muted' : 'text-faint',
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span className={cn('h-px flex-1', done ? 'bg-ok' : 'bg-line')} aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
