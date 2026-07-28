import type { ReactNode } from 'react'
import { cn } from '@/utils/format'
import { Button } from './Button'
import type { Pagination } from '@/types'

interface TableProps {
  children: ReactNode
  className?: string
}

/**
 * Tables fit their container first, and only scroll when they genuinely cannot.
 *
 * The table used to carry `min-w-max`, which sets its width to the widest its
 * content could possibly be. That guarantees a horizontal scrollbar on any
 * table with more than a few columns, however much room is actually available
 * -- the browser is told never to compress a column, so it never does, and a
 * ten-column table on a wide monitor still had to be dragged sideways.
 *
 * Without it the layout algorithm distributes the available width and wraps
 * the cells that can wrap. `overflow-x-auto` stays as a genuine last resort
 * for narrow screens, where a twelve-column table really does not fit and
 * scrolling beats crushing every column to two characters.
 */
export function TableWrap({ children, className }: TableProps) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-[15px]">{children}</table>
    </div>
  )
}

export function THead({ children }: TableProps) {
  return (
    <thead className="border-b border-line bg-sunken">
      <tr>{children}</tr>
    </thead>
  )
}

interface ThProps {
  children?: ReactNode
  className?: string
  /**
   * Defaults to centre.
   *
   * Header and body share the same default, which is the part that matters:
   * a centred header over left-aligned data reads as broken alignment even
   * when both are individually fine.
   */
  align?: 'left' | 'right' | 'center'
  /** Column key for sorting; omit to make the column unsortable. */
  sortKey?: string
  activeSort?: string
  direction?: 'asc' | 'desc'
  onSort?: (key: string) => void
}

export function Th({
  children,
  className,
  align = 'center',
  sortKey,
  activeSort,
  direction,
  onSort,
}: ThProps) {
  const sortable = Boolean(sortKey && onSort)
  const isActive = sortable && activeSort === sortKey

  return (
    <th
      scope="col"
      // Announces the current sort to screen readers rather than relying on
      // the arrow glyph alone.
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn(
        // Headers may wrap. They are short, uppercase and set small, so a
        // two-line "Missing time out" costs one row of height once -- whereas
        // forcing it onto a single line sets a floor under the whole column's
        // width for every row beneath it.
        'px-2.5 py-2.5 align-bottom text-xs font-semibold tracking-wider text-muted uppercase',
        align === 'left' && 'text-left',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort?.(sortKey!)}
          className={cn(
            'inline-flex items-center gap-1 transition-colors hover:text-body',
            isActive && 'text-body',
          )}
        >
          {children}
          <span aria-hidden="true" className={cn('text-xs', !isActive && 'opacity-30')}>
            {isActive ? (direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  )
}

export function TBody({ children }: TableProps) {
  return <tbody className="divide-y divide-line">{children}</tbody>
}

export function Tr({
  children,
  className,
  onClick,
}: TableProps & { onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn('transition-colors hover:bg-sunken', onClick && 'cursor-pointer', className)}
    >
      {children}
    </tr>
  )
}

interface TdProps {
  children?: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
  /** Renders with tabular figures so columns of numbers line up. */
  numeric?: boolean
  colSpan?: number
}

export function Td({ children, className, align = 'center', numeric, colSpan }: TdProps) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        // align-middle is not cosmetic here. A table cell's default vertical
        // alignment is baseline, so in a row where one cell stacks two lines
        // (a tasker's name over their email) or holds a taller element (a
        // badge, a button), every single-line cell aligns to that first
        // baseline and visibly sits at the top of the row instead of centred.
        //
        // Padding is tighter than the surrounding page on purpose: it is
        // rem-based, so it grew with the larger root size, and it is paid
        // twice per column -- on a ten-column table that alone was hundreds of
        // pixels of width spent on whitespace.
        //
        // `break-words` lets a long unbroken string give way -- an email
        // address has no spaces to wrap at, so without it the longest address
        // in the table sets a floor under its column and forces the whole
        // table to scroll sideways.
        'px-2.5 py-2.5 align-middle break-words text-body',
        align === 'left' && 'text-left',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        numeric && 'numeric',
        className,
      )}
    >
      {children}
    </td>
  )
}

// -------------------------------------------------------------------- States

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3 px-2.5 py-3">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="skeleton h-4 flex-1 rounded"
              // Varying widths read as data rather than a loading bar.
              style={{ maxWidth: colIndex === 0 ? '7rem' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-faint">{icon}</div>}
      <p className="text-base font-semibold text-body">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-bad-soft text-bad">
        !
      </div>
      <p className="text-base font-semibold text-body">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      )}
      {onRetry && (
        <Button size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Pagination

interface PaginationBarProps {
  pagination?: Pagination
  onPageChange: (page: number) => void
}

export function PaginationBar({ pagination, onPageChange }: PaginationBarProps) {
  if (!pagination || pagination.total === 0) return null

  const { current_page, last_page, per_page, total } = pagination
  const first = (current_page - 1) * per_page + 1
  const last = Math.min(current_page * per_page, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="numeric text-sm text-muted">
        Showing {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()}
      </p>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={current_page <= 1}
          onClick={() => onPageChange(current_page - 1)}
        >
          Previous
        </Button>
        <span className="numeric px-1 text-sm text-muted">
          Page {current_page} of {last_page}
        </span>
        <Button
          size="sm"
          disabled={current_page >= last_page}
          onClick={() => onPageChange(current_page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
