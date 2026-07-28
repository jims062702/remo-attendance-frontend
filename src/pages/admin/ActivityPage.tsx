import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui/Card'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Badge } from '@/components/ui/StatusBadge'
import { DateRange, Field, Input } from '@/components/ui/Field'
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
import { daysAgoISO, formatDateTime, todayISO } from '@/utils/format'

/** Tone by what the action implies, so a refused sign-in stands out. */
function toneFor(action: string): 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'brand' {
  if (action.includes('denied') || action.includes('failed') || action.includes('blocked')) return 'bad'
  if (action.includes('deactivated') || action.includes('deleted')) return 'warn'
  if (action.includes('corrected') || action.includes('imported')) return 'info'
  if (action.startsWith('auth.')) return 'neutral'
  return 'brand'
}

export default function AdminActivityPage() {
  const [from, setFrom] = useState(daysAgoISO(13))
  const [to, setTo] = useState(todayISO())
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const logs = useQuery({
    queryKey: ['admin', 'activity', from, to, action, page],
    queryFn: () => adminApi.activityLogs({ from, to, action, page, per_page: 25 }),
  })

  return (
    <div className="space-y-5">
      {/* No stat rail here on purpose. This is an audit trail: it is read as a
          list of what happened, and a row of aggregate figures above it would
          invite summarising a record whose value is that it is complete and
          individually inspectable. The one count that matters rides on the
          table's own header. */}
      <PageHeader
        eyebrow="Data"
        title="Activity log"
        description="An append-only record of sign-ins, corrections, imports and account changes."
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
          <Field label="Action" hint="e.g. attendance.corrected" className="min-w-48 flex-1">
            {(id) => (
              <Input
                id={id}
                type="search"
                placeholder="Filter by action"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value)
                  setPage(1)
                }}
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Events"
          description="Most recent first"
          icon="history"
          action={
            logs.data && (
              <span className="inline-flex items-baseline gap-1.5 rounded-full bg-sunken px-3 py-1.5">
                <AnimatedNumber
                  value={logs.data.meta.pagination.total}
                  format={(n) => Math.round(n).toLocaleString()}
                  className="numeric text-sm font-semibold text-body tabular-nums"
                />
                <span className="text-xs text-muted">in range</span>
              </span>
            )
          }
        />

        {logs.isLoading ? (
          <TableSkeleton rows={10} cols={5} />
        ) : logs.isError ? (
          <ErrorState
            description={(logs.error as ApiError)?.message}
            onRetry={() => void logs.refetch()}
          />
        ) : logs.data?.data.length === 0 ? (
          <EmptyState title="No activity in this period" description="Try widening the date range." />
        ) : (
          <>
            <TableWrap>
              <THead>
                <Th>When</Th>
                <Th>Action</Th>
                <Th>By</Th>
                <Th>Description</Th>
                <Th>Details</Th>
              </THead>
              <TBody>
                {logs.data?.data.map((log) => (
                  <Tr key={log.id}>
                    <Td className="whitespace-nowrap text-xs text-muted">
                      {formatDateTime(log.created_at)}
                    </Td>
                    <Td>
                      <Badge tone={toneFor(log.action)}>{log.action}</Badge>
                    </Td>
                    <Td className="text-xs">
                      {log.user ? (
                        <>
                          <span className="font-medium text-body">{log.user.name}</span>
                          <span className="block text-muted">{log.user.email}</span>
                        </>
                      ) : (
                        <span className="text-faint">System / anonymous</span>
                      )}
                    </Td>
                    <Td className="max-w-sm text-xs">{log.description ?? '—'}</Td>
                    <Td>
                      {log.metadata ? (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-brand hover:underline">
                            View
                          </summary>
                          <pre className="mt-2 max-w-md overflow-x-auto rounded-lg bg-sunken p-2 font-mono text-xs text-muted">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrap>
            <PaginationBar pagination={logs.data?.meta.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
