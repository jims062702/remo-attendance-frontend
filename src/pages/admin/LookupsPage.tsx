import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { lookupApi, type LookupRow, type LookupType } from '@/services/api'
import { ApiError } from '@/services/http'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/StatusBadge'
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
import { cn, formatDate } from '@/utils/format'

const TABS: { type: LookupType; label: string; description: string; primary: string }[] = [
  {
    type: 'projects',
    label: 'Projects',
    description: 'Tracking projects taskers select on their nightly entry.',
    primary: 'code',
  },
  {
    type: 'workstations',
    label: 'Workstations',
    description: 'The PCs taskers claim when they time in.',
    primary: 'name',
  },
  {
    type: 'sites',
    label: 'Sites',
    description: 'Physical locations, e.g. BEAMO 3F C.',
    primary: 'name',
  },
  {
    type: 'support-teams',
    label: 'Support teams',
    description: 'Trainers a tasker reports under.',
    primary: 'name',
  },
]

export default function AdminLookupsPage() {
  const queryClient = useQueryClient()
  const [type, setType] = useState<LookupType>('projects')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<LookupRow | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [retiring, setRetiring] = useState<LookupRow | null>(null)

  const tab = TABS.find((t) => t.type === type)!

  const rows = useQuery({
    queryKey: ['lookups', type, search, page],
    queryFn: () => lookupApi.list(type, { search, page, per_page: 50 }),
  })

  // Sites populate the workstation form's site picker.
  const sites = useQuery({
    queryKey: ['lookups', 'sites', 'all'],
    queryFn: () => lookupApi.list('sites', { per_page: 200 }),
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['lookups'] })

  const retire = useMutation({
    mutationFn: (id: number) => lookupApi.retire(type, id),
    onSuccess: (message) => {
      toast.success(message)
      setRetiring(null)
      invalidate()
    },
    onError: (error: ApiError) => toast.error(error.message),
  })

  const switchTab = (next: LookupType) => {
    setType(next)
    setSearch('')
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Data"
        title="Reference lists"
        description="What taskers can choose from on their nightly entry."
        action={
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Add {tab.label.replace(/s$/, '').toLowerCase()}
          </Button>
        }
      />

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((item) => (
          <button
            key={item.type}
            role="tab"
            aria-selected={type === item.type}
            onClick={() => switchTab(item.type)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              type === item.type
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-body',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader
          title={tab.label}
          description={tab.description}
          action={
            <Input
              type="search"
              placeholder="Search…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className="w-56"
            />
          }
        />

        {rows.isLoading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : rows.isError ? (
          <ErrorState
            description={(rows.error as ApiError)?.message}
            onRetry={() => void rows.refetch()}
          />
        ) : rows.data?.data.length === 0 ? (
          <EmptyState
            title={`No ${tab.label.toLowerCase()} yet`}
            description="Add one so taskers can select it."
          />
        ) : (
          <>
            <TableWrap>
              <THead>
                <Th>{type === 'projects' ? 'Code' : 'Name'}</Th>
                {type === 'projects' && <Th>Friendly name</Th>}
                {type === 'workstations' && <Th>Site</Th>}
                {type === 'workstations' && <Th>Notes</Th>}
                <Th>Status</Th>
                <Th>Added</Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {rows.data?.data.map((row) => (
                  <Tr key={row.id} className={!row.is_active ? 'opacity-60' : undefined}>
                    <Td className={type === 'projects' ? 'font-mono text-xs' : 'font-medium'}>
                      {row.code ?? row.name}
                    </Td>
                    {type === 'projects' && <Td className="text-muted">{row.name ?? '—'}</Td>}
                    {type === 'workstations' && (
                      <Td className="text-muted">
                        {row.site_name ?? '—'}
                        {row.is_support && (
                          <Badge tone="info" className="ml-2">
                            Support
                          </Badge>
                        )}
                      </Td>
                    )}
                    {type === 'workstations' && (
                      <Td className="max-w-xs truncate text-xs text-muted">{row.notes ?? '—'}</Td>
                    )}
                    <Td>
                      {row.is_active ? (
                        <Badge tone="ok" dot>
                          Active
                        </Badge>
                      ) : (
                        <Badge tone="neutral" dot>
                          Retired
                        </Badge>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(row.created_at)}</Td>
                    <Td>
                      <div className="flex justify-center gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(row)
                            setFormOpen(true)
                          }}
                        >
                          Edit
                        </Button>
                        {row.is_active && (
                          <Button size="sm" variant="ghost" onClick={() => setRetiring(row)}>
                            Retire
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrap>
            <PaginationBar pagination={rows.data?.meta.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>

      <LookupFormModal
        open={formOpen}
        type={type}
        row={editing}
        sites={sites.data?.data ?? []}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false)
          invalidate()
        }}
      />

      <ConfirmDialog
        open={retiring !== null}
        title={`Retire ${retiring?.code ?? retiring?.name}?`}
        description="Taskers will no longer be able to select it. Existing records that reference it are kept intact and still display correctly."
        confirmLabel="Retire"
        loading={retire.isPending}
        onClose={() => setRetiring(null)}
        onConfirm={() => retiring && retire.mutate(retiring.id)}
      />
    </div>
  )
}

function LookupFormModal({
  open,
  type,
  row,
  sites,
  onClose,
  onSaved,
}: {
  open: boolean
  type: LookupType
  row: LookupRow | null
  sites: LookupRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = row !== null

  const [primary, setPrimary] = useState('')
  const [secondary, setSecondary] = useState('')
  const [siteId, setSiteId] = useState('')
  const [notes, setNotes] = useState('')
  const [isSupport, setIsSupport] = useState(false)
  const [active, setActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  const key = `${type}:${row?.id ?? 'new'}`
  if (open && loadedFor !== key) {
    setLoadedFor(key)
    setPrimary(row?.code ?? row?.name ?? '')
    setSecondary(type === 'projects' ? (row?.name ?? '') : '')
    setSiteId(String(row?.site_id ?? ''))
    setNotes(row?.notes ?? '')
    setIsSupport(row?.is_support ?? false)
    setActive(row?.is_active ?? true)
    setErrors({})
  }

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> =
        type === 'projects'
          ? { code: primary, name: secondary || null, is_active: active }
          : type === 'workstations'
            ? {
                name: primary,
                site_id: siteId ? Number(siteId) : null,
                notes: notes || null,
                is_active: active,
                is_support: isSupport,
              }
            : { name: primary, is_active: active }

      return isEdit ? lookupApi.update(type, row.id, payload) : lookupApi.create(type, payload)
    },
    onSuccess: ({ message }) => {
      toast.success(message)
      setLoadedFor(null)
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

  const label = type === 'projects' ? 'Project code' : 'Name'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${row.code ?? row.name}` : 'Add entry'}
      footer={
        <>
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
            {isEdit ? 'Save changes' : 'Add'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label={label}
          required
          hint={
            type === 'projects'
              ? 'The platform codename exactly as it appears, e.g. aloha_data_collection_v1'
              : undefined
          }
          error={errors.code ?? errors.name}
        >
          {(id) => (
            <Input
              id={id}
              value={primary}
              invalid={Boolean(errors.code ?? errors.name)}
              className={type === 'projects' ? 'font-mono' : undefined}
              onChange={(event) => setPrimary(event.target.value)}
            />
          )}
        </Field>

        {type === 'projects' && (
          <Field label="Friendly name" hint="Optional, shown in reports." error={errors.name}>
            {(id) => (
              <Input id={id} value={secondary} onChange={(e) => setSecondary(e.target.value)} />
            )}
          </Field>
        )}

        {type === 'workstations' && (
          <>
            <Field label="Site" error={errors.site_id}>
              {(id) => (
                <Select id={id} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                  <option value="">No site</option>
                  {sites
                    .filter((s) => s.is_active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </Select>
              )}
            </Field>

            <Field label="Notes" error={errors.notes}>
              {(id) => <Input id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}
            </Field>

            <label className="flex items-start gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={isSupport}
                onChange={(e) => setIsSupport(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line accent-[var(--brand)]"
              />
              <span>
                Support PC
                <span className="mt-0.5 block text-xs text-muted">
                  Reserved for support. Taskers will not see it in their PC picker at all.
                </span>
              </span>
            </label>
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-body">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="h-4 w-4 rounded border-line accent-[var(--brand)]"
          />
          Active — taskers can select this
        </label>
      </div>
    </Modal>
  )
}
